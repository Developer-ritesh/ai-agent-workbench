//! Integration tests for the real git commands (git_log / git_commit) against
//! a temporary on-disk repository. These run the same code the UI invokes.

use workbench_lib::commands::fs::{git_commit, git_log, git_status};

use std::fs;
use std::path::Path;

fn unique_tmp_repo(name: &str) -> std::path::PathBuf {
    let dir = std::env::temp_dir().join(format!("wb-git-test-{}-{}", name, std::process::id()));
    let _ = fs::remove_dir_all(&dir);
    fs::create_dir_all(&dir).unwrap();
    let repo = dir.join("repo");
    fs::create_dir_all(&repo).unwrap();
    let run = |args: &[&str]| {
        std::process::Command::new("git")
            .args(args)
            .current_dir(&repo)
            .output()
            .unwrap()
    };
    let _ = run(&["init", "-q", "-b", "main"]);
    let _ = run(&["config", "user.email", "test@wb.local"]);
    let _ = run(&["config", "user.name", "WB Test"]);
    repo
}

#[test]
fn git_log_returns_empty_for_repo_without_commits() {
    let repo = unique_tmp_repo("empty");
    let entries = git_log(repo.to_string_lossy().to_string(), Some(10)).unwrap();
    assert!(entries.is_empty(), "expected no commits, got {}", entries.len());
}

#[test]
fn git_commit_with_staged_files_and_log_roundtrip() {
    let repo = unique_tmp_repo("roundtrip");
    let repo_str = repo.to_string_lossy().to_string();

    // Two files; only ONE is staged by the UI
    fs::write(repo.join("staged.rs"), "fn staged() {}\n").unwrap();
    fs::write(repo.join("unstaged.rs"), "fn unstaged() {}\n").unwrap();

    let out = git_commit(
        repo_str.clone(),
        "test: commit only the staged file".to_string(),
        Some(vec![repo.join("staged.rs").to_string_lossy().to_string()]),
    )
    .expect("git_commit should succeed");

    assert!(out.contains("staged") || !out.trim().is_empty());

    // Status: unstaged.rs must remain untracked
    let status = git_status(repo_str.clone()).unwrap();
    assert!(status.is_git_repo);
    assert!(
        status.changes.iter().any(|c| c.filename == "unstaged.rs"),
        "unstaged file must remain in working tree"
    );

    // History must contain exactly our commit as HEAD
    let entries = git_log(repo_str, Some(10)).unwrap();
    assert_eq!(entries.len(), 1, "exactly one commit expected");
    let head = &entries[0];
    assert!(head.is_head, "first entry must be HEAD");
    assert_eq!(head.message, "test: commit only the staged file");
    assert_eq!(head.author, "WB Test");
    assert_eq!(head.hash.len(), 7, "short hash expected");
    assert!(head.time > 0);
    assert!(
        head.time_label == "just now" || head.time_label == "0s ago",
        "unexpected time label {}",
        head.time_label
    );

    assert!(Path::new(&repo).exists());
}

#[test]
fn git_commit_rejects_empty_message() {
    let repo = unique_tmp_repo("emptymsg");
    let err = git_commit(
        repo.to_string_lossy().to_string(),
        "   ".to_string(),
        None,
    );
    assert!(err.is_err(), "empty message must be rejected");
}

#[test]
fn git_log_covers_clamped_limit() {
    let repo = unique_tmp_repo("limit");
    let repo_str = repo.to_string_lossy().to_string();
    fs::write(repo.join("f.txt"), "1").unwrap();
    git_commit(repo_str.clone(), "c1".into(), None).unwrap();
    fs::write(repo.join("f.txt"), "2").unwrap();
    git_commit(repo_str.clone(), "c2".into(), None).unwrap();
    fs::write(repo.join("f.txt"), "3").unwrap();
    git_commit(repo_str.clone(), "c3".into(), None).unwrap();

    let entries = git_log(repo_str, Some(1)).unwrap();
    assert_eq!(entries.len(), 1);
    assert_eq!(entries[0].message, "c3", "latest commit first");
}
