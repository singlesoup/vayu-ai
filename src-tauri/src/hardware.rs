// Task 2.1/2.2: hardware check + tier logic (PRD §7).
//
// Tier decision (E2B-first default):
//   Green:  ≥16 GB RAM and ≥10 GB free disk  →  E4B (~7.5 GB download)
//   Yellow: 8–15 GB RAM and ≥8 GB free disk  →  E2B (~5.6 GB download)
//   Red:    otherwise                         →  no chat model
// A debug-only `VAYU_DEV_TIER` override forces a tier for smoke tests.
use std::path::Path;

use serde::Serialize;
use sysinfo::{Disks, System};

use crate::error::VayuError;
use crate::ollama;

pub const E4B_TAG: &str = "gemma3n:e4b";
pub const E2B_TAG: &str = "gemma3n:e2b";
pub const EMBEDDING_TAG: &str = "embeddinggemma";

/// Download sizes from PRD §7, in gigabytes (one-time).
pub const E4B_SIZE_GB: f64 = 7.5;
pub const E2B_SIZE_GB: f64 = 5.6;

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct HardwareReport {
    pub ram_gb: f64,
    pub free_disk_gb: f64,
    pub cpu: String,
    pub os: String,
    pub tier: String,
    pub model: Option<String>,
    pub size_gb: f64,
    pub ollama_present: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Tier {
    Green,
    Yellow,
    Red,
}

impl Tier {
    pub fn as_str(&self) -> &'static str {
        match self {
            Tier::Green => "Green",
            Tier::Yellow => "Yellow",
            Tier::Red => "Red",
        }
    }

    /// `(tag, download size in GB)` for this tier; `None` for Red.
    pub fn model(&self) -> Option<(&'static str, f64)> {
        match self {
            Tier::Green => Some((E4B_TAG, E4B_SIZE_GB)),
            Tier::Yellow => Some((E2B_TAG, E2B_SIZE_GB)),
            Tier::Red => None,
        }
    }
}

/// Tier decision. Pure: easy to boundary-test at exactly 8 GB / 16 GB RAM
/// and 8 GB / 10 GB disk.
pub fn tier_for(ram_gb: f64, free_disk_gb: f64) -> Tier {
    if ram_gb >= 16.0 && free_disk_gb >= 10.0 {
        Tier::Green
    } else if ram_gb >= 8.0 && free_disk_gb >= 8.0 {
        Tier::Yellow
    } else {
        Tier::Red
    }
}

/// Debug-only override (never in release builds).
pub fn tier_from_env() -> Option<Tier> {
    if !cfg!(debug_assertions) {
        return None;
    }
    match std::env::var("VAYU_DEV_TIER").ok().as_deref() {
        Some("Green") => Some(Tier::Green),
        Some("Yellow") => Some(Tier::Yellow),
        Some("Red") => Some(Tier::Red),
        _ => None,
    }
}

fn free_disk_gb(path: &Path) -> f64 {
    let disks = sysinfo::Disks::new_with_refreshed_list();
    disks
        .list()
        .iter()
        .find(|disk| path.starts_with(disk.mount_point()))
        .map(|disk| disk.available_space() as f64 / 1_073_741_824.0)
        .unwrap_or(0.0)
}

/// Full hardware report. `notes_dir`, when set, is the drive the free-disk
/// figure is measured on; otherwise the system drive is used.
pub fn hardware_report(notes_dir: Option<&Path>) -> HardwareReport {
    let sys = sysinfo::System::new_all();
    let ram_gb = sys.total_memory() as f64 / 1_073_741_824.0;
    let cpu = sys
        .cpus()
        .first()
        .map(|c| c.brand().to_string())
        .unwrap_or_else(|| "unknown CPU".to_string());
    let os = format!("{} {}", std::env::consts::OS, std::env::consts::ARCH);
    let free_disk_gb = free_disk_gb(notes_dir.unwrap_or(Path::new("C:\\")));

    let tier = tier_from_env().unwrap_or_else(|| tier_for(ram_gb, free_disk_gb));
    let (model, size_gb) = match tier.model() {
        Some((tag, size)) => (Some(tag.to_string()), size),
        None => (None, 0.0),
    };

    HardwareReport {
        ram_gb,
        free_disk_gb,
        cpu,
        os,
        tier: tier.as_str().to_string(),
        model,
        size_gb,
        ollama_present: false, // filled in by the command; Ollama is a network call
    }
}

/// Command result: report + whether Ollama answered on 127.0.0.1:11434.
pub async fn hardware_check(notes_dir: Option<String>) -> Result<HardwareReport, VayuError> {
    let default_path = notes_dir.unwrap_or_else(|| String::from("C:\\"));
    let path = Path::new(&default_path);
    let mut report = hardware_report(Some(path));
    report.ollama_present = matches!(
        ollama::ollama_status(&ollama::base_url(), ollama::STATUS_TIMEOUT).await,
        ollama::OllamaStatus::Running { .. }
    );
    Ok(report)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tier_boundaries_ram() {
        assert_eq!(tier_for(16.0, 10.0), Tier::Green);
        assert_eq!(tier_for(15.9, 10.0), Tier::Yellow);
        assert_eq!(tier_for(32.0, 500.0), Tier::Green);
        assert_eq!(tier_for(8.0, 50.0), Tier::Yellow);
        assert_eq!(tier_for(7.9, 50.0), Tier::Red);
    }

    #[test]
    fn tier_boundaries_disk() {
        assert_eq!(tier_for(16.0, 10.0), Tier::Green);
        assert_eq!(tier_for(16.0, 9.9), Tier::Yellow);
        assert_eq!(tier_for(8.0, 8.0), Tier::Yellow);
        assert_eq!(tier_for(8.0, 7.9), Tier::Red);
        assert_eq!(tier_for(4.0, 500.0), Tier::Red);
    }

    #[test]
    fn tier_model_and_size() {
        let (tag, size) = Tier::Green.model().unwrap();
        assert_eq!(tag, E4B_TAG);
        assert!((size - E4B_SIZE_GB).abs() < f64::EPSILON);
        let (tag, size) = Tier::Yellow.model().unwrap();
        assert_eq!(tag, E2B_TAG);
        assert!((size - E2B_SIZE_GB).abs() < f64::EPSILON);
        assert!(Tier::Red.model().is_none());
    }

    #[test]
    fn dev_override_forces_tier_in_debug() {
        unsafe {
            std::env::set_var("VAYU_DEV_TIER", "Yellow");
        }
        assert_eq!(tier_from_env(), Some(Tier::Yellow));
        unsafe {
            std::env::remove_var("VAYU_DEV_TIER");
        }
        assert_eq!(tier_from_env(), None);
    }
}
