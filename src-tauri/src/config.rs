// Config storage (1.4.1–1.4.3). Lives in the Tauri app config dir — never in
// the notes folder. The UI contract is `ConfigResult` in src/lib/api.ts.
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::error::VayuError;

pub const CONFIG_FILE: &str = "config.json";
pub const CORRUPT_CONFIG_FILE: &str = "config.bad.json";
pub const CONFIG_VERSION: u32 = 1;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct StoredConfig {
    pub notes_dir: String,
    pub version: u32,
}

/// `<documents>\Vayu` — the default shown on the first-run screen (1.4.2).
pub fn default_notes_dir(documents_dir: &Path) -> PathBuf {
    documents_dir.join("Vayu")
}

pub fn config_path(config_dir: &Path) -> PathBuf {
    config_dir.join(CONFIG_FILE)
}

/// Load the config. No file → `None`. Corrupt JSON → the file is renamed to
/// `config.bad.json` (never overwritten) and `None` is returned — no panic.
pub fn load_config(config_dir: &Path) -> Option<StoredConfig> {
    let path = config_path(config_dir);
    let text = std::fs::read_to_string(&path).ok()?;
    match serde_json::from_str::<StoredConfig>(&text) {
        Ok(cfg) if !cfg.notes_dir.trim().is_empty() => Some(cfg),
        Ok(_) => None,
        Err(_) => {
            let _ = std::fs::rename(&path, config_dir.join(CORRUPT_CONFIG_FILE));
            None
        }
    }
}

/// Save `{ notesDir, version }` atomically (temp file + rename).
pub fn save_config(config_dir: &Path, notes_dir: &Path) -> Result<(), VayuError> {
    std::fs::create_dir_all(config_dir)?;
    let cfg = StoredConfig {
        notes_dir: notes_dir.to_string_lossy().into_owned(),
        version: CONFIG_VERSION,
    };
    let json = serde_json::to_string_pretty(&cfg).map_err(|e| VayuError::other(e.to_string()))?;
    let tmp = config_dir.join("config.json.tmp");
    std::fs::write(&tmp, json)?;
    std::fs::rename(&tmp, config_path(config_dir))?;
    Ok(())
}

/// Validate a chosen notes folder (1.4.3): a missing folder is created, an
/// existing folder is kept as-is (its `.md` files untouched), and a path that
/// is a file is `Err(NotADirectory)`.
pub fn validate_notes_dir(path: &Path) -> Result<(), VayuError> {
    match std::fs::metadata(path) {
        Ok(meta) if meta.is_dir() => Ok(()),
        Ok(_) => Err(VayuError::not_a_directory(format!(
            "{} is a file, not a folder.",
            path.display()
        ))),
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => std::fs::create_dir_all(path)
            .map_err(|e| VayuError::io(format!("Couldn't create {}: {e}", path.display()))),
        Err(err) => Err(VayuError::io(format!(
            "Couldn't read {}: {err}",
            path.display()
        ))),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn default_notes_dir_is_documents_vayu() {
        let docs = Path::new("C:\\Users\\test\\Documents");
        assert_eq!(default_notes_dir(docs), docs.join("Vayu"));
    }

    #[test]
    fn missing_config_returns_none() {
        let dir = tempdir().unwrap();
        assert_eq!(load_config(dir.path()), None);
    }

    #[test]
    fn save_then_load_round_trips() {
        let dir = tempdir().unwrap();
        let notes = tempdir().unwrap();
        save_config(dir.path(), notes.path()).unwrap();
        let loaded = load_config(dir.path()).expect("config loads");
        assert_eq!(loaded.notes_dir, notes.path().to_string_lossy());
        assert_eq!(loaded.version, CONFIG_VERSION);
    }

    #[test]
    fn corrupt_config_is_renamed_and_returns_none() {
        let dir = tempdir().unwrap();
        fs::write(config_path(dir.path()), "{not json").unwrap();
        assert_eq!(load_config(dir.path()), None);
        assert!(!config_path(dir.path()).exists(), "bad file moved away");
        assert!(dir.path().join(CORRUPT_CONFIG_FILE).exists());
    }

    #[test]
    fn missing_folder_is_created() {
        let dir = tempdir().unwrap();
        let target = dir.path().join("nested").join("Vayu");
        validate_notes_dir(&target).unwrap();
        assert!(target.is_dir());
    }

    #[test]
    fn existing_empty_folder_is_ok() {
        let dir = tempdir().unwrap();
        validate_notes_dir(dir.path()).unwrap();
    }

    #[test]
    fn file_path_is_not_a_directory() {
        let dir = tempdir().unwrap();
        let file = dir.path().join("notes.txt");
        fs::write(&file, "x").unwrap();
        let err = validate_notes_dir(&file).unwrap_err();
        assert_eq!(err.kind, "NotADirectory");
    }

    #[test]
    fn folder_with_markdown_files_is_left_untouched() {
        let dir = tempdir().unwrap();
        let note = dir.path().join("2026-10-21.md");
        fs::write(&note, "existing text").unwrap();
        validate_notes_dir(dir.path()).unwrap();
        assert_eq!(fs::read_to_string(&note).unwrap(), "existing text");
    }
}
