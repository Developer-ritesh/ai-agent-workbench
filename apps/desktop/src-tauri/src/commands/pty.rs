use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::{AppHandle, Emitter, State};

pub struct PtySession {
    pub writer: Arc<Mutex<Box<dyn Write + Send>>>,
    pub master: Arc<Mutex<Box<dyn MasterPty + Send>>>,
    pub child: Arc<Mutex<Box<dyn Child + Send + Sync>>>,
    pub cwd: Option<PathBuf>,
}

#[derive(Clone, Default)]
pub struct PtyManager {
    sessions: Arc<Mutex<HashMap<String, PtySession>>>,
}

impl PtyManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn spawn(
        &self,
        app: AppHandle,
        terminal_id: String,
        cwd: Option<String>,
        cols: u16,
        rows: u16,
    ) -> Result<(), String> {
        let pty_system = native_pty_system();
        let size = PtySize {
            rows: rows.max(10),
            cols: cols.max(20),
            pixel_width: 0,
            pixel_height: 0,
        };

        let pair = pty_system
            .openpty(size)
            .map_err(|e| format!("Failed to open PTY: {}", e))?;
        #[cfg(unix)]
        {
            if let Some(fd) = pair.master.as_raw_fd() {
                unsafe {
                    let mut termios: libc::termios = std::mem::zeroed();
                    if libc::tcgetattr(fd, &mut termios) == 0 {
                        libc::cfmakeraw(&mut termios);
                        libc::tcsetattr(fd, libc::TCSANOW, &termios);
                    }
                }
            }
            if let Some(tty_path) = pair.master.tty_name() {
                if let Ok(c_path) = std::ffi::CString::new(tty_path.to_string_lossy().as_bytes()) {
                    unsafe {
                        let sfd = libc::open(c_path.as_ptr(), libc::O_RDWR | libc::O_NOCTTY);
                        if sfd >= 0 {
                            let mut termios: libc::termios = std::mem::zeroed();
                            if libc::tcgetattr(sfd, &mut termios) == 0 {
                                libc::cfmakeraw(&mut termios);
                                libc::tcsetattr(sfd, libc::TCSANOW, &termios);
                            }
                            libc::close(sfd);
                        }
                    }
                }
            }
        }

        let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
        let base_dir = home.join(".ai-agent-workbench").join("base-image");
        let kernel = base_dir.join("vmlinux-raw");
        let initramfs = base_dir.join("initramfs-guest.cpio.gz");
        let vfkit_path = PathBuf::from("/opt/homebrew/bin/vfkit");

        if !vfkit_path.exists() {
            return Err(format!("vfkit hypervisor binary not found at {}", vfkit_path.display()));
        }
        if !kernel.exists() {
            return Err(format!("Linux kernel not found at {}", kernel.display()));
        }
        if !initramfs.exists() {
            return Err(format!("Linux initramfs not found at {}", initramfs.display()));
        }

        let mut cmd = CommandBuilder::new(&vfkit_path);
        cmd.arg("--cpus");
        cmd.arg("2");
        cmd.arg("--memory");
        cmd.arg("2048");
        cmd.arg("-k");
        cmd.arg(kernel.to_string_lossy().to_string());
        cmd.arg("-i");
        cmd.arg(initramfs.to_string_lossy().to_string());
        cmd.arg("-C");
        cmd.arg(format!(
            "console=hvc0 quiet rdinit=/init random.trust_cpu=on term_cols={} term_rows={}",
            cols.max(40),
            rows.max(10)
        ));
        cmd.arg("-d");
        cmd.arg("virtio-net,nat");

        if let Some(ref dir) = cwd {
            let p = PathBuf::from(dir);
            if p.exists() {
                // Ensure devai executable shim exists in workspace node_modules/.bin so guest VM path can always invoke it
                let bin_dir = p.join("node_modules").join(".bin");
                let _ = std::fs::create_dir_all(&bin_dir);
                let devai_shim = bin_dir.join("devai");
                if !devai_shim.exists() {
                    let script = "#!/bin/sh\nif [ -x /usr/bin/opencode ]; then\n  exec /usr/bin/opencode \"$@\"\nelif [ -x /bin/opencode ]; then\n  exec /bin/opencode \"$@\"\nelse\n  exec opencode \"$@\"\nfi\n";
                    let _ = std::fs::write(&devai_shim, script);
                    #[cfg(unix)]
                    {
                        use std::os::unix::fs::PermissionsExt;
                        let _ = std::fs::set_permissions(&devai_shim, std::fs::Permissions::from_mode(0o755));
                    }
                }

                let mount_link = std::env::temp_dir().join(format!("ai-agent-ws-{}", terminal_id));
                let _ = std::fs::remove_file(&mount_link);
                let _ = std::os::unix::fs::symlink(&p, &mount_link);
                let _ = std::fs::write(mount_link.join(".term_size"), format!("{} {}", rows, cols));
                cmd.arg("-d");
                cmd.arg(format!("virtio-fs,sharedDir={},mountTag=project", mount_link.to_string_lossy()));
            }
        }

        cmd.arg("-d");
        cmd.arg("virtio-serial,stdio");

        let child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| format!("Failed to spawn shell in PTY: {}", e))?;

        let mut reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| format!("Failed to clone PTY reader: {}", e))?;

        let writer = pair
            .master
            .take_writer()
            .map_err(|e| format!("Failed to take PTY writer: {}", e))?;

        let term_id_clone = terminal_id.clone();
        let app_clone = app.clone();

        thread::spawn(move || {
            let mut buffer = [0u8; 8192];
            loop {
                match reader.read(&mut buffer) {
                    Ok(0) => break,
                    Ok(n) => {
                        let data = String::from_utf8_lossy(&buffer[..n]).to_string();
                        let event_name = format!("pty-output-{}", term_id_clone);
                        let _ = app_clone.emit(&event_name, data);
                    }
                    Err(_) => break,
                }
            }
        });

        let session = PtySession {
            writer: Arc::new(Mutex::new(writer)),
            master: Arc::new(Mutex::new(pair.master)),
            child: Arc::new(Mutex::new(child)),
            cwd: cwd.map(PathBuf::from),
        };

        let mut map = self.sessions.lock().unwrap();
        map.insert(terminal_id, session);

        Ok(())
    }

    pub fn write(&self, terminal_id: &str, data: &str) -> Result<(), String> {
        let map = self.sessions.lock().unwrap();
        if let Some(session) = map.get(terminal_id) {
            let mut writer = session.writer.lock().unwrap();
            writer
                .write_all(data.as_bytes())
                .map_err(|e| format!("Failed to write to PTY: {}", e))?;
            let _ = writer.flush();
            Ok(())
        } else {
            Err(format!("PTY session {} not found", terminal_id))
        }
    }

    pub fn resize(&self, terminal_id: &str, cols: u16, rows: u16) -> Result<(), String> {
        let map = self.sessions.lock().unwrap();
        if let Some(session) = map.get(terminal_id) {
            let master = session.master.lock().unwrap();
            master
                .resize(PtySize {
                    rows: rows.max(5),
                    cols: cols.max(10),
                    pixel_width: 0,
                    pixel_height: 0,
                })
                .map_err(|e| format!("Failed to resize PTY: {}", e))?;

            // Synchronize terminal dimensions with the Linux guest VM
            if let Some(ref dir) = session.cwd {
                let _ = std::fs::write(dir.join(".term_size"), format!("{} {}", rows, cols));
            }
            let ws_link = std::env::temp_dir().join(format!("ai-agent-ws-{}", terminal_id));
            if ws_link.exists() {
                let term_size_file = ws_link.join(".term_size");
                let _ = std::fs::write(&term_size_file, format!("{} {}", rows, cols));
            }

            Ok(())
        } else {
            Err(format!("PTY session {} not found", terminal_id))
        }
    }

    pub fn kill(&self, terminal_id: &str) -> Result<(), String> {
        let mut map = self.sessions.lock().unwrap();
        if let Some(session) = map.remove(terminal_id) {
            if let Ok(mut child) = session.child.lock() {
                let _ = child.kill();
            }
        }
        Ok(())
    }
}

#[tauri::command]
pub fn pty_spawn(
    app: AppHandle,
    state: State<'_, PtyManager>,
    terminal_id: String,
    cwd: Option<String>,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    state.spawn(app, terminal_id, cwd, cols, rows)
}

#[tauri::command]
pub fn pty_write(
    state: State<'_, PtyManager>,
    terminal_id: String,
    data: String,
) -> Result<(), String> {
    state.write(&terminal_id, &data)
}

#[tauri::command]
pub fn pty_resize(
    state: State<'_, PtyManager>,
    terminal_id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    state.resize(&terminal_id, cols, rows)
}

#[tauri::command]
pub fn pty_kill(
    state: State<'_, PtyManager>,
    terminal_id: String,
) -> Result<(), String> {
    state.kill(&terminal_id)
}
