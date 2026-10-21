// Ollama status, model detection and streaming (1C.3 + 1C.4).
use std::cmp;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};

use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::error::VayuError;

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(tag = "kind")]
pub enum OllamaStatus {
    Running {
        version: String,
    },
    NotFound {
        #[serde(skip_serializing_if = "Option::is_none")]
        reason: Option<String>,
    },
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DetectedModels {
    pub present: Vec<String>,
    pub missing: Vec<String>,
    pub status: OllamaStatus,
    pub dev_chat_model: Option<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(tag = "event", content = "value", rename_all = "lowercase")]
pub enum StreamEvent {
    Token(String),
    Done(String),
    Error(String),
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(tag = "status")]
pub enum GenerateOutcome {
    Done,
    Stopped,
    /// Part of the `api.ts` contract. Mid-stream failures currently emit an
    /// `error` event and reject with `Err(Io)`, so this stays unused.
    #[allow(dead_code)]
    Error {
        message: String,
    },
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ParsedLine {
    Token(String),
    Done,
    Error(String),
}

/// Incremental NDJSON reader: chunks may split a line anywhere (1.11.1).
pub struct NdjsonBuffer {
    buf: String,
}

impl NdjsonBuffer {
    pub fn new() -> Self {
        Self { buf: String::new() }
    }

    pub fn push(&mut self, chunk: &str) -> Vec<ParsedLine> {
        self.buf.push_str(chunk);
        let mut parsed = Vec::new();
        while let Some(pos) = self.buf.find('\n') {
            let line: String = self.buf.drain(..=pos).collect();
            if let Some(event) = parse_line(line.trim()) {
                parsed.push(event);
            }
        }
        parsed
    }
}

impl Default for NdjsonBuffer {
    fn default() -> Self {
        Self::new()
    }
}

pub const DEFAULT_BASE_URL: &str = "http://127.0.0.1:11434";
pub const STATUS_TIMEOUT: Duration = Duration::from_millis(1500);
pub const STOP_POLL: Duration = Duration::from_millis(100);
pub const REQUIRED_MODELS: [&str; 3] = ["gemma3n:e4b", "gemma3n:e2b", "embeddinggemma"];
pub const E4B: &str = "gemma3n:e4b";
pub const E2B: &str = "gemma3n:e2b";

pub fn base_url_from(value: Option<String>) -> String {
    let Some(url) = value else {
        return DEFAULT_BASE_URL.to_string();
    };
    let url = url.trim().trim_end_matches('/');
    // Test override only, and local-only: never let an env var point the app
    // at a remote host (zero outbound calls outside 127.0.0.1:11434).
    if url.starts_with("http://127.0.0.1:") || url.starts_with("http://localhost:") {
        url.to_string()
    } else {
        DEFAULT_BASE_URL.to_string()
    }
}

/// Local Ollama only; `VAYU_OLLAMA_URL` exists so tests can point at a mock.
pub fn base_url() -> String {
    base_url_from(std::env::var("VAYU_OLLAMA_URL").ok())
}

pub fn generate_timeout_from(value: Option<String>) -> Duration {
    value
        .and_then(|v| v.trim().parse::<u64>().ok())
        .filter(|ms| *ms > 0)
        .map(Duration::from_millis)
        .unwrap_or(Duration::from_millis(60_000))
}

pub fn generate_timeout() -> Duration {
    generate_timeout_from(std::env::var("VAYU_GENERATE_TIMEOUT_MS").ok())
}

pub fn dev_chat_model_from(debug: bool, value: Option<String>) -> Option<String> {
    if !debug {
        return None;
    }
    value.filter(|v| !v.trim().is_empty())
}

/// Debug builds only (1.11.2) — release builds never read the override.
pub fn dev_chat_model() -> Option<String> {
    dev_chat_model_from(
        cfg!(debug_assertions),
        std::env::var("VAYU_DEV_CHAT_MODEL").ok(),
    )
}

/// Split an exact tag match (1.10.1): `embeddinggemma` also matches
/// `embeddinggemma:latest`; every other required tag must match exactly.
pub fn detect_models(installed: &[String]) -> (Vec<String>, Vec<String>) {
    let mut present = Vec::new();
    let mut missing = Vec::new();
    for required in REQUIRED_MODELS {
        let found = installed.iter().any(|name| {
            name == required || (required == "embeddinggemma" && name == "embeddinggemma:latest")
        });
        if found {
            present.push(required.to_string());
        } else {
            missing.push(required.to_string());
        }
    }
    (present, missing)
}

/// One NDJSON line → token / done / error. Blank, malformed, and keep-alive
/// lines are ignored (`None`).
pub fn parse_line(line: &str) -> Option<ParsedLine> {
    if line.is_empty() {
        return None;
    }
    let value: Value = serde_json::from_str(line).ok()?;
    if let Some(error) = value.get("error").and_then(Value::as_str) {
        return Some(ParsedLine::Error(error.to_string()));
    }
    if value.get("done").and_then(Value::as_bool) == Some(true) {
        return Some(ParsedLine::Done);
    }
    let token = value.get("response").and_then(Value::as_str).unwrap_or("");
    if token.is_empty() {
        None
    } else {
        Some(ParsedLine::Token(token.to_string()))
    }
}

#[derive(Debug, Deserialize)]
struct VersionResponse {
    version: String,
}

#[derive(Debug, Deserialize)]
struct TagsResponse {
    models: Vec<TagEntry>,
}

#[derive(Debug, Deserialize)]
struct TagEntry {
    name: String,
}

fn local_client(timeout: Duration) -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        // Never route local Ollama traffic through a system/HTTP proxy.
        .no_proxy()
        .timeout(timeout)
        .build()
        .map_err(|e| e.to_string())
}

fn endpoint(base_url: &str, path: &str) -> String {
    format!("{}{}", base_url.trim_end_matches('/'), path)
}

/// GET `/api/version` with a hard 1.5s cap; never panics, never blocks
/// startup (1.9.1).
pub async fn ollama_status(base_url: &str, timeout: Duration) -> OllamaStatus {
    let client = match local_client(timeout) {
        Ok(client) => client,
        Err(reason) => {
            return OllamaStatus::NotFound {
                reason: Some(reason),
            };
        }
    };
    match client.get(endpoint(base_url, "/api/version")).send().await {
        Ok(response) if response.status().is_success() => {
            match response.json::<VersionResponse>().await {
                Ok(body) => OllamaStatus::Running {
                    version: body.version,
                },
                Err(err) => OllamaStatus::NotFound {
                    reason: Some(format!("Unexpected reply from Ollama: {err}")),
                },
            }
        }
        Ok(response) => OllamaStatus::NotFound {
            reason: Some(format!("Ollama returned HTTP {}", response.status())),
        },
        Err(err) => OllamaStatus::NotFound {
            reason: Some(if err.is_timeout() {
                "Ollama did not answer in time.".to_string()
            } else {
                "Ollama is not running.".to_string()
            }),
        },
    }
}

/// Installed model names from GET `/api/tags` (1.10.1).
pub async fn fetch_installed(base_url: &str, timeout: Duration) -> Result<Vec<String>, String> {
    let client = local_client(timeout)?;
    let response = client
        .get(endpoint(base_url, "/api/tags"))
        .send()
        .await
        .map_err(|err| {
            if err.is_timeout() {
                "Ollama did not answer in time.".to_string()
            } else {
                "Ollama is not running.".to_string()
            }
        })?;
    if !response.status().is_success() {
        return Err(format!("Ollama returned HTTP {}", response.status()));
    }
    let tags = response
        .json::<TagsResponse>()
        .await
        .map_err(|err| format!("Unexpected reply from Ollama: {err}"))?;
    Ok(tags.models.into_iter().map(|model| model.name).collect())
}

pub async fn list_models(base_url: &str, timeout: Duration, dev: Option<String>) -> DetectedModels {
    match fetch_installed(base_url, timeout).await {
        Ok(installed) => {
            let (present, missing) = detect_models(&installed);
            DetectedModels {
                present,
                missing,
                // Version is reported by `ollama_status`; tags carries none.
                status: OllamaStatus::Running {
                    version: String::new(),
                },
                dev_chat_model: dev,
            }
        }
        Err(reason) => {
            let (_, missing) = detect_models(&[]);
            DetectedModels {
                present: Vec::new(),
                missing,
                status: OllamaStatus::NotFound {
                    reason: Some(reason),
                },
                dev_chat_model: dev,
            }
        }
    }
}

/// Model order (1.11.2): E4B → E2B → debug-only override → NoModel.
pub fn select_model(
    installed: &[String],
    dev_override: Option<&str>,
    debug: bool,
) -> Result<String, VayuError> {
    if installed.iter().any(|name| name == E4B) {
        return Ok(E4B.to_string());
    }
    if installed.iter().any(|name| name == E2B) {
        return Ok(E2B.to_string());
    }
    if debug && let Some(model) = dev_override.filter(|m| !m.trim().is_empty()) {
        return Ok(model.to_string());
    }
    Err(VayuError::no_model(
        "No local model is installed yet. Install one from Settings.",
    ))
}

/// Stream one reply from Ollama. The stop flag is polled every `poll` so Stop
/// lands within ~1s; the first token must arrive within `first_token_timeout`.
pub async fn run_generate<F>(
    base_url: &str,
    model: &str,
    prompt: &str,
    first_token_timeout: Duration,
    poll: Duration,
    stop: Arc<AtomicBool>,
    mut on_event: F,
) -> Result<GenerateOutcome, VayuError>
where
    F: FnMut(StreamEvent),
{
    let client = reqwest::Client::builder()
        .no_proxy()
        .connect_timeout(first_token_timeout)
        .build()
        .map_err(|err| VayuError::io(err.to_string()))?;
    let body = serde_json::json!({
        "model": model,
        "prompt": prompt,
        "stream": true,
    });

    let started = Instant::now();
    let request = client
        .post(endpoint(base_url, "/api/generate"))
        .json(&body)
        .send();
    tokio::pin!(request);

    // Wait for response headers, staying responsive to Stop.
    let response = loop {
        if stop.load(Ordering::SeqCst) {
            return Ok(GenerateOutcome::Stopped);
        }
        match tokio::time::timeout(poll, &mut request).await {
            Ok(Ok(response)) => break response,
            Ok(Err(err)) => {
                return Err(VayuError::io(format!("Couldn't reach Ollama: {err}")));
            }
            Err(_) if started.elapsed() >= first_token_timeout => {
                return Err(VayuError::io("timed out"));
            }
            Err(_) => {}
        }
    };

    if !response.status().is_success() {
        return Err(VayuError::io(format!(
            "Ollama returned HTTP {}",
            response.status()
        )));
    }

    let mut stream = response.bytes_stream();
    let mut buffer = NdjsonBuffer::new();
    let mut got_token = false;

    loop {
        if stop.load(Ordering::SeqCst) {
            return Ok(GenerateOutcome::Stopped);
        }
        match tokio::time::timeout(poll, stream.next()).await {
            // No bytes this tick: only the first-token deadline can expire.
            Err(_) => {
                if !got_token && started.elapsed() >= first_token_timeout {
                    return Err(VayuError::io("timed out"));
                }
            }
            Ok(None) | Ok(Some(Err(_))) => {
                let message = "connection lost".to_string();
                on_event(StreamEvent::Error(message.clone()));
                return Err(VayuError::io(message));
            }
            Ok(Some(Ok(chunk))) => {
                let text = String::from_utf8_lossy(&chunk);
                for event in buffer.push(&text) {
                    match event {
                        ParsedLine::Token(token) => {
                            got_token = true;
                            on_event(StreamEvent::Token(token));
                        }
                        ParsedLine::Done => {
                            on_event(StreamEvent::Done(String::new()));
                            return Ok(GenerateOutcome::Done);
                        }
                        ParsedLine::Error(message) => {
                            on_event(StreamEvent::Error(message.clone()));
                            return Err(VayuError::io(message));
                        }
                    }
                }
            }
        }
    }
}

/// Progress of a model pull via POST /api/pull (task 2.4/2.5). Pull lines
/// are not `generate`-shaped, so they are kept as raw strings and parsed
/// separately.
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(tag = "event", content = "value", rename_all = "lowercase")]
pub enum PullEvent {
    Progress(PullProgress),
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PullProgress {
    pub status: String,
    pub total: Option<u64>,
    pub completed: u64,
    pub percent: Option<u32>,
}

enum PullLine {
    Progress(PullProgress),
    Error(String),
}

/// One pull progress line: `{ "status": "pulling", "total": N, "completed": M }`
/// or `{ "status": "success" }`; an `{ "error": "..." }` line is a failure.
fn parse_pull_line(line: &str) -> Option<PullLine> {
    let line = line.trim();
    if line.is_empty() {
        return None;
    }
    let value: Value = serde_json::from_str(line).ok()?;
    if let Some(error) = value.get("error").and_then(Value::as_str) {
        return Some(PullLine::Error(error.to_string()));
    }
    let status = value.get("status")?.as_str()?.to_string();
    let total = value.get("total").and_then(Value::as_u64);
    let mut completed = value.get("completed").and_then(Value::as_u64).unwrap_or(0);
    if status == "success" {
        if let Some(t) = total {
            completed = t;
        }
    }
    let percent = total.map(|t| {
        if t == 0 {
            0u32
        } else {
            cmp::min(100, ((completed * 100) / t) as u32)
        }
    });
    Some(PullLine::Progress(PullProgress {
        status,
        total,
        completed,
        percent,
    }))
}

/// Raw-line buffer for pull responses (multiple lines per chunk, split lines
/// re-composed, blank lines ignored).
struct PullLines {
    buf: String,
}

impl PullLines {
    fn new() -> Self {
        Self { buf: String::new() }
    }

    fn push(&mut self, chunk: &str) -> Vec<String> {
        self.buf.push_str(chunk);
        let mut lines = Vec::new();
        while let Some(pos) = self.buf.find('\n') {
            lines.push(self.buf.drain(..=pos).collect());
        }
        lines
    }
}

/// Stream one model pull from Ollama. Emits progress events until `success`;
/// cancelling the task (see `cancel_pull`) ends the run early.
pub async fn run_pull<F>(
    base_url: &str,
    model: &str,
    first_token_timeout: Duration,
    poll: Duration,
    mut on_event: F,
) -> Result<(), VayuError>
where
    F: FnMut(PullEvent),
{
    let client = reqwest::Client::builder()
        .no_proxy()
        .connect_timeout(first_token_timeout)
        .build()
        .map_err(|err| VayuError::io(err.to_string()))?;
    let body = serde_json::json!({ "model": model });

    let started = Instant::now();
    let request = client.post(endpoint(base_url, "/api/pull")).json(&body).send();
    tokio::pin!(request);

    // Wait for response headers, staying responsive to cancellation.
    let response = loop {
        match tokio::time::timeout(poll, &mut request).await {
            Ok(Ok(response)) => break response,
            Ok(Err(err)) => {
                return Err(VayuError::io(format!("Couldn't reach Ollama: {err}")));
            }
            Err(_) if started.elapsed() >= first_token_timeout => {
                return Err(VayuError::io("timed out"));
            }
            Err(_) => {}
        }
    };

    if !response.status().is_success() {
        return Err(VayuError::io(format!(
            "Ollama returned HTTP {}",
            response.status()
        )));
    }

    let mut stream = response.bytes_stream();
    let mut lines = PullLines::new();
    let mut last_total: Option<u64> = None;

    loop {
        match tokio::time::timeout(poll, stream.next()).await {
            Ok(None) | Ok(Some(Err(_))) => {
                let message = "connection lost".to_string();
                on_event(PullEvent::Progress(PullProgress {
                    status: message.clone(),
                    total: None,
                    completed: 0,
                    percent: None,
                }));
                return Err(VayuError::io(message));
            }
            Ok(Some(Ok(chunk))) => {
                let text = String::from_utf8_lossy(&chunk);
                for line in lines.push(&text) {
                    match parse_pull_line(&line) {
                        Some(PullLine::Progress(mut p)) => {
                            if p.total.is_some() {
                                last_total = p.total;
                            }
                            if p.status == "success" && p.total.is_none() {
                                if let Some(t) = last_total {
                                    p.total = Some(t);
                                    p.completed = t;
                                    p.percent = Some(100);
                                }
                            }
                            let done = p.status == "success";
                            on_event(PullEvent::Progress(p));
                            if done {
                                return Ok(());
                            }
                        }
                        Some(PullLine::Error(message)) => {
                            on_event(PullEvent::Progress(PullProgress {
                                status: "error".into(),
                                total: None,
                                completed: 0,
                                percent: None,
                            }));
                            return Err(VayuError::io(message));
                        }
                        None => {}
                    }
                }
            }
            Err(_) => {} // no bytes this tick; keep waiting for the next chunk
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;
    use std::sync::atomic::Ordering;
    use std::time::Instant;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::TcpListener;
    use wiremock::matchers::{method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    fn names(list: &[&str]) -> Vec<String> {
        list.iter().map(|s| s.to_string()).collect()
    }

    // ── exact tag matching (1.10.1) ─────────────────────────────────────────

    #[test]
    fn detect_matches_exact_tags_and_embedding_latest_only() {
        let installed = names(&[
            "gemma3n:e4b",
            "embeddinggemma:latest",
            "gemma3n:e4b-it-q4_K_M",
            "llama3:latest",
        ]);
        let (present, missing) = detect_models(&installed);
        assert_eq!(present, names(&["gemma3n:e4b", "embeddinggemma"]));
        assert_eq!(missing, names(&["gemma3n:e2b"]));
    }

    #[test]
    fn detect_requires_exact_e2b_tag() {
        let (present, missing) = detect_models(&names(&["gemma3n:e2b:latest", "embeddinggemma"]));
        assert_eq!(present, names(&["embeddinggemma"]));
        assert_eq!(missing, names(&["gemma3n:e4b", "gemma3n:e2b"]));
    }

    #[test]
    fn detect_keeps_prd_order_and_reports_everything_missing_when_empty() {
        let (present, missing) = detect_models(&[]);
        assert!(present.is_empty());
        assert_eq!(
            missing,
            names(&["gemma3n:e4b", "gemma3n:e2b", "embeddinggemma"])
        );
    }

    // ── model selection (1.11.2) ────────────────────────────────────────────

    #[test]
    fn selection_prefers_e4b_then_e2b_then_debug_override() {
        let both = names(&["gemma3n:e4b", "gemma3n:e2b"]);
        assert_eq!(select_model(&both, None, false).unwrap(), "gemma3n:e4b");

        let only_e2b = names(&["gemma3n:e2b"]);
        assert_eq!(select_model(&only_e2b, None, false).unwrap(), "gemma3n:e2b");

        let none = names(&[]);
        assert_eq!(
            select_model(&none, Some("gemma4-e4b-fast"), true).unwrap(),
            "gemma4-e4b-fast"
        );
        let err = select_model(&none, None, true).unwrap_err();
        assert_eq!(err.kind, "NoModel");
        let err = select_model(&none, Some(""), true).unwrap_err();
        assert_eq!(err.kind, "NoModel");
    }

    #[test]
    fn debug_override_is_ignored_in_release_builds() {
        let none = names(&[]);
        let err = select_model(&none, Some("gemma4-e4b-fast"), false).unwrap_err();
        assert_eq!(err.kind, "NoModel");
    }

    #[test]
    fn installed_models_win_over_the_override() {
        let e2b = names(&["gemma3n:e2b"]);
        assert_eq!(
            select_model(&e2b, Some("gemma4-e4b-fast"), true).unwrap(),
            "gemma3n:e2b"
        );
    }

    #[test]
    fn dev_override_is_debug_only_and_never_empty() {
        assert_eq!(
            dev_chat_model_from(true, Some("gemma4-e4b-fast".into())),
            Some("gemma4-e4b-fast".into())
        );
        assert_eq!(dev_chat_model_from(false, Some("x".into())), None);
        assert_eq!(dev_chat_model_from(true, Some("   ".into())), None);
        assert_eq!(dev_chat_model_from(true, None), None);
    }

    #[test]
    fn base_url_and_timeout_read_overrides() {
        assert_eq!(base_url_from(None), DEFAULT_BASE_URL);
        assert_eq!(
            base_url_from(Some("http://127.0.0.1:9999".into())),
            "http://127.0.0.1:9999"
        );
        assert_eq!(
            base_url_from(Some("http://localhost:11434/".into())),
            "http://localhost:11434"
        );
        assert_eq!(generate_timeout_from(None), Duration::from_millis(60_000));
        assert_eq!(
            generate_timeout_from(Some("250".into())),
            Duration::from_millis(250)
        );
        assert_eq!(
            generate_timeout_from(Some("nope".into())),
            Duration::from_millis(60_000)
        );
    }

    #[test]
    fn base_url_refuses_remote_or_https_overrides() {
        for remote in [
            "http://example.com:11434",
            "https://127.0.0.1:11434",
            "http://192.168.1.20:11434",
            "http://127.0.0.1.evil.test:11434",
            "",
        ] {
            assert_eq!(
                base_url_from(Some(remote.into())),
                DEFAULT_BASE_URL,
                "{remote}"
            );
        }
    }

    // ── NDJSON parser (1.11.1) ──────────────────────────────────────────────

    #[test]
    fn ndjson_handles_split_lines_tokens_done_and_errors() {
        let mut buf = NdjsonBuffer::new();
        assert!(buf.push("{\"response\":\"Hel").is_empty());
        let events = buf.push("lo\",\"done\":false}\n{\"response\":\" world\",\"done\":false}\n");
        assert_eq!(
            events,
            vec![
                ParsedLine::Token("Hello".into()),
                ParsedLine::Token(" world".into())
            ]
        );
        assert_eq!(
            buf.push("{\"done\":true,\"response\":\"\"}\n"),
            vec![ParsedLine::Done]
        );
        assert_eq!(
            buf.push("{\"error\":\"model not found\"}\n"),
            vec![ParsedLine::Error("model not found".into())]
        );
    }

    #[test]
    fn ndjson_ignores_blank_and_malformed_lines() {
        let mut buf = NdjsonBuffer::new();
        assert_eq!(
            buf.push("\n  \nnot json\n{\"response\":\"ok\"}\n"),
            vec![ParsedLine::Token("ok".into())]
        );
    }

    #[test]
    fn ndjson_keeps_a_partial_final_line_until_the_next_chunk() {
        let mut buf = NdjsonBuffer::new();
        assert!(buf.push("{\"done\":tr").is_empty());
        assert_eq!(buf.push("ue}\n"), vec![ParsedLine::Done]);
    }

    // ── ollama_status (1.9.1) ───────────────────────────────────────────────

    #[tokio::test]
    async fn status_running_reads_the_version() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/version"))
            .respond_with(
                ResponseTemplate::new(200).set_body_json(serde_json::json!({"version": "0.9.1"})),
            )
            .mount(&server)
            .await;

        let status = ollama_status(&server.uri(), STATUS_TIMEOUT).await;
        assert_eq!(
            status,
            OllamaStatus::Running {
                version: "0.9.1".into()
            }
        );
    }

    #[tokio::test]
    async fn status_server_error_is_not_found_with_a_reason() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/version"))
            .respond_with(ResponseTemplate::new(500))
            .mount(&server)
            .await;

        match ollama_status(&server.uri(), STATUS_TIMEOUT).await {
            OllamaStatus::NotFound { reason } => {
                assert!(reason.unwrap_or_default().contains("500"));
            }
            other => panic!("expected NotFound, got {other:?}"),
        }
    }

    #[tokio::test]
    async fn status_refused_connection_is_not_found_quickly() {
        let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        let port = listener.local_addr().unwrap().port();
        drop(listener);

        let started = Instant::now();
        let status = ollama_status(&format!("http://127.0.0.1:{port}"), STATUS_TIMEOUT).await;
        assert!(matches!(status, OllamaStatus::NotFound { .. }));
        // Windows may spend up to the client cap on a refused local connect;
        // the point is that it always returns (never hangs) and reports NotFound.
        assert!(
            started.elapsed() < STATUS_TIMEOUT + Duration::from_secs(1),
            "took {:?}",
            started.elapsed()
        );
    }

    #[tokio::test]
    async fn status_times_out_in_under_two_seconds() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/version"))
            .respond_with(
                ResponseTemplate::new(200)
                    .set_body_json(serde_json::json!({"version": "0.9.1"}))
                    .set_delay(Duration::from_secs(3)),
            )
            .mount(&server)
            .await;

        let started = Instant::now();
        let status = ollama_status(&server.uri(), Duration::from_millis(300)).await;
        assert!(matches!(status, OllamaStatus::NotFound { .. }));
        assert!(
            started.elapsed() < Duration::from_millis(1500),
            "took {:?}",
            started.elapsed()
        );
    }

    // ── list_models (1.10.1) ────────────────────────────────────────────────

    #[tokio::test]
    async fn list_models_reports_present_and_missing_exact_tags() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/tags"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "models": [
                    {"name": "gemma3n:e4b"},
                    {"name": "embeddinggemma:latest"},
                    {"name": "gemma3n:e4b-it-q4_K_M"}
                ]
            })))
            .mount(&server)
            .await;

        let detected = list_models(&server.uri(), STATUS_TIMEOUT, None).await;
        assert_eq!(detected.present, names(&["gemma3n:e4b", "embeddinggemma"]));
        assert_eq!(detected.missing, names(&["gemma3n:e2b"]));
        assert!(matches!(detected.status, OllamaStatus::Running { .. }));
        assert_eq!(detected.dev_chat_model, None);
    }

    #[tokio::test]
    async fn list_models_when_ollama_is_down_is_all_missing_not_an_error() {
        let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        let port = listener.local_addr().unwrap().port();
        drop(listener);

        let detected = list_models(
            &format!("http://127.0.0.1:{port}"),
            STATUS_TIMEOUT,
            Some("gemma4-e4b-fast".into()),
        )
        .await;
        assert!(detected.present.is_empty());
        assert_eq!(
            detected.missing,
            names(&["gemma3n:e4b", "gemma3n:e2b", "embeddinggemma"])
        );
        assert!(matches!(detected.status, OllamaStatus::NotFound { .. }));
        assert_eq!(detected.dev_chat_model.as_deref(), Some("gemma4-e4b-fast"));
    }

    // ── streaming (1.11.1 / 1.11.2) ─────────────────────────────────────────

    /// Minimal raw HTTP server so chunks arrive over time (wiremock can only
    /// delay whole responses). `headers_delay_ms` delays the response headers
    /// (to test timeouts), `hold_open_ms` keeps the socket open after the
    /// last line to simulate a stalled server.
    async fn spawn_stream_server(
        lines: Vec<(u64, String)>,
        hold_open_ms: u64,
        headers_delay_ms: u64,
    ) -> String {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        tokio::spawn(async move {
            let (mut socket, _) = listener.accept().await.unwrap();
            let mut request = [0u8; 8192];
            let _ = socket.read(&mut request).await;
            if headers_delay_ms > 0 {
                tokio::time::sleep(Duration::from_millis(headers_delay_ms)).await;
            }
            socket
                .write_all(
                    b"HTTP/1.1 200 OK\r\nContent-Type: application/x-ndjson\r\nConnection: close\r\n\r\n",
                )
                .await
                .unwrap();
            socket.flush().await.unwrap();
            for (delay_ms, line) in lines {
                if delay_ms > 0 {
                    tokio::time::sleep(Duration::from_millis(delay_ms)).await;
                }
                if socket.write_all(line.as_bytes()).await.is_err() {
                    return;
                }
                let _ = socket.flush().await;
            }
            if hold_open_ms > 0 {
                tokio::time::sleep(Duration::from_millis(hold_open_ms)).await;
            }
        });
        format!("http://{addr}")
    }

    #[tokio::test]
    async fn tokens_arrive_as_they_stream_not_all_at_the_end() {
        let base = spawn_stream_server(
            vec![
                (0, "{\"response\":\"Hello\",\"done\":false}\n".into()),
                (250, "{\"response\":\" world\",\"done\":false}\n".into()),
                (0, "{\"done\":true,\"response\":\"\"}\n".into()),
            ],
            0,
            0,
        )
        .await;

        let mut events: Vec<(Instant, StreamEvent)> = Vec::new();
        let started = Instant::now();
        let outcome = run_generate(
            &base,
            "gemma3n:e4b",
            "hi",
            Duration::from_secs(5),
            STOP_POLL,
            Arc::new(AtomicBool::new(false)),
            |event| events.push((Instant::now(), event)),
        )
        .await
        .unwrap();

        assert_eq!(outcome, GenerateOutcome::Done);
        assert_eq!(
            events.iter().map(|(_, e)| e.clone()).collect::<Vec<_>>(),
            vec![
                StreamEvent::Token("Hello".into()),
                StreamEvent::Token(" world".into()),
                StreamEvent::Done(String::new())
            ]
        );
        let first = events[0].0.duration_since(started);
        let last = events[2].0.duration_since(started);
        assert!(
            last - first >= Duration::from_millis(200),
            "stream looked buffered: first {first:?}, last {last:?}"
        );
    }

    #[tokio::test]
    async fn stop_ends_a_live_stream_within_one_second() {
        let mut lines = Vec::new();
        for i in 0..200 {
            lines.push((20, format!("{{\"response\":\"t{i}\",\"done\":false}}\n")));
        }
        let base = spawn_stream_server(lines, 0, 0).await;

        let stop = Arc::new(AtomicBool::new(false));
        let seen = Arc::new(Mutex::new(Vec::<String>::new()));
        let seen_in_task = seen.clone();
        let stop_in_task = stop.clone();
        let base_in_task = base.clone();

        let handle = tokio::spawn(async move {
            run_generate(
                &base_in_task,
                "gemma3n:e4b",
                "hi",
                Duration::from_secs(5),
                STOP_POLL,
                stop_in_task,
                |event| {
                    if let StreamEvent::Token(t) = event {
                        seen_in_task.lock().unwrap().push(t);
                    }
                },
            )
            .await
        });

        // Wait for the first token, then ask to stop.
        for _ in 0..100 {
            if !seen.lock().unwrap().is_empty() {
                break;
            }
            tokio::time::sleep(Duration::from_millis(10)).await;
        }
        assert!(!seen.lock().unwrap().is_empty(), "no token before stop");
        let stop_at = Instant::now();
        stop.store(true, Ordering::SeqCst);

        let outcome = tokio::time::timeout(Duration::from_secs(1), handle)
            .await
            .expect("generate did not stop within 1s")
            .unwrap()
            .unwrap();
        assert_eq!(outcome, GenerateOutcome::Stopped);
        assert!(stop_at.elapsed() < Duration::from_secs(1));
    }

    #[tokio::test]
    async fn no_first_token_times_out() {
        let base = spawn_stream_server(Vec::new(), 5_000, 0).await;
        let started = Instant::now();
        let err = run_generate(
            &base,
            "gemma3n:e4b",
            "hi",
            Duration::from_millis(300),
            STOP_POLL,
            Arc::new(AtomicBool::new(false)),
            |_| {},
        )
        .await
        .unwrap_err();
        assert_eq!(err.kind, "Io");
        assert!(err.message.contains("timed out"), "{}", err.message);
        assert!(started.elapsed() < Duration::from_millis(1500));
    }

    #[tokio::test]
    async fn dropped_connection_mid_stream_is_connection_lost() {
        let base = spawn_stream_server(
            vec![(0, "{\"response\":\"Hi\",\"done\":false}\n".into())],
            0,
            0,
        )
        .await;

        let mut saw_error_event = false;
        let err = run_generate(
            &base,
            "gemma3n:e4b",
            "hi",
            Duration::from_secs(5),
            STOP_POLL,
            Arc::new(AtomicBool::new(false)),
            |event| {
                if matches!(event, StreamEvent::Error(_)) {
                    saw_error_event = true;
                }
            },
        )
        .await
        .unwrap_err();

        assert_eq!(err.kind, "Io");
        assert!(err.message.contains("connection lost"), "{}", err.message);
        assert!(
            saw_error_event,
            "an error event was emitted before rejecting"
        );
    }

    #[tokio::test]
    async fn ollama_error_line_rejects_with_io_and_emits_error_event() {
        let base =
            spawn_stream_server(vec![(0, "{\"error\":\"model 'x' not found\"}\n".into())], 0, 0).await;

        let mut messages = Vec::new();
        let err = run_generate(
            &base,
            "gemma3n:e4b",
            "hi",
            Duration::from_secs(5),
            STOP_POLL,
            Arc::new(AtomicBool::new(false)),
            |event| {
                if let StreamEvent::Error(m) = event {
                    messages.push(m);
                }
            },
        )
        .await
        .unwrap_err();

        assert_eq!(err.kind, "Io");
        assert!(err.message.contains("not found"));
        assert_eq!(messages, vec!["model 'x' not found".to_string()]);
    }

    // ── model pull (2.4, 2.5) ─────────────────────────────────────────

    #[tokio::test]
    async fn pull_streams_progress_until_success() {
        let base = spawn_stream_server(
            vec![
                (0, r#"{"status":"pulling","total":1000,"completed":0}"#.to_string() + "\n"),
                (50, r#"{"status":"pulling","total":1000,"completed":400}"#.to_string() + "\n"),
                (0, r#"{"status":"pulling","total":1000,"completed":1000}"#.to_string() + "\n"),
                (0, r#"{"status":"success"}"#.to_string() + "\n"),
            ],
            0,
            0,
        )
        .await;

        let mut events = Vec::new();
        let result = run_pull(
            &base,
            "gemma3n:e2b",
            Duration::from_secs(5),
            STOP_POLL,
            |event| events.push(event),
        )
        .await;

        assert!(result.is_ok(), "pull should complete: {result:?}");
        assert_eq!(
            events,
            vec![
                PullEvent::Progress(PullProgress {
                    status: "pulling".into(),
                    total: Some(1000),
                    completed: 0,
                    percent: Some(0)
                }),
                PullEvent::Progress(PullProgress {
                    status: "pulling".into(),
                    total: Some(1000),
                    completed: 400,
                    percent: Some(40)
                }),
                PullEvent::Progress(PullProgress {
                    status: "pulling".into(),
                    total: Some(1000),
                    completed: 1000,
                    percent: Some(100)
                }),
                PullEvent::Progress(PullProgress {
                    status: "success".into(),
                    total: Some(1000),
                    completed: 1000,
                    percent: Some(100)
                }),
            ]
        );
    }

    #[tokio::test]
    async fn pull_can_be_cancelled() {
        let base = spawn_stream_server(
            vec![(20, r#"{"status":"pulling","total":1000,"completed":100}"#.to_string() + "\n")],
            30_000,
            0,
        )
        .await;

        let handle = tokio::spawn(async move {
            run_pull(&base, "gemma3n:e2b", Duration::from_secs(5), STOP_POLL, |_| {}).await
        });

        // Let the first progress line arrive, then cancel.
        for _ in 0..60 {
            tokio::time::sleep(Duration::from_millis(10)).await;
        }
        handle.abort();

        let waited = tokio::time::timeout(Duration::from_secs(2), handle)
            .await
            .expect("cancelled pull task did not end");
        assert!(waited.is_err(), "aborted pull should surface as an error");
    }

    #[tokio::test]
    async fn pull_times_out_when_ollama_never_replies() {
        let base = spawn_stream_server(Vec::new(), 30_000, 30_000).await;
        let started = Instant::now();
        let err = run_pull(
            &base,
            "gemma3n:e2b",
            Duration::from_millis(300),
            STOP_POLL,
            |_| {},
        )
        .await
        .unwrap_err();
        assert_eq!(err.kind, "Io");
        assert!(err.message.contains("timed out"), "{}", err.message);
        assert!(started.elapsed() < Duration::from_secs(2));
    }

    #[tokio::test]
    async fn pull_reports_ollama_error_lines() {
        let base =
            spawn_stream_server(vec![(0, "{\"error\":\"model not found\"}\n".into())], 0, 0).await;
        let mut saw_error_status = false;
        let err = run_pull(
            &base,
            "gemma3n:e2b",
            Duration::from_secs(5),
            STOP_POLL,
            |event| {
                if let PullEvent::Progress(p) = &event {
                    if p.status == "error" {
                        saw_error_status = true;
                    }
                }
            },
        )
        .await
        .unwrap_err();
        assert_eq!(err.kind, "Io");
        assert!(saw_error_status);
    }

    // ── install verification (2.7) ────────────────────────────────────

    /// Accepts one connection at a time; `/api/generate` and `/api/embeddings`
    /// each get their own canned NDJSON lines.
    async fn spawn_dual_server(
        gen_lines: Vec<(u64, String)>,
        emb_lines: Vec<(u64, String)>,
    ) -> String {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        tokio::spawn(async move {
            loop {
                let (mut socket, _) = listener.accept().await.unwrap();
                let gen_lines = gen_lines.clone();
                let emb_lines = emb_lines.clone();
                tokio::spawn(async move {
                    let mut request = [0u8; 8192];
                    let _ = socket.read(&mut request).await;
                    let text = String::from_utf8_lossy(&request);
                    let lines = if text.contains("/api/generate") {
                        gen_lines
                    } else if text.contains("/api/embeddings") {
                        emb_lines
                    } else {
                        Vec::new()
                    };
                    let mut body = String::new();
                    for (_, line) in &lines {
                        body.push_str(line);
                    }
                    socket
                        .write_all(
                            format!(
                                "HTTP/1.1 200 OK\r\nContent-Type: application/x-ndjson\r\nConnection: close\r\nContent-Length: {}\r\n\r\n{}",
                                body.len(),
                                body
                            )
                            .as_bytes(),
                        )
                        .await
                        .ok();
                    let _ = socket.shutdown().await;
                });
            }
        });
        format!("http://{addr}")
    }

    #[tokio::test]
    async fn verify_install_passes_when_generate_and_embeddings_succeed() {
        let base = spawn_dual_server(
            vec![(0, "{\"response\":\"pong\",\"done\":true}\n".into())],
            vec![(0, r#"{"embedding":[0.1,0.2]}"#.into())],
        )
        .await;
        let result = verify_install(
            &base,
            "gemma3n:e2b",
            Duration::from_secs(5),
            STOP_POLL,
        )
        .await;
        assert!(result.is_ok(), "verify should succeed: {result:?}");
        let v = result.unwrap();
        assert!(v.generation_ok);
        assert!(v.embeddings_ok);
    }

    #[tokio::test]
    async fn verify_install_fails_when_generate_stalls() {
        let base = spawn_dual_server(vec![], vec![]).await;
        let started = Instant::now();
        let err = verify_install(
            &base,
            "gemma3n:e2b",
            Duration::from_millis(300),
            STOP_POLL,
        )
        .await
        .unwrap_err();
        assert_eq!(err.kind, "Io");
        assert!(started.elapsed() < Duration::from_secs(2));
    }

    #[tokio::test]
    async fn verify_install_reports_embeddings_ok_false_when_embeddings_model_missing() {
        let base = spawn_dual_server(
            vec![(0, "{\"response\":\"pong\",\"done\":true}\n".into())],
            vec![(0, "{\"error\":\"model not found\"}\n".into())],
        )
        .await;
        let result = verify_install(
            &base,
            "gemma3n:e2b",
            Duration::from_secs(5),
            STOP_POLL,
        )
        .await
        .unwrap();
        assert!(result.generation_ok);
        assert!(!result.embeddings_ok);
    }
}
