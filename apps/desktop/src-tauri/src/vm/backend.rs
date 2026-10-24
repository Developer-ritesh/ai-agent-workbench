use serde::{Deserialize, Serialize};
use crate::error::WorkbenchError;
use crate::persistence::models::VmConfig;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VmStatusResponse {
    pub vm_id: String,
    pub state: String, // "stopped", "starting", "running", "stopping", "error"
    pub ip_address: Option<String>,
    pub pid: Option<u32>,
    pub memory_usage_mb: Option<u32>,
    pub cpu_percent: Option<f32>,
    pub active_mounts: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VmInstance {
    pub vm_id: String,
    pub name: String,
    pub status: String,
    pub pid: Option<u32>,
    pub ip_address: Option<String>,
    pub restful_uri: Option<String>,
    pub project_path: String,
    pub config: VmConfig,
}

pub trait VmBackend: Send + Sync {
    fn create_vm(&self, vm_id: &str, name: &str, project_path: &str, config: &VmConfig) -> Result<VmInstance, WorkbenchError>;
    fn start_vm(&self, vm: &mut VmInstance) -> Result<(), WorkbenchError>;
    fn stop_vm(&self, vm: &mut VmInstance) -> Result<(), WorkbenchError>;
    fn get_status(&self, vm: &VmInstance) -> Result<VmStatusResponse, WorkbenchError>;
    fn execute_command(&self, vm: &VmInstance, cmd: &str) -> Result<(i32, String, String), WorkbenchError>;
}
