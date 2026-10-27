use std::collections::HashMap;
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;

use crate::error::WorkbenchError;

pub struct AgentSupervisor {
    opencode_path: PathBuf,
    active_sessions: Mutex<HashMap<String, Child>>,
}

impl AgentSupervisor {
    pub fn new() -> Self {
        let opencode_path = Self::find_opencode();
        Self {
            opencode_path,
            active_sessions: Mutex::new(HashMap::new()),
        }
    }

    fn find_opencode() -> PathBuf {
        if let Some(home) = dirs::home_dir() {
            let devai_bin = home.join(".opencode").join("bin").join("devai");
            if devai_bin.exists() {
                return devai_bin;
            }
            let user_bin = home.join(".opencode").join("bin").join("opencode");
            if user_bin.exists() {
                return user_bin;
            }
        }

        if let Ok(path) = std::env::var("PATH") {
            for p in path.split(':') {
                let devai_candidate = PathBuf::from(p).join("devai");
                if devai_candidate.is_file() {
                    return devai_candidate;
                }
                let candidate = PathBuf::from(p).join("opencode");
                if candidate.is_file() {
                    return candidate;
                }
            }
        }

        PathBuf::from("opencode")
    }

    pub fn get_version(&self) -> Result<String, WorkbenchError> {
        let output = Command::new(&self.opencode_path)
            .arg("--version")
            .output()
            .map_err(|e| WorkbenchError::Agent(format!("Failed to execute Dev AI: {}", e)))?;

        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            Err(WorkbenchError::Agent(format!("Dev AI --version error: {}", stderr)))
        }
    }

    pub fn start_task(
        &self,
        session_id: &str,
        project_dir: &str,
        task_prompt: &str,
        _provider_credential: Option<&str>,
    ) -> Result<u32, WorkbenchError> {
        let mut cmd = Command::new(&self.opencode_path);
        cmd.current_dir(project_dir)
            .arg("run")
            .arg(task_prompt)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        // Spawn supervised agent process
        let child = cmd.spawn().map_err(|e| {
            WorkbenchError::Agent(format!("Failed to spawn Dev AI task: {}", e))
        })?;

        let pid = child.id();
        let mut sessions = self.active_sessions.lock().unwrap();
        sessions.insert(session_id.to_string(), child);

        Ok(pid)
    }

    pub fn stop_task(&self, session_id: &str) -> Result<(), WorkbenchError> {
        let mut sessions = self.active_sessions.lock().unwrap();
        if let Some(mut child) = sessions.remove(session_id) {
            let _ = child.kill();
        }
        Ok(())
    }
}
