pub mod error;
pub mod security;
pub mod persistence;
pub mod credentials;
pub mod vm;
pub mod agent;
pub mod workspace;
pub mod commands;

use workspace::manager::WorkspaceManager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let workspace_manager = match WorkspaceManager::new() {
        Ok(mgr) => mgr,
        Err(e) => {
            eprintln!("Failed to initialize WorkspaceManager: {}", e);
            panic!("Cannot start Workbench: {}", e);
        }
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(workspace_manager)
        .invoke_handler(tauri::generate_handler![
            commands::workspace_create,
            commands::workspace_list,
            commands::workspace_get,
            commands::workspace_delete,
            commands::vm_start,
            commands::vm_stop,
            commands::vm_status,
            commands::terminal_execute,
            commands::agent_get_version,
            commands::agent_start_task,
            commands::agent_stop_task,
            commands::agent_list_sessions,
            commands::provider_list,
            commands::provider_save,
            commands::provider_delete
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
