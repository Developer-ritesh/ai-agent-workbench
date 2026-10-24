use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use chrono::Utc;
use rusqlite::{params, Connection};
use uuid::Uuid;

use crate::error::WorkbenchError;
use crate::persistence::models::{
    AgentSessionRecord, ProviderProfileRecord, VmConfig, WorkspaceRecord,
};

pub struct DatabaseManager {
    conn: Mutex<Connection>,
}

impl DatabaseManager {
    pub fn new_default() -> Result<Self, WorkbenchError> {
        let app_dir = dirs::home_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join(".ai-agent-workbench");
        fs::create_dir_all(&app_dir)?;
        let db_path = app_dir.join("workbench.db");
        Self::new(&db_path)
    }

    pub fn new(path: &PathBuf) -> Result<Self, WorkbenchError> {
        let conn = Connection::open(path)?;
        let manager = Self {
            conn: Mutex::new(conn),
        };
        manager.init_schema()?;
        Ok(manager)
    }

    fn init_schema(&self) -> Result<(), WorkbenchError> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS workspaces (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                host_project_path TEXT NOT NULL,
                vm_id TEXT NOT NULL,
                image_id TEXT NOT NULL,
                config_json TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS agent_sessions (
                id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL,
                provider_profile_id TEXT,
                model_id TEXT NOT NULL,
                guest_process_id TEXT,
                state TEXT NOT NULL,
                exit_code INTEGER,
                started_at TEXT NOT NULL,
                ended_at TEXT,
                task_prompt TEXT,
                FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS provider_profiles (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                provider_id TEXT NOT NULL,
                credential_ref TEXT NOT NULL,
                default_model TEXT NOT NULL,
                api_endpoint TEXT,
                enabled BOOLEAN NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS audit_events (
                id TEXT PRIMARY KEY,
                workspace_id TEXT,
                event_type TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            ",
        )?;
        Ok(())
    }

    // --- Workspaces ---

    pub fn list_workspaces(&self) -> Result<Vec<WorkspaceRecord>, WorkbenchError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, host_project_path, vm_id, image_id, config_json, status, created_at, updated_at
             FROM workspaces ORDER BY updated_at DESC",
        )?;

        let rows = stmt.query_map([], |row| {
            let config_json: String = row.get(5)?;
            let config: VmConfig = serde_json::from_str(&config_json).unwrap_or_default();
            Ok(WorkspaceRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                host_project_path: row.get(2)?,
                vm_id: row.get(3)?,
                image_id: row.get(4)?,
                config,
                status: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })?;

        let mut list = Vec::new();
        for r in rows {
            list.push(r?);
        }
        Ok(list)
    }

    pub fn get_workspace(&self, id: &str) -> Result<WorkspaceRecord, WorkbenchError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, host_project_path, vm_id, image_id, config_json, status, created_at, updated_at
             FROM workspaces WHERE id = ?1",
        )?;

        let mut rows = stmt.query_map(params![id], |row| {
            let config_json: String = row.get(5)?;
            let config: VmConfig = serde_json::from_str(&config_json).unwrap_or_default();
            Ok(WorkspaceRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                host_project_path: row.get(2)?,
                vm_id: row.get(3)?,
                image_id: row.get(4)?,
                config,
                status: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })?;

        if let Some(record) = rows.next() {
            Ok(record?)
        } else {
            Err(WorkbenchError::NotFound(format!("Workspace {} not found", id)))
        }
    }

    pub fn create_workspace(&self, record: &WorkspaceRecord) -> Result<(), WorkbenchError> {
        let conn = self.conn.lock().unwrap();
        let config_json = serde_json::to_string(&record.config)?;
        conn.execute(
            "INSERT INTO workspaces (id, name, host_project_path, vm_id, image_id, config_json, status, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                record.id,
                record.name,
                record.host_project_path,
                record.vm_id,
                record.image_id,
                config_json,
                record.status,
                record.created_at,
                record.updated_at
            ],
        )?;
        Ok(())
    }

    pub fn update_workspace_status(&self, id: &str, status: &str) -> Result<(), WorkbenchError> {
        let conn = self.conn.lock().unwrap();
        let now = Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE workspaces SET status = ?1, updated_at = ?2 WHERE id = ?3",
            params![status, now, id],
        )?;
        Ok(())
    }

    pub fn delete_workspace(&self, id: &str) -> Result<(), WorkbenchError> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM workspaces WHERE id = ?1", params![id])?;
        Ok(())
    }

    // --- Provider Profiles ---

    pub fn list_providers(&self) -> Result<Vec<ProviderProfileRecord>, WorkbenchError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, provider_id, credential_ref, default_model, api_endpoint, enabled, created_at
             FROM provider_profiles ORDER BY name ASC",
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(ProviderProfileRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                provider_id: row.get(2)?,
                credential_ref: row.get(3)?,
                default_model: row.get(4)?,
                api_endpoint: row.get(5)?,
                enabled: row.get(6)?,
                created_at: row.get(7)?,
            })
        })?;

        let mut list = Vec::new();
        for r in rows {
            list.push(r?);
        }
        Ok(list)
    }

    pub fn save_provider(&self, record: &ProviderProfileRecord) -> Result<(), WorkbenchError> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO provider_profiles (id, name, provider_id, credential_ref, default_model, api_endpoint, enabled, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
             ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                provider_id = excluded.provider_id,
                credential_ref = excluded.credential_ref,
                default_model = excluded.default_model,
                api_endpoint = excluded.api_endpoint,
                enabled = excluded.enabled",
            params![
                record.id,
                record.name,
                record.provider_id,
                record.credential_ref,
                record.default_model,
                record.api_endpoint,
                record.enabled,
                record.created_at
            ],
        )?;
        Ok(())
    }

    pub fn delete_provider(&self, id: &str) -> Result<(), WorkbenchError> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM provider_profiles WHERE id = ?1", params![id])?;
        Ok(())
    }

    // --- Agent Sessions ---

    pub fn list_sessions(&self, workspace_id: &str) -> Result<Vec<AgentSessionRecord>, WorkbenchError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, workspace_id, provider_profile_id, model_id, guest_process_id, state, exit_code, started_at, ended_at, task_prompt
             FROM agent_sessions WHERE workspace_id = ?1 ORDER BY started_at DESC",
        )?;

        let rows = stmt.query_map(params![workspace_id], |row| {
            Ok(AgentSessionRecord {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                provider_profile_id: row.get(2)?,
                model_id: row.get(3)?,
                guest_process_id: row.get(4)?,
                state: row.get(5)?,
                exit_code: row.get(6)?,
                started_at: row.get(7)?,
                ended_at: row.get(8)?,
                task_prompt: row.get(9)?,
            })
        })?;

        let mut list = Vec::new();
        for r in rows {
            list.push(r?);
        }
        Ok(list)
    }

    pub fn create_session(&self, record: &AgentSessionRecord) -> Result<(), WorkbenchError> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO agent_sessions (id, workspace_id, provider_profile_id, model_id, guest_process_id, state, exit_code, started_at, ended_at, task_prompt)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                record.id,
                record.workspace_id,
                record.provider_profile_id,
                record.model_id,
                record.guest_process_id,
                record.state,
                record.exit_code,
                record.started_at,
                record.ended_at,
                record.task_prompt
            ],
        )?;
        Ok(())
    }

    pub fn update_session_state(&self, id: &str, state: &str, exit_code: Option<i32>) -> Result<(), WorkbenchError> {
        let conn = self.conn.lock().unwrap();
        let ended_at = Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE agent_sessions SET state = ?1, exit_code = ?2, ended_at = ?3 WHERE id = ?4",
            params![state, exit_code, ended_at, id],
        )?;
        Ok(())
    }

    // --- Audit Events ---

    pub fn record_audit_event(&self, workspace_id: Option<&str>, event_type: &str, payload: &str) -> Result<(), WorkbenchError> {
        let conn = self.conn.lock().unwrap();
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO audit_events (id, workspace_id, event_type, payload_json, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![id, workspace_id, event_type, payload, now],
        )?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sqlite_in_memory_crud() {
        let conn = Connection::open_in_memory().unwrap();
        let manager = DatabaseManager {
            conn: Mutex::new(conn),
        };
        manager.init_schema().unwrap();

        let ws = WorkspaceRecord {
            id: "ws-123".to_string(),
            name: "Test Project".to_string(),
            host_project_path: "/tmp/test-project".to_string(),
            vm_id: "vm-123".to_string(),
            image_id: "ubuntu-24.04".to_string(),
            config: VmConfig::default(),
            status: "stopped".to_string(),
            created_at: "2026-10-24T18:00:00Z".to_string(),
            updated_at: "2026-10-24T18:00:00Z".to_string(),
        };

        manager.create_workspace(&ws).unwrap();
        let list = manager.list_workspaces().unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].name, "Test Project");

        manager.update_workspace_status("ws-123", "running").unwrap();
        let fetched = manager.get_workspace("ws-123").unwrap();
        assert_eq!(fetched.status, "running");

        manager.delete_workspace("ws-123").unwrap();
        let empty_list = manager.list_workspaces().unwrap();
        assert_eq!(empty_list.len(), 0);
    }
}
