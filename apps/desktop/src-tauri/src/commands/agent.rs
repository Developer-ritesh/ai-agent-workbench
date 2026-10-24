use tauri::State;
use crate::persistence::models::AgentSessionRecord;
use crate::workspace::manager::WorkspaceManager;

#[tauri::command]
pub fn agent_get_version(manager: State<'_, WorkspaceManager>) -> Result<String, String> {
    manager.get_opencode_version().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn agent_start_task(
    manager: State<'_, WorkspaceManager>,
    workspace_id: String,
    prompt: String,
    provider_profile_id: Option<String>,
    model_id: Option<String>,
) -> Result<AgentSessionRecord, String> {
    manager
        .start_agent_task(
            &workspace_id,
            &prompt,
            provider_profile_id.as_deref(),
            model_id.as_deref(),
        )
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn agent_stop_task(
    manager: State<'_, WorkspaceManager>,
    session_id: String,
) -> Result<(), String> {
    manager.stop_agent_task(&session_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn agent_list_sessions(
    manager: State<'_, WorkspaceManager>,
    workspace_id: String,
) -> Result<Vec<AgentSessionRecord>, String> {
    manager.list_agent_sessions(&workspace_id).map_err(|e| e.to_string())
}
