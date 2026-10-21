// Notes read/write/list (1C.2 — tasks 1.5.2, 1.5.3, 1.7.1).
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};

use serde::Serialize;

use crate::error::VayuError;

/// Makes each atomic-write temp file unique, so overlapping saves cannot
/// collide on the same temp path.
static TEMP_COUNTER: AtomicU64 = AtomicU64::new(0);

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct NoteResult {
    pub exists: bool,
    pub content: String,
}

/// Strict `YYYY-MM-DD` + a real calendar day (leap years included).
pub fn is_valid_date(value: &str) -> bool {
    let bytes = value.as_bytes();
    if bytes.len() != 10 || bytes[4] != b'-' || bytes[7] != b'-' {
        return false;
    }
    if !bytes
        .iter()
        .enumerate()
        .all(|(i, b)| i == 4 || i == 7 || b.is_ascii_digit())
    {
        return false;
    }
    let year: i32 = value[0..4].parse().unwrap_or(-1);
    let month: u32 = value[5..7].parse().unwrap_or(0);
    let day: u32 = value[8..10].parse().unwrap_or(0);
    if !(1..=12).contains(&month) || day < 1 {
        return false;
    }
    day <= days_in_month(year, month)
}

fn days_in_month(year: i32, month: u32) -> u32 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if is_leap_year(year) => 29,
        2 => 28,
        _ => 0,
    }
}

fn is_leap_year(year: i32) -> bool {
    (year % 4 == 0 && year % 100 != 0) || year % 400 == 0
}

/// Only a validated date can become a file name, so a date can never escape
/// the notes folder (1.5.3).
fn note_path(notes_dir: &Path, date: &str) -> Result<PathBuf, VayuError> {
    if !is_valid_date(date) {
        return Err(VayuError::invalid_date(format!(
            "\"{date}\" is not a YYYY-MM-DD date."
        )));
    }
    Ok(notes_dir.join(format!("{date}.md")))
}

/// Read-only: a missing note is `{ exists: false, content: "" }`, never a new
/// file (1.5.2).
pub fn read_note(notes_dir: &Path, date: &str) -> Result<NoteResult, VayuError> {
    let path = note_path(notes_dir, date)?;
    match std::fs::read(&path) {
        Ok(bytes) => {
            let content = String::from_utf8(bytes)
                .map_err(|_| VayuError::io(format!("{date}.md is not valid UTF-8.")))?;
            Ok(NoteResult {
                exists: true,
                content,
            })
        }
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok(NoteResult {
            exists: false,
            content: String::new(),
        }),
        Err(err) => Err(VayuError::io(format!("Couldn't read {date}.md: {err}"))),
    }
}

/// Create today's note as an empty file if it does not exist; never touch an
/// existing note (1.5.2).
pub fn ensure_note(notes_dir: &Path, date: &str) -> Result<(), VayuError> {
    let path = note_path(notes_dir, date)?;
    std::fs::create_dir_all(notes_dir)
        .map_err(|e| VayuError::io(format!("Couldn't open the notes folder: {e}")))?;
    if path.exists() {
        return Ok(());
    }
    match std::fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&path)
    {
        Ok(_) => Ok(()),
        Err(err) if err.kind() == std::io::ErrorKind::AlreadyExists => Ok(()),
        Err(err) => Err(VayuError::io(format!("Couldn't create {date}.md: {err}"))),
    }
}

/// Atomic write (1.5.3): write a sibling temp file, then rename over the note,
/// so a crash mid-write cannot truncate an existing note.
pub fn write_note(notes_dir: &Path, date: &str, content: &str) -> Result<(), VayuError> {
    let path = note_path(notes_dir, date)?;
    std::fs::create_dir_all(notes_dir)
        .map_err(|e| VayuError::io(format!("Couldn't open the notes folder: {e}")))?;
    let tmp = notes_dir.join(format!(
        ".{date}.md.{}.{}.tmp",
        std::process::id(),
        TEMP_COUNTER.fetch_add(1, Ordering::Relaxed)
    ));
    let result = std::fs::write(&tmp, content).and_then(|_| std::fs::rename(&tmp, &path));
    if let Err(err) = result {
        let _ = std::fs::remove_file(&tmp);
        return Err(VayuError::io(format!("Couldn't save {date}.md: {err}")));
    }
    Ok(())
}

/// Sorted dates of real `YYYY-MM-DD.md` files in the notes folder; everything
/// else (temp files, other extensions, folders) is ignored (1.7.1).
pub fn list_notes(notes_dir: &Path) -> Result<Vec<String>, VayuError> {
    let entries = match std::fs::read_dir(notes_dir) {
        Ok(entries) => entries,
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => return Ok(Vec::new()),
        Err(err) => {
            return Err(VayuError::io(format!(
                "Couldn't list the notes folder: {err}"
            )));
        }
    };
    let mut dates = Vec::new();
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let Some(name) = path.file_name().and_then(|n| n.to_str()) else {
            continue;
        };
        if let Some(date) = name.strip_suffix(".md")
            && is_valid_date(date)
        {
            dates.push(date.to_string());
        }
    }
    dates.sort();
    dates.dedup();
    Ok(dates)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    fn notes() -> tempfile::TempDir {
        tempdir().unwrap()
    }

    #[test]
    fn read_with_no_file_returns_empty_and_creates_nothing() {
        let dir = notes();
        let r = read_note(dir.path(), "2026-10-21").unwrap();
        assert!(!r.exists);
        assert_eq!(r.content, "");
        assert_eq!(
            fs::read_dir(dir.path()).unwrap().count(),
            0,
            "no file created"
        );
    }

    #[test]
    fn ensure_creates_an_empty_file_and_keeps_existing_content() {
        let dir = notes();
        ensure_note(dir.path(), "2026-10-21").unwrap();
        let path = dir.path().join("2026-10-21.md");
        assert_eq!(fs::read_to_string(&path).unwrap(), "");

        fs::write(&path, "keep me").unwrap();
        ensure_note(dir.path(), "2026-10-21").unwrap();
        assert_eq!(fs::read_to_string(&path).unwrap(), "keep me");
    }

    #[test]
    fn read_returns_bytes_verbatim_utf8_and_crlf() {
        let dir = notes();
        let text = "नमस्ते दुनिया 🌬️\r\nline two\nline three";
        fs::write(dir.path().join("2026-10-21.md"), text).unwrap();
        let r = read_note(dir.path(), "2026-10-21").unwrap();
        assert!(r.exists);
        assert_eq!(r.content, text);
    }

    #[test]
    fn invalid_dates_are_rejected_without_touching_the_filesystem() {
        let dir = notes();
        for bad in [
            "../secret",
            "2026-10-21.md",
            "abc",
            "2026-13-01",
            "2026-1-1",
            "2026-02-30",
        ] {
            let err = read_note(dir.path(), bad).unwrap_err();
            assert_eq!(err.kind, "InvalidDate", "{bad}");
        }
        assert_eq!(fs::read_dir(dir.path()).unwrap().count(), 0);
    }

    #[test]
    fn date_validation_accepts_real_dates_only() {
        for good in ["2026-10-21", "2024-02-29", "2026-12-31", "2026-01-01"] {
            assert!(is_valid_date(good), "{good}");
        }
        for bad in [
            "2025-02-29",
            "2026-00-10",
            "2026-04-31",
            "2026-1-1",
            "20261021",
            "2026-10-21.md",
            "",
            "../2026-10-21",
        ] {
            assert!(!is_valid_date(bad), "{bad}");
        }
    }

    #[test]
    fn write_then_read_is_identical_including_line_endings() {
        let dir = notes();
        let text = "first\r\nsecond\nthird 🌬️";
        write_note(dir.path(), "2026-10-21", text).unwrap();
        assert_eq!(read_note(dir.path(), "2026-10-21").unwrap().content, text);
    }

    #[test]
    fn write_is_atomic_and_leaves_no_tmp_file() {
        let dir = notes();
        write_note(dir.path(), "2026-10-21", "one").unwrap();
        write_note(dir.path(), "2026-10-21", "two").unwrap();
        let leftovers: Vec<_> = fs::read_dir(dir.path())
            .unwrap()
            .filter_map(|e| e.ok())
            .map(|e| e.file_name().to_string_lossy().into_owned())
            .filter(|n| n.contains(".tmp"))
            .collect();
        assert!(leftovers.is_empty(), "tmp files: {leftovers:?}");
        assert_eq!(read_note(dir.path(), "2026-10-21").unwrap().content, "two");
    }

    #[test]
    fn write_with_invalid_date_writes_nothing() {
        let dir = notes();
        let err = write_note(dir.path(), "../secret", "x").unwrap_err();
        assert_eq!(err.kind, "InvalidDate");
        assert_eq!(fs::read_dir(dir.path()).unwrap().count(), 0);
    }

    #[test]
    fn list_returns_sorted_date_files_and_ignores_everything_else() {
        let dir = notes();
        for name in [
            "2026-10-21.md",
            "2026-09-01.md",
            "notes.txt",
            "2026-10-21.md.tmp",
            "random.md",
            "2026-13-01.md",
        ] {
            fs::write(dir.path().join(name), "x").unwrap();
        }
        fs::create_dir(dir.path().join("2026-01-01.md")).unwrap();
        fs::create_dir(dir.path().join("subfolder")).unwrap();

        let dates = list_notes(dir.path()).unwrap();
        assert_eq!(dates, vec!["2026-09-01", "2026-10-21"]);
    }

    #[test]
    fn list_on_a_missing_folder_is_empty_not_an_error() {
        let dir = notes();
        let missing = dir.path().join("not-there");
        assert_eq!(list_notes(&missing).unwrap(), Vec::<String>::new());
    }
}
