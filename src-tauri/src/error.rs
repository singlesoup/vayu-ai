// The single error shape the frontend understands (see src/lib/api.ts):
// serde-tagged `{ kind, message }` with the exact ApiError kind strings.
use serde::Serialize;

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct VayuError {
    pub kind: String,
    pub message: String,
}

impl VayuError {
    pub fn new(kind: &str, message: impl Into<String>) -> Self {
        Self {
            kind: kind.to_string(),
            message: message.into(),
        }
    }

    pub fn invalid_date(message: impl Into<String>) -> Self {
        Self::new("InvalidDate", message)
    }

    pub fn not_a_directory(message: impl Into<String>) -> Self {
        Self::new("NotADirectory", message)
    }

    pub fn io(message: impl Into<String>) -> Self {
        Self::new("Io", message)
    }

    pub fn busy() -> Self {
        Self::new("Busy", "A reply is already running.")
    }

    pub fn no_model(message: impl Into<String>) -> Self {
        Self::new("NoModel", message)
    }

    pub fn other(message: impl Into<String>) -> Self {
        Self::new("Other", message)
    }
}

impl std::fmt::Display for VayuError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}: {}", self.kind, self.message)
    }
}

impl std::error::Error for VayuError {}

impl From<std::io::Error> for VayuError {
    fn from(err: std::io::Error) -> Self {
        Self::io(err.to_string())
    }
}
