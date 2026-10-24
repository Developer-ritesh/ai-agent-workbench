use keyring::Entry;
use crate::error::WorkbenchError;

const KEYCHAIN_SERVICE: &str = "com.workbench.agent";

pub struct KeychainManager;

impl KeychainManager {
    /// Stores a secret credential for a provider profile in the macOS Keychain
    pub fn store_secret(credential_ref: &str, secret_value: &str) -> Result<(), WorkbenchError> {
        let entry = Entry::new(KEYCHAIN_SERVICE, credential_ref)
            .map_err(|e| WorkbenchError::Credential(format!("Failed to create keychain entry: {}", e)))?;

        entry
            .set_password(secret_value)
            .map_err(|e| WorkbenchError::Credential(format!("Failed to store secret in Keychain: {}", e)))?;

        Ok(())
    }

    /// Retrieves an existing credential from the macOS Keychain
    pub fn get_secret(credential_ref: &str) -> Result<String, WorkbenchError> {
        let entry = Entry::new(KEYCHAIN_SERVICE, credential_ref)
            .map_err(|e| WorkbenchError::Credential(format!("Failed to access keychain entry: {}", e)))?;

        entry
            .get_password()
            .map_err(|e| WorkbenchError::Credential(format!("Failed to retrieve secret from Keychain: {}", e)))
    }

    /// Deletes a credential from the macOS Keychain
    pub fn delete_secret(credential_ref: &str) -> Result<(), WorkbenchError> {
        let entry = Entry::new(KEYCHAIN_SERVICE, credential_ref)
            .map_err(|e| WorkbenchError::Credential(format!("Failed to access keychain entry: {}", e)))?;

        let _ = entry.delete_credential();
        Ok(())
    }
}
