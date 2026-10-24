use std::path::{Path, PathBuf};
use crate::error::WorkbenchError;

pub struct PathValidator;

impl PathValidator {
    /// Validates that a host path is eligible to be mounted into a VM.
    /// Rejects root, system directories, user home directory directly, and sensitive directories like .ssh.
    pub fn validate_project_path(raw_path: &str) -> Result<PathBuf, WorkbenchError> {
        let path = Path::new(raw_path);
        if !path.exists() {
            return Err(WorkbenchError::Security(format!(
                "Path does not exist: {}",
                raw_path
            )));
        }

        let canonical = path.canonicalize().map_err(|e| {
            WorkbenchError::Security(format!("Failed to canonicalize path {}: {}", raw_path, e))
        })?;

        if !canonical.is_dir() {
            return Err(WorkbenchError::Security(format!(
                "Project path must be a directory: {}",
                raw_path
            )));
        }

        let canonical_str = canonical.to_string_lossy();

        // Disallow root directly
        if canonical_str == "/" || canonical_str == "/private" || canonical_str == "/var" {
            return Err(WorkbenchError::Security(
                "Root filesystem directory cannot be selected as project root".into()
            ));
        }

        // Disallow dangerous system paths
        let forbidden_prefixes = [
            "/System",
            "/Library",
            "/usr",
            "/bin",
            "/sbin",
            "/etc",
            "/private/etc",
            "/private/var/db",
            "/private/var/root",
            "/private/var/log",
        ];

        for prefix in &forbidden_prefixes {
            if canonical_str == *prefix || canonical_str.starts_with(&format!("{}/", prefix)) {
                return Err(WorkbenchError::Security(format!(
                    "System path cannot be selected as project root: {}",
                    canonical_str
                )));
            }
        }

        // Check if user home root was selected directly
        if let Some(home_dir) = dirs::home_dir() {
            if let Ok(canonical_home) = home_dir.canonicalize() {
                if canonical == canonical_home {
                    return Err(WorkbenchError::Security(
                        "Cannot mount user home directory directly. Select a specific project directory inside.".into()
                    ));
                }

                // Check sensitive subfolders
                let sensitive_subdirs = [".ssh", ".gnupg", ".aws", "Library", ".config/opencode"];
                for sub in &sensitive_subdirs {
                    let sens_path = canonical_home.join(sub);
                    if canonical_str == sens_path.to_string_lossy()
                        || canonical_str.starts_with(&format!("{}/", sens_path.to_string_lossy()))
                    {
                        return Err(WorkbenchError::Security(format!(
                            "Access to sensitive directory is blocked: {}",
                            sub
                        )));
                    }
                }
            }
        }

        Ok(canonical)
    }

    /// Ensures that a target file operation remains strictly within the workspace root
    pub fn ensure_within_root(target: &Path, root: &Path) -> Result<PathBuf, WorkbenchError> {
        let canonical_root = root.canonicalize().map_err(|e| {
            WorkbenchError::Security(format!("Root directory cannot be resolved: {}", e))
        })?;

        let canonical_target = if target.exists() {
            target.canonicalize().map_err(|e| {
                WorkbenchError::Security(format!("Target path cannot be resolved: {}", e))
            })?
        } else {
            // For new files, check parent directory
            let parent = target.parent().ok_or_else(|| {
                WorkbenchError::Security("Target has no valid parent directory".into())
            })?;
            let canonical_parent = parent.canonicalize().map_err(|e| {
                WorkbenchError::Security(format!("Parent directory cannot be resolved: {}", e))
            })?;
            canonical_parent.join(target.file_name().unwrap_or_default())
        };

        if !canonical_target.starts_with(&canonical_root) {
            return Err(WorkbenchError::Security(format!(
                "Path traversal detected: {} is outside workspace root {}",
                canonical_target.display(),
                canonical_root.display()
            )));
        }

        Ok(canonical_target)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rejects_system_directory() {
        let result = PathValidator::validate_project_path("/System");
        assert!(result.is_err());
    }

    #[test]
    fn test_rejects_nonexistent_path() {
        let result = PathValidator::validate_project_path("/path/that/definitely/does/not/exist/12345");
        assert!(result.is_err());
    }

    #[test]
    fn test_valid_temp_directory() {
        let temp_dir = std::env::temp_dir();
        let result = PathValidator::validate_project_path(temp_dir.to_str().unwrap());
        assert!(result.is_ok());
    }

    #[test]
    fn test_ensure_within_root_prevents_escape() {
        let root = std::env::temp_dir();
        let outside = PathBuf::from("/etc/passwd");
        let result = PathValidator::ensure_within_root(&outside, &root);
        assert!(result.is_err());
    }
}
