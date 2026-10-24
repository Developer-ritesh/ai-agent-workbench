use tauri::State;
use serde::{Deserialize, Serialize};

use crate::persistence::models::{VmConfig, WorkspaceRecord};
use crate::workspace::manager::WorkspaceManager;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateWorkspaceInput {
    pub name: String,
    pub host_project_path: String,
    pub cpu_count: Option<u32>,
    pub memory_mb: Option<u32>,
    pub disk_size_gb: Option<u32>,
    pub network_mode: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalExecResult {
    pub exit_code: i32,
    pub stdout: String,
    pub stderr: String,
}

#[tauri::command]
pub fn workspace_create(
    manager: State<'_, WorkspaceManager>,
    input: CreateWorkspaceInput,
) -> Result<WorkspaceRecord, String> {
    let mut config = VmConfig::default();
    if let Some(cpus) = input.cpu_count {
        config.cpu_count = cpus;
    }
    if let Some(mem) = input.memory_mb {
        config.memory_mb = mem;
    }
    if let Some(disk) = input.disk_size_gb {
        config.disk_size_gb = disk;
    }
    if let Some(net) = input.network_mode {
        config.network_mode = net;
    }

    manager
        .create_workspace(&input.name, &input.host_project_path, Some(config))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn workspace_list(manager: State<'_, WorkspaceManager>) -> Result<Vec<WorkspaceRecord>, String> {
    manager.list_workspaces().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn workspace_get(manager: State<'_, WorkspaceManager>, id: String) -> Result<WorkspaceRecord, String> {
    manager.get_workspace(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn workspace_delete(manager: State<'_, WorkspaceManager>, id: String) -> Result<(), String> {
    manager.delete_workspace(&id).map_err(|e| e.to_string())
}
