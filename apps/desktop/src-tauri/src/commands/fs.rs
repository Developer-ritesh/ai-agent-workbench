use std::fs;
use std::path::Path;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    #[serde(rename = "isDir")]
    pub is_dir: bool,
    pub size: u64,
    pub children: Option<Vec<FileEntry>>,
}

#[tauri::command]
pub fn fs_read_dir(path: String) -> Result<Vec<FileEntry>, String> {
    let p = Path::new(&path);
    if !p.exists() {
        let _ = fs::create_dir_all(p);
    }
    read_dir_recursive(p, 0, 3).map_err(|e| e.to_string())
}

fn read_dir_recursive(path: &Path, current_depth: usize, max_depth: usize) -> Result<Vec<FileEntry>, std::io::Error> {
    let mut entries = Vec::new();
    if !path.is_dir() {
        return Ok(entries);
    }

    let read = match fs::read_dir(path) {
        Ok(r) => r,
        Err(e) => return Err(e),
    };

    for entry in read {
        let entry = entry?;
        let entry_path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        // Skip internal/heavy directories
        if name == ".git" || name == "node_modules" || name == "target" || name == ".DS_Store" || name == ".next" || name == "dist" {
            continue;
        }

        let is_dir = entry_path.is_dir();
        let size = if is_dir { 0 } else { entry.metadata().map(|m| m.len()).unwrap_or(0) };

        let children = if is_dir && current_depth < max_depth {
            match read_dir_recursive(&entry_path, current_depth + 1, max_depth) {
                Ok(c) => Some(c),
                Err(_) => None,
            }
        } else {
            None
        };

        entries.push(FileEntry {
            name,
            path: entry_path.to_string_lossy().to_string(),
            is_dir,
            size,
            children,
        });
    }

    entries.sort_by(|a, b| {
        if a.is_dir && !b.is_dir {
            std::cmp::Ordering::Less
        } else if !a.is_dir && b.is_dir {
            std::cmp::Ordering::Greater
        } else {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        }
    });

    Ok(entries)
}

#[tauri::command]
pub fn fs_read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file {}: {}", path, e))
}

#[tauri::command]
pub fn fs_write_file(path: String, content: String) -> Result<(), String> {
    let p = Path::new(&path);
    if let Some(parent) = p.parent() {
        let _ = fs::create_dir_all(parent);
    }
    fs::write(&path, content).map_err(|e| format!("Failed to write file {}: {}", path, e))
}

#[tauri::command]
pub fn fs_create_file(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if let Some(parent) = p.parent() {
        let _ = fs::create_dir_all(parent);
    }
    fs::write(&path, "").map_err(|e| format!("Failed to create file {}: {}", path, e))
}

#[tauri::command]
pub fn fs_create_dir(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| format!("Failed to create folder {}: {}", path, e))
}

#[tauri::command]
pub fn fs_delete(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if p.is_dir() {
        fs::remove_dir_all(&path).map_err(|e| format!("Failed to delete folder {}: {}", path, e))
    } else {
        fs::remove_file(&path).map_err(|e| format!("Failed to delete file {}: {}", path, e))
    }
}

#[tauri::command]
pub fn fs_rename(old_path: String, new_path: String) -> Result<(), String> {
    fs::rename(&old_path, &new_path).map_err(|e| format!("Failed to rename {} to {}: {}", old_path, new_path, e))
}

#[tauri::command]
pub fn dialog_open_folder() -> Result<Option<String>, String> {
    let output = std::process::Command::new("osascript")
        .arg("-e")
        .arg("try\nset folderPath to POSIX path of (choose folder with prompt \"Select Project Folder to Open in Workbench\")\nreturn folderPath\non error\nreturn \"\"\nend try")
        .output()
        .map_err(|e| format!("Failed to open folder dialog: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if stdout.is_empty() {
        Ok(None)
    } else {
        let clean = stdout.strip_suffix('/').unwrap_or(&stdout).to_string();
        Ok(Some(clean))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub path: String,
    pub name: String,
    pub relative_path: String,
    pub line_number: usize,
    pub line_content: String,
    pub match_type: String, // "content" | "filename"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitFileChange {
    pub path: String,
    pub filename: String,
    pub status: String, // "M", "A", "D", "??", "R"
    pub staged: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitStatusResult {
    pub branch: String,
    pub is_git_repo: bool,
    pub clean: bool,
    pub changes: Vec<GitFileChange>,
}

#[tauri::command]
pub fn fs_search(
    path: String,
    query: String,
    match_case: bool,
    search_content: bool,
) -> Result<Vec<SearchResult>, String> {
    let trimmed = query.trim();
    if trimmed.is_empty() {
        return Ok(Vec::new());
    }

    let root = Path::new(&path);
    if !root.exists() {
        return Ok(Vec::new());
    }

    let mut results = Vec::new();
    let query_lower = trimmed.to_lowercase();
    let max_results = 200;

    fn search_recursive(
        dir: &Path,
        root: &Path,
        query: &str,
        query_lower: &str,
        match_case: bool,
        search_content: bool,
        results: &mut Vec<SearchResult>,
        max_results: usize,
        depth: usize,
    ) {
        if depth > 10 || results.len() >= max_results {
            return;
        }

        let read = match fs::read_dir(dir) {
            Ok(r) => r,
            Err(_) => return,
        };

        for entry in read.flatten() {
            if results.len() >= max_results {
                return;
            }

            let entry_path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();

            if name == ".git"
                || name == "node_modules"
                || name == "target"
                || name == "dist"
                || name == ".next"
                || name == "build"
                || name == ".DS_Store"
            {
                continue;
            }

            if entry_path.is_dir() {
                search_recursive(
                    &entry_path,
                    root,
                    query,
                    query_lower,
                    match_case,
                    search_content,
                    results,
                    max_results,
                    depth + 1,
                );
            } else {
                let relative = entry_path
                    .strip_prefix(root)
                    .unwrap_or(&entry_path)
                    .to_string_lossy()
                    .to_string();

                let name_matches = if match_case {
                    name.contains(query)
                } else {
                    name.to_lowercase().contains(query_lower)
                };

                if name_matches {
                    results.push(SearchResult {
                        path: entry_path.to_string_lossy().to_string(),
                        name: name.clone(),
                        relative_path: relative.clone(),
                        line_number: 1,
                        line_content: name.clone(),
                        match_type: "filename".to_string(),
                    });
                }

                if search_content && results.len() < max_results {
                    let ext = entry_path
                        .extension()
                        .map(|e| e.to_string_lossy().to_lowercase())
                        .unwrap_or_default();

                    let is_binary_ext = matches!(
                        ext.as_str(),
                        "png"
                            | "jpg"
                            | "jpeg"
                            | "gif"
                            | "ico"
                            | "webp"
                            | "wasm"
                            | "zip"
                            | "gz"
                            | "tar"
                            | "bin"
                            | "exe"
                            | "pdf"
                            | "mp4"
                            | "dylib"
                            | "so"
                            | "a"
                            | "cpio"
                    );

                    let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
                    if !is_binary_ext && size < 1_500_000 {
                        if let Ok(content) = fs::read_to_string(&entry_path) {
                            let mut line_matches_for_file = 0;
                            for (idx, line) in content.lines().enumerate() {
                                if results.len() >= max_results || line_matches_for_file >= 10 {
                                    break;
                                }

                                let line_matches = if match_case {
                                    line.contains(query)
                                } else {
                                    line.to_lowercase().contains(query_lower)
                                };

                                if line_matches {
                                    line_matches_for_file += 1;
                                    results.push(SearchResult {
                                        path: entry_path.to_string_lossy().to_string(),
                                        name: name.clone(),
                                        relative_path: relative.clone(),
                                        line_number: idx + 1,
                                        line_content: line.trim().to_string(),
                                        match_type: "content".to_string(),
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    search_recursive(
        root,
        root,
        trimmed,
        &query_lower,
        match_case,
        search_content,
        &mut results,
        max_results,
        0,
    );

    Ok(results)
}

#[tauri::command]
pub fn git_status(path: String) -> Result<GitStatusResult, String> {
    let output = std::process::Command::new("git")
        .args(&["-C", &path, "status", "--porcelain=v1", "-b"])
        .output();

    let output = match output {
        Ok(out) => out,
        Err(_) => {
            return Ok(GitStatusResult {
                branch: "No git".to_string(),
                is_git_repo: false,
                clean: true,
                changes: Vec::new(),
            });
        }
    };

    if !output.status.success() {
        return Ok(GitStatusResult {
            branch: "Not a git repository".to_string(),
            is_git_repo: false,
            clean: true,
            changes: Vec::new(),
        });
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut branch = "main".to_string();
    let mut changes = Vec::new();

    for (i, line) in stdout.lines().enumerate() {
        if i == 0 && line.starts_with("## ") {
            let header = line.trim_start_matches("## ").trim();
            if let Some(b) = header.split("...").next() {
                let clean_b = b.split(' ').next().unwrap_or("main");
                if !clean_b.is_empty() {
                    branch = clean_b.to_string();
                }
            }
            continue;
        }

        if line.len() < 3 {
            continue;
        }

        let status_code = line[..2].to_string();
        let file_part = line[3..].trim();
        let actual_file = if let Some(idx) = file_part.find(" -> ") {
            &file_part[idx + 4..]
        } else {
            file_part
        };

        let file_name = actual_file.split('/').filter(|s| !s.is_empty()).last().unwrap_or(actual_file).to_string();
        let full_path = if path.ends_with('/') {
            format!("{}{}", path, actual_file)
        } else {
            format!("{}/{}", path, actual_file)
        };

        let is_staged = !status_code.starts_with(' ') && !status_code.starts_with('?');
        let status_label = if status_code.contains('?') {
            "??".to_string()
        } else if status_code.contains('M') {
            "M".to_string()
        } else if status_code.contains('A') {
            "A".to_string()
        } else if status_code.contains('D') {
            "D".to_string()
        } else if status_code.contains('R') {
            "R".to_string()
        } else {
            status_code.trim().to_string()
        };

        changes.push(GitFileChange {
            path: full_path,
            filename: file_name,
            status: status_label,
            staged: is_staged,
        });
    }

    let clean = changes.is_empty();

    Ok(GitStatusResult {
        branch,
        is_git_repo: true,
        clean,
        changes,
    })
}

#[tauri::command]
pub fn git_commit(path: String, message: String) -> Result<String, String> {
    if message.trim().is_empty() {
        return Err("Commit message cannot be empty".to_string());
    }

    let _ = std::process::Command::new("git")
        .args(&["-C", &path, "add", "-A"])
        .output()
        .map_err(|e| format!("git add failed: {}", e))?;

    let output = std::process::Command::new("git")
        .args(&["-C", &path, "commit", "-m", &message])
        .output()
        .map_err(|e| format!("git commit failed: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if output.status.success() {
        Ok(stdout)
    } else {
        Err(if !stderr.is_empty() { stderr } else { stdout })
    }
}

#[tauri::command]
pub fn git_init(path: String) -> Result<String, String> {
    let output = std::process::Command::new("git")
        .args(&["-C", &path, "init"])
        .output()
        .map_err(|e| format!("git init failed: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
pub fn opencode_clear_sessions(path: String) -> Result<String, String> {
    let p = Path::new(&path);
    let opencode_dir = p.join(".opencode");
    if opencode_dir.exists() {
        let _ = fs::remove_dir_all(opencode_dir.join("data"));
        let _ = fs::remove_dir_all(opencode_dir.join("sessions"));
        let _ = fs::remove_dir_all(opencode_dir.join("state"));
        let _ = fs::remove_dir_all(opencode_dir.join("cache"));
        let _ = fs::create_dir_all(opencode_dir.join("data"));
        let _ = fs::create_dir_all(opencode_dir.join("sessions"));
        let _ = fs::create_dir_all(opencode_dir.join("state"));
    }
    Ok("Project OpenCode sessions, conversation checkpoints, and cache wiped successfully.".to_string())
}

#[tauri::command]
pub fn opencode_clear_global_history() -> Result<String, String> {
    if let Some(home) = dirs::home_dir() {
        let share_dir = home.join(".local").join("share").join("opencode");
        if share_dir.exists() {
            let _ = fs::remove_file(share_dir.join("opencode.db"));
            let _ = fs::remove_file(share_dir.join("opencode.db-shm"));
            let _ = fs::remove_file(share_dir.join("opencode.db-wal"));

            for subdir in &["snapshot", "storage", "tool-output", "shell", "log"] {
                let d = share_dir.join(subdir);
                let _ = fs::remove_dir_all(&d);
                let _ = fs::create_dir_all(&d);
            }
        }
        Ok("Global OpenCode session history and conversation database cleared successfully.".to_string())
    } else {
        Err("Could not determine home directory".to_string())
    }
}

#[tauri::command]
pub fn opencode_clear_cache() -> Result<String, String> {
    if let Some(home) = dirs::home_dir() {
        let cache_dir = home.join(".cache").join("opencode");
        if cache_dir.exists() {
            let _ = fs::remove_dir_all(&cache_dir);
            let _ = fs::create_dir_all(&cache_dir);
        }
        Ok("OpenCode model cache and temporary packages cleared successfully.".to_string())
    } else {
        Err("Could not determine home directory".to_string())
    }
}
