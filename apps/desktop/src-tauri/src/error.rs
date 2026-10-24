use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error, Serialize)]
pub enum WorkbenchError {
    #[error("Database error: {0}")]
    Database(String),

    #[error("VM error: {0}")]
    Vm(String),

    #[error("Agent error: {0}")]
    Agent(String),

    #[error("Security violation: {0}")]
    Security(String),

    #[error("Credential error: {0}")]
    Credential(String),

    #[error("Workspace error: {0}")]
    Workspace(String),

    #[error("IO error: {0}")]
    Io(String),

    #[error("Not found: {0}")]
    NotFound(String),
}

impl From<rusqlite::Error> for WorkbenchError {
    fn from(err: rusqlite::Error) -> Self {
        WorkbenchError::Database(err.to_string())
    }
}

impl From<std::io::Error> for WorkbenchError {
    fn from(err: std::io::Error) -> Self {
        WorkbenchError::Io(err.to_string())
    }
}

impl From<serde_json::Error> for WorkbenchError {
    fn from(err: serde_json::Error) -> Self {
        WorkbenchError::Workspace(format!("Serialization error: {}", err))
    }
}
