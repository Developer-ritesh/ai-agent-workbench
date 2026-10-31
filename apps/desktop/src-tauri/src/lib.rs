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
    let pty_manager = commands::PtyManager::new();
    let network_tracker = commands::NetworkTracker::new();
    let port_manager = commands::PortManager::new();
    let browser_manager = commands::BrowserEngineManager::new();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(workspace_manager)
        .manage(pty_manager)
        .manage(network_tracker)
        .manage(port_manager)
        .manage(browser_manager)
        .invoke_handler(tauri::generate_handler![
            commands::workspace_create,
            commands::workspace_list,
            commands::workspace_get,
            commands::workspace_delete,
            commands::vm_start,
            commands::vm_stop,
            commands::vm_status,
            commands::vm_rotate,
            commands::system_get_host_info,
            commands::drag_window,
            commands::toggle_maximize_window,
            commands::terminal_execute,
            commands::agent_get_version,
            commands::agent_start_task,
            commands::agent_stop_task,
            commands::agent_list_sessions,
            commands::provider_list,
            commands::provider_save,
            commands::provider_delete,
            commands::fs_read_dir,
            commands::fs_read_file,
            commands::fs_write_file,
            commands::fs_create_file,
            commands::fs_create_dir,
            commands::fs_delete,
            commands::fs_rename,
            commands::fs_search,
            commands::git_status,
            commands::git_commit,
            commands::git_log,
            commands::git_init,
            commands::opencode_clear_sessions,
            commands::opencode_clear_global_history,
            commands::opencode_clear_cache,
            commands::dialog_open_folder,
            commands::pty_spawn,
            commands::pty_write,
            commands::pty_resize,
            commands::pty_kill,
            commands::network_get_stats,
            commands::network_retry_connection,
            commands::network_run_speed_test,
            commands::ports_list,
            commands::ports_forward_create,
            commands::ports_forward_remove,
            commands::ports_check_availability,
            commands::api_execute_request,
            commands::api_parse_curl,
            commands::browser_engine_status,
            commands::browser_engine_launch,
            commands::browser_engine_terminate,
            commands::browser_cdp_list_tabs,
            commands::browser_cdp_new_tab,
            commands::browser_cdp_close_tab,
            commands::browser_cdp_eval,
            commands::opencode_get_mcp_config,
            commands::opencode_toggle_mcp_server,
            commands::opencode_save_mcp_server,
            commands::opencode_delete_mcp_server,
            commands::opencode_list_skills,
            commands::opencode_get_skill_content,
            commands::opencode_sync_from_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
