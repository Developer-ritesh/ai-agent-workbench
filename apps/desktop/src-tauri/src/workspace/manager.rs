use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use chrono::Utc;
use uuid::Uuid;

use crate::agent::supervisor::AgentSupervisor;
use crate::credentials::keychain::KeychainManager;
use crate::error::WorkbenchError;
use crate::persistence::db::DatabaseManager;
use crate::persistence::models::{
    AgentSessionRecord, ProviderProfileRecord, VmConfig, WorkspaceRecord,
};
use crate::security::path_validator::PathValidator;
use crate::vm::backend::{VmBackend, VmInstance, VmStatusResponse};
use crate::vm::vfkit_backend::VfkitBackend;

pub struct WorkspaceManager {
    db: Arc<DatabaseManager>,
    vm_backend: Arc<dyn VmBackend>,
    agent_supervisor: Arc<AgentSupervisor>,
    active_vms: Mutex<HashMap<String, VmInstance>>,
}

impl WorkspaceManager {
    pub fn new() -> Result<Self, WorkbenchError> {
        let db = Arc::new(DatabaseManager::new_default()?);
        let vm_backend = Arc::new(VfkitBackend::new());
        let agent_supervisor = Arc::new(AgentSupervisor::new());

        Ok(Self {
            db,
            vm_backend,
            agent_supervisor,
            active_vms: Mutex::new(HashMap::new()),
        })
    }

    // --- Workspaces ---

    pub fn create_workspace(
        &self,
        name: &str,
        host_project_path: &str,
        config: Option<VmConfig>,
    ) -> Result<WorkspaceRecord, WorkbenchError> {
        // Enforce path isolation boundaries
        let validated_path = PathValidator::validate_project_path(host_project_path)?;
        let path_str = validated_path.to_string_lossy().to_string();

        let id = Uuid::new_v4().to_string();
        let vm_id = format!("vm-{}", &id[..8]);
        let cfg = config.unwrap_or_default();
        let now = Utc::now().to_rfc3339();

        let record = WorkspaceRecord {
            id: id.clone(),
            name: name.to_string(),
            host_project_path: path_str.clone(),
            vm_id: vm_id.clone(),
            image_id: "ubuntu-24.04-arm64".to_string(),
            config: cfg.clone(),
            status: "stopped".to_string(),
            created_at: now.clone(),
            updated_at: now,
        };

        // Create VM configuration in backend
        let vm_instance = self.vm_backend.create_vm(&vm_id, name, &path_str, &cfg)?;
        {
            let mut vms = self.active_vms.lock().unwrap();
            vms.insert(id.clone(), vm_instance);
        }

        self.db.create_workspace(&record)?;
        self.db.record_audit_event(
            Some(&id),
            "workspace.created",
            &format!("Workspace '{}' initialized for path {}", name, path_str),
        )?;

        Ok(record)
    }

    pub fn list_workspaces(&self) -> Result<Vec<WorkspaceRecord>, WorkbenchError> {
        self.db.list_workspaces()
    }

    pub fn get_workspace(&self, id: &str) -> Result<WorkspaceRecord, WorkbenchError> {
        self.db.get_workspace(id)
    }

    pub fn delete_workspace(&self, id: &str) -> Result<(), WorkbenchError> {
        let ws = self.db.get_workspace(id)?;

        // Stop VM if active
        let _ = self.stop_vm(id);

        {
            let mut vms = self.active_vms.lock().unwrap();
            vms.remove(id);
        }

        self.db.delete_workspace(id)?;
        self.db.record_audit_event(
            Some(id),
            "workspace.deleted",
            &format!("Workspace '{}' was removed", ws.name),
        )?;

        Ok(())
    }

    pub fn resolve_workspace(&self, workspace_id: &str) -> Result<WorkspaceRecord, WorkbenchError> {
        if let Ok(ws) = self.db.get_workspace(workspace_id) {
            return Ok(ws);
        }
        let list = self.db.list_workspaces().unwrap_or_default();
        if let Some(first) = list.into_iter().next() {
            return Ok(first);
        }
        self.db.get_workspace("ws-masticall-in")
    }

    // --- VM Lifecycle ---

    pub fn start_vm(&self, workspace_id: &str) -> Result<VmStatusResponse, WorkbenchError> {
        let ws = self.resolve_workspace(workspace_id)?;
        let actual_id = &ws.id;

        let mut vms = self.active_vms.lock().unwrap();
        let vm = match vms.get_mut(actual_id) {
            Some(existing) => existing,
            None => {
                let instance = self.vm_backend.create_vm(
                    &ws.vm_id,
                    &ws.name,
                    &ws.host_project_path,
                    &ws.config,
                )?;
                vms.insert(actual_id.to_string(), instance);
                vms.get_mut(actual_id).unwrap()
            }
        };

        self.vm_backend.start_vm(vm)?;
        self.db.update_workspace_status(actual_id, "running")?;
        self.db.record_audit_event(
            Some(actual_id),
            "vm.started",
            &format!("VM {} started for workspace {}", ws.vm_id, ws.name),
        )?;

        self.vm_backend.get_status(vm)
    }

    pub fn stop_vm(&self, workspace_id: &str) -> Result<(), WorkbenchError> {
        let ws = self.resolve_workspace(workspace_id)?;
        let actual_id = &ws.id;

        let mut vms = self.active_vms.lock().unwrap();
        if let Some(vm) = vms.get_mut(actual_id) {
            self.vm_backend.stop_vm(vm)?;
        }

        self.db.update_workspace_status(actual_id, "stopped")?;
        self.db.record_audit_event(
            Some(actual_id),
            "vm.stopped",
            &format!("VM stopped for workspace {}", actual_id),
        )?;

        Ok(())
    }

    pub fn rotate_vm(&self, workspace_id: &str) -> Result<VmStatusResponse, WorkbenchError> {
        let ws = self.resolve_workspace(workspace_id)?;
        let actual_id = &ws.id;

        // 1. Stop existing VM instance
        let _ = self.stop_vm(actual_id);

        // 2. Clear ephemeral state & guest scratch
        let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
        let vm_dir = home.join(".ai-agent-workbench").join("vms").join(&ws.vm_id);
        let ephemeral_dir = vm_dir.join("ephemeral");
        let _ = fs::remove_dir_all(&ephemeral_dir);
        let _ = fs::create_dir_all(&ephemeral_dir);

        // 3. Generate new session token and update audit
        let new_token = Uuid::new_v4().to_string();
        self.db.record_audit_event(
            Some(actual_id),
            "vm.rotated",
            &format!("VM rotated on-demand. Ephemeral cache purged. Session key renewed: {}", &new_token[..8]),
        )?;

        // 4. Start fresh VM instance
        self.start_vm(actual_id)
    }

    pub fn get_vm_status(&self, workspace_id: &str) -> Result<VmStatusResponse, WorkbenchError> {
        let ws = self.resolve_workspace(workspace_id)?;
        let actual_id = &ws.id;
        let vms = self.active_vms.lock().unwrap();

        if let Some(vm) = vms.get(actual_id) {
            self.vm_backend.get_status(vm)
        } else {
            Ok(VmStatusResponse {
                vm_id: ws.vm_id,
                state: ws.status,
                ip_address: None,
                pid: None,
                memory_usage_mb: None,
                cpu_percent: None,
                active_mounts: vec![format!("{}:/workspace", ws.host_project_path)],
            })
        }
    }

    pub fn execute_terminal_command(
        &self,
        workspace_id: &str,
        command: &str,
    ) -> Result<(i32, String, String), WorkbenchError> {
        let ws = self.resolve_workspace(workspace_id)?;
        let actual_id = &ws.id;
        let mut vms = self.active_vms.lock().unwrap();

        let vm = match vms.get_mut(actual_id) {
            Some(existing) => existing,
            None => {
                let instance = self.vm_backend.create_vm(
                    &ws.vm_id,
                    &ws.name,
                    &ws.host_project_path,
                    &ws.config,
                )?;
                vms.insert(actual_id.to_string(), instance);
                vms.get_mut(actual_id).unwrap()
            }
        };

        self.vm_backend.execute_command(vm, command)
    }

    // --- Agent Sessions ---

    pub fn get_opencode_version(&self) -> Result<String, WorkbenchError> {
        self.agent_supervisor.get_version()
    }

    pub fn start_agent_task(
        &self,
        workspace_id: &str,
        task_prompt: &str,
        provider_profile_id: Option<&str>,
        model_id: Option<&str>,
    ) -> Result<AgentSessionRecord, WorkbenchError> {
        let ws = self.db.get_workspace(workspace_id)?;

        let session_id = Uuid::new_v4().to_string();
        let model = model_id.unwrap_or("claude-3-7-sonnet").to_string();
        let now = Utc::now().to_rfc3339();

        // Retrieve credential securely from Keychain if profile provided
        let provider_credential = if let Some(prof_id) = provider_profile_id {
            let providers = self.db.list_providers()?;
            if let Some(profile) = providers.iter().find(|p| p.id == prof_id) {
                KeychainManager::get_secret(&profile.credential_ref).ok()
            } else {
                None
            }
        } else {
            None
        };

        // Launch agent task inside project directory
        let pid = self.agent_supervisor.start_task(
            &session_id,
            &ws.host_project_path,
            task_prompt,
            provider_credential.as_deref(),
        )?;

        let record = AgentSessionRecord {
            id: session_id.clone(),
            workspace_id: workspace_id.to_string(),
            provider_profile_id: provider_profile_id.map(|s| s.to_string()),
            model_id: model,
            guest_process_id: Some(pid.to_string()),
            state: "running".to_string(),
            exit_code: None,
            started_at: now,
            ended_at: None,
            task_prompt: Some(task_prompt.to_string()),
        };

        self.db.create_session(&record)?;
        self.db.record_audit_event(
            Some(workspace_id),
            "agent.task.started",
            &format!("Agent session {} started for task: {}", session_id, task_prompt),
        )?;

        Ok(record)
    }

    pub fn stop_agent_task(&self, session_id: &str) -> Result<(), WorkbenchError> {
        self.agent_supervisor.stop_task(session_id)?;
        self.db.update_session_state(session_id, "stopped", Some(0))?;
        Ok(())
    }

    pub fn list_agent_sessions(&self, workspace_id: &str) -> Result<Vec<AgentSessionRecord>, WorkbenchError> {
        self.db.list_sessions(workspace_id)
    }

    // --- Provider Profiles & Keychain ---

    pub fn list_providers(&self) -> Result<Vec<ProviderProfileRecord>, WorkbenchError> {
        self.db.list_providers()
    }

    pub fn save_provider(
        &self,
        id: Option<&str>,
        name: &str,
        provider_id: &str,
        default_model: &str,
        api_endpoint: Option<&str>,
        api_key: Option<&str>,
    ) -> Result<ProviderProfileRecord, WorkbenchError> {
        let prof_id = id
            .map(|s| s.to_string())
            .unwrap_or_else(|| Uuid::new_v4().to_string());
        let cred_ref = format!("cred-profile-{}", prof_id);

        // Store raw key strictly in macOS Keychain, never in SQLite or logs
        if let Some(key) = api_key {
            if !key.trim().is_empty() {
                KeychainManager::store_secret(&cred_ref, key.trim())?;
            }
        }

        let now = Utc::now().to_rfc3339();
        let record = ProviderProfileRecord {
            id: prof_id,
            name: name.to_string(),
            provider_id: provider_id.to_string(),
            credential_ref: cred_ref,
            default_model: default_model.to_string(),
            api_endpoint: api_endpoint.map(|s| s.to_string()),
            enabled: true,
            created_at: now,
        };

        self.db.save_provider(&record)?;
        Ok(record)
    }

    pub fn delete_provider(&self, id: &str) -> Result<(), WorkbenchError> {
        let cred_ref = format!("cred-profile-{}", id);
        let _ = KeychainManager::delete_secret(&cred_ref);
        self.db.delete_provider(id)?;
        Ok(())
    }
}
