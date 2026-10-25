use tauri::State;
use crate::commands::workspace::TerminalExecResult;
use crate::vm::backend::VmStatusResponse;
use crate::workspace::manager::WorkspaceManager;

#[tauri::command]
pub fn vm_start(
    manager: State<'_, WorkspaceManager>,
    workspace_id: String,
) -> Result<VmStatusResponse, String> {
    manager.start_vm(&workspace_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn vm_stop(
    manager: State<'_, WorkspaceManager>,
    workspace_id: String,
) -> Result<(), String> {
    manager.stop_vm(&workspace_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn vm_status(
    manager: State<'_, WorkspaceManager>,
    workspace_id: String,
) -> Result<VmStatusResponse, String> {
    manager.get_vm_status(&workspace_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn vm_rotate(
    manager: State<'_, WorkspaceManager>,
    workspace_id: String,
) -> Result<VmStatusResponse, String> {
    manager.rotate_vm(&workspace_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn drag_window(window: tauri::Window) -> Result<(), String> {
    window.start_dragging().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn toggle_maximize_window(window: tauri::Window) -> Result<(), String> {
    let is_maximized = window.is_maximized().map_err(|e| e.to_string())?;
    if is_maximized {
        window.unmaximize().map_err(|e| e.to_string())?;
    } else {
        window.maximize().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn terminal_execute(
    manager: State<'_, WorkspaceManager>,
    workspace_id: String,
    command: String,
) -> Result<TerminalExecResult, String> {
    let (code, stdout, stderr) = manager
        .execute_terminal_command(&workspace_id, &command)
        .map_err(|e| e.to_string())?;

    Ok(TerminalExecResult {
        exit_code: code,
        stdout,
        stderr,
    })
}
