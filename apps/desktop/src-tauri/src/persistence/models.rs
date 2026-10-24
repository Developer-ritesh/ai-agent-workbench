use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VmConfig {
    pub cpu_count: u32,
    pub memory_mb: u32,
    pub disk_size_gb: u32,
    pub network_mode: String, // "restricted" | "standard" | "disabled"
    pub shared_mount_tag: Option<String>,
}

impl Default for VmConfig {
    fn default() -> Self {
        Self {
            cpu_count: 2,
            memory_mb: 4096,
            disk_size_gb: 20,
            network_mode: "standard".to_string(),
            shared_mount_tag: Some("project".to_string()),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceRecord {
    pub id: String,
    pub name: String,
    pub host_project_path: String,
    pub vm_id: String,
    pub image_id: String,
    pub config: VmConfig,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentSessionRecord {
    pub id: String,
    pub workspace_id: String,
    pub provider_profile_id: Option<String>,
    pub model_id: String,
    pub guest_process_id: Option<String>,
    pub state: String,
    pub exit_code: Option<i32>,
    pub started_at: String,
    pub ended_at: Option<String>,
    pub task_prompt: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderProfileRecord {
    pub id: String,
    pub name: String,
    pub provider_id: String,
    pub credential_ref: String,
    pub default_model: String,
    pub api_endpoint: Option<String>,
    pub enabled: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditEventRecord {
    pub id: String,
    pub workspace_id: Option<String>,
    pub event_type: String,
    pub payload_json: String,
    pub created_at: String,
}
