use tauri::State;
use serde::Deserialize;
use crate::persistence::models::ProviderProfileRecord;
use crate::workspace::manager::WorkspaceManager;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveProviderInput {
    pub id: Option<String>,
    pub name: String,
    pub provider_id: String,
    pub default_model: String,
    pub api_endpoint: Option<String>,
    pub api_key: Option<String>,
}

#[tauri::command]
pub fn provider_list(manager: State<'_, WorkspaceManager>) -> Result<Vec<ProviderProfileRecord>, String> {
    manager.list_providers().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn provider_save(
    manager: State<'_, WorkspaceManager>,
    input: SaveProviderInput,
) -> Result<ProviderProfileRecord, String> {
    manager
        .save_provider(
            input.id.as_deref(),
            &input.name,
            &input.provider_id,
            &input.default_model,
            input.api_endpoint.as_deref(),
            input.api_key.as_deref(),
        )
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn provider_delete(
    manager: State<'_, WorkspaceManager>,
    id: String,
) -> Result<(), String> {
    manager.delete_provider(&id).map_err(|e| e.to_string())
}
