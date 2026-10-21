// Vayu Tauri backend. The command names, argument names, return shapes and
// error kinds are the contract in src/lib/api.ts — do not invent a second API.
mod config;
mod error;
mod notes;
mod ollama;

use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};

use serde::Serialize;
use tauri::{Manager, State};

use error::VayuError;
use notes::NoteResult;
use ollama::{DetectedModels, GenerateOutcome, OllamaStatus, StreamEvent};

/// `get_config` result (camelCase on the wire).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ConfigResult {
    notes_dir: Option<String>,
    version: u32,
    default_notes_dir: String,
}

/// One generation at a time (1.11.2): the flag lets `stop_generation` end the
/// live run; the slot makes a second `generate` return Err(Busy).
#[derive(Default)]
struct AppState {
    generation: Mutex<Option<Arc<AtomicBool>>>,
}

impl AppState {
    fn begin_generation(&self) -> Result<Arc<AtomicBool>, VayuError> {
        let mut slot = self.generation.lock().unwrap_or_else(|e| e.into_inner());
        if slot.is_some() {
            return Err(VayuError::busy());
        }
        let flag = Arc::new(AtomicBool::new(false));
        *slot = Some(flag.clone());
        Ok(flag)
    }

    fn finish_generation(&self) {
        let mut slot = self.generation.lock().unwrap_or_else(|e| e.into_inner());
        *slot = None;
    }

    fn request_stop(&self) {
        let slot = self.generation.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(flag) = slot.as_ref() {
            flag.store(true, Ordering::SeqCst);
        }
    }
}

fn config_dir(app: &tauri::AppHandle) -> Result<PathBuf, VayuError> {
    app.path()
        .app_config_dir()
        .map_err(|e| VayuError::other(format!("No app config folder: {e}")))
}

fn notes_dir(app: &tauri::AppHandle) -> Result<PathBuf, VayuError> {
    let stored = config::load_config(&config_dir(app)?)
        .ok_or_else(|| VayuError::io("No notes folder set yet."))?;
    Ok(PathBuf::from(stored.notes_dir))
}

// ── 1C.1 config + folder (1.4.1–1.4.3) ───────────────────────────────────────

#[tauri::command]
fn get_config(app: tauri::AppHandle) -> Result<ConfigResult, VayuError> {
    let dir = config_dir(&app)?;
    let documents = app
        .path()
        .document_dir()
        .map_err(|e| VayuError::other(format!("No Documents folder: {e}")))?;
    let default_notes_dir = config::default_notes_dir(&documents);
    let stored = config::load_config(&dir);
    Ok(ConfigResult {
        notes_dir: stored.as_ref().map(|c| c.notes_dir.clone()),
        version: stored.map(|c| c.version).unwrap_or(config::CONFIG_VERSION),
        default_notes_dir: default_notes_dir.to_string_lossy().into_owned(),
    })
}

#[tauri::command]
fn set_notes_dir(app: tauri::AppHandle, path: String) -> Result<(), VayuError> {
    if path.trim().is_empty() {
        return Err(VayuError::not_a_directory("Please choose a folder."));
    }
    let chosen = PathBuf::from(&path);
    config::validate_notes_dir(&chosen)?;
    config::save_config(&config_dir(&app)?, &chosen)
}

// ── 1C.2 notes (1.5.2, 1.5.3, 1.7.1) ────────────────────────────────────────

#[tauri::command]
fn read_note(app: tauri::AppHandle, date: String) -> Result<NoteResult, VayuError> {
    notes::read_note(&notes_dir(&app)?, &date)
}

#[tauri::command]
fn ensure_note(app: tauri::AppHandle, date: String) -> Result<(), VayuError> {
    notes::ensure_note(&notes_dir(&app)?, &date)
}

#[tauri::command]
fn write_note(app: tauri::AppHandle, date: String, content: String) -> Result<(), VayuError> {
    notes::write_note(&notes_dir(&app)?, &date, &content)
}

#[tauri::command]
fn list_notes(app: tauri::AppHandle) -> Result<Vec<String>, VayuError> {
    notes::list_notes(&notes_dir(&app)?)
}

// ── 1C.3 Ollama status + models (1.9.1, 1.10.1) ─────────────────────────────

#[tauri::command]
async fn ollama_status() -> OllamaStatus {
    ollama::ollama_status(&ollama::base_url(), ollama::STATUS_TIMEOUT).await
}

#[tauri::command]
async fn list_models() -> DetectedModels {
    let dev = ollama::dev_chat_model();
    ollama::list_models(&ollama::base_url(), ollama::STATUS_TIMEOUT, dev).await
}

// ── 1C.4 generate / stop (1.11.1, 1.11.2) ───────────────────────────────────

#[tauri::command]
async fn generate(
    state: State<'_, AppState>,
    prompt: String,
    on_event: tauri::ipc::Channel<StreamEvent>,
) -> Result<GenerateOutcome, VayuError> {
    let stop = state.begin_generation()?;
    let result = async {
        let base = ollama::base_url();
        let installed = ollama::fetch_installed(&base, ollama::STATUS_TIMEOUT)
            .await
            .unwrap_or_default();
        let dev = ollama::dev_chat_model();
        let model = ollama::select_model(&installed, dev.as_deref(), cfg!(debug_assertions))?;
        ollama::run_generate(
            &base,
            &model,
            &prompt,
            ollama::generate_timeout(),
            ollama::STOP_POLL,
            stop,
            |event| {
                let _ = on_event.send(event);
            },
        )
        .await
    }
    .await;
    state.finish_generation();
    result
}

#[tauri::command]
fn stop_generation(state: State<'_, AppState>) -> Result<(), VayuError> {
    state.request_stop();
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            get_config,
            set_notes_dir,
            read_note,
            ensure_note,
            write_note,
            list_notes,
            ollama_status,
            list_models,
            generate,
            stop_generation
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    // Trivial harness test (task 1.2.2): proves `cargo test` is wired.
    #[test]
    fn harness_works() {
        assert_eq!(1 + 1, 2);
    }

    #[test]
    fn second_generate_is_busy_until_the_first_finishes() {
        let state = AppState::default();
        let stop = state.begin_generation().expect("first run starts");
        let err = state.begin_generation().unwrap_err();
        assert_eq!(err.kind, "Busy");

        state.request_stop();
        assert!(
            stop.load(Ordering::SeqCst),
            "stop flag reaches the live run"
        );

        state.finish_generation();
        assert!(
            state.begin_generation().is_ok(),
            "slot is free after the run ends"
        );
    }

    #[test]
    fn stop_without_a_run_is_a_no_op() {
        let state = AppState::default();
        state.request_stop();
        assert!(state.begin_generation().is_ok());
    }
}
