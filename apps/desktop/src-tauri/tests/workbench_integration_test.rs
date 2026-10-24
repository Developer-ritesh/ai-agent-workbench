use std::fs;
use std::path::PathBuf;
use workbench_lib::persistence::models::{VmConfig, WorkspaceRecord};
use workbench_lib::persistence::db::DatabaseManager;
use workbench_lib::security::path_validator::PathValidator;
use workbench_lib::agent::supervisor::AgentSupervisor;
use workbench_lib::vm::backend::VmBackend;
use workbench_lib::vm::vfkit_backend::VfkitBackend;
use workbench_lib::credentials::keychain::KeychainManager;

#[test]
fn test_end_to_end_workbench_slice() {
    // 1. Setup temporary isolated project directory
    let temp_dir = std::env::temp_dir().join(format!("workbench-test-{}", uuid::Uuid::new_v4()));
    fs::create_dir_all(&temp_dir).expect("Failed to create temp project dir");
    let test_file = temp_dir.join("main.py");
    fs::write(&test_file, "print('Hello from isolated VM workspace!')").expect("Failed to write test file");

    // 2. Validate PathValidator boundary rules
    let validated_path = PathValidator::validate_project_path(temp_dir.to_str().unwrap())
        .expect("Project path validation failed");
    assert!(validated_path.is_dir());

    // Verify traversal attempt outside project root is rejected
    let outside_path = PathBuf::from("/etc/passwd");
    assert!(PathValidator::ensure_within_root(&outside_path, &temp_dir).is_err());

    // 3. Test In-Memory Database Persistence
    let db_path = temp_dir.join("test.db");
    let db = DatabaseManager::new(&db_path).expect("Database initialization failed");

    let ws_id = format!("ws-{}", &uuid::Uuid::new_v4().to_string()[..8]);
    let ws = WorkspaceRecord {
        id: ws_id.clone(),
        name: "E2E Test Workspace".to_string(),
        host_project_path: temp_dir.to_string_lossy().to_string(),
        vm_id: format!("vm-{}", &ws_id),
        image_id: "ubuntu-24.04-arm64".to_string(),
        config: VmConfig::default(),
        status: "stopped".to_string(),
        created_at: chrono::Utc::now().to_rfc3339(),
        updated_at: chrono::Utc::now().to_rfc3339(),
    };

    db.create_workspace(&ws).expect("Failed to create workspace record");
    let list = db.list_workspaces().expect("Failed to list workspaces");
    assert_eq!(list.len(), 1);
    assert_eq!(list[0].id, ws_id);

    // 4. Test Keychain Provider Storage
    let cred_ref = format!("test-cred-{}", &ws_id);
    let secret = "sk-ant-test-secret-key-12345";
    let _ = KeychainManager::store_secret(&cred_ref, secret);
    if let Ok(retrieved) = KeychainManager::get_secret(&cred_ref) {
        assert_eq!(retrieved, secret);
        let _ = KeychainManager::delete_secret(&cred_ref);
    }

    // 5. Test OpenCode CLI Supervisor Discovery
    let supervisor = AgentSupervisor::new();
    let version_result = supervisor.get_version();
    println!("OpenCode version check result: {:?}", version_result);
    // If opencode is installed on the machine, it returns the real version
    if let Ok(version_str) = version_result {
        assert!(version_str.contains("opencode"));
    }

    // 6. Test VM Backend Abstraction (VfkitBackend)
    let backend = VfkitBackend::new();
    let vm = backend.create_vm(&ws.vm_id, &ws.name, temp_dir.to_str().unwrap(), &ws.config)
        .expect("Failed to create VM instance");
    assert_eq!(vm.status, "stopped");

    // Test command execution scoped to the project directory
    let (code, stdout, _stderr) = backend.execute_command(&vm, "ls -1")
        .expect("Command execution failed");
    assert_eq!(code, 0);
    assert!(stdout.contains("main.py"));

    // 7. Verify status reporting
    let status = backend.get_status(&vm).expect("Failed to get VM status");
    assert_eq!(status.vm_id, ws.vm_id);

    // 8. Cleanup
    db.delete_workspace(&ws_id).expect("Failed to delete workspace record");
    let _ = fs::remove_dir_all(&temp_dir);
}
