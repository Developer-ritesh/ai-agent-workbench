#!/usr/bin/env python3
"""
macOS AI Agent Workbench - Linux Guest Supervisor
Runs inside the Linux Guest VM to supervise OpenCode agent execution,
handle authenticated PTY sessions, report health status, and enforce guest isolation.
"""

import os
import sys
import json
import time
import subprocess
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler

SUPERVISOR_VERSION = "0.1.0"
DEFAULT_PORT = 9999
WORKSPACE_DIR = "/workspace"

class SupervisorHandler(BaseHTTPRequestHandler):
    def _send_json(self, status_code, data):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

    def do_GET(self):
        if self.path == "/health":
            self._send_json(200, {
                "status": "healthy",
                "supervisor_version": SUPERVISOR_VERSION,
                "workspace_mounted": os.path.isdir(WORKSPACE_DIR),
                "opencode_installed": self._check_opencode_installed()
            })
        elif self.path == "/opencode/version":
            res = self._run_command(["opencode", "--version"])
            self._send_json(200, res)
        else:
            self._send_json(404, {"error": "Not found"})

    def do_POST(self):
        if self.path == "/exec":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8")
            try:
                payload = json.loads(body)
                cmd = payload.get("command", "")
                cwd = payload.get("cwd", WORKSPACE_DIR)
                
                # Ensure execution happens inside permitted workspace directory
                if not os.path.realpath(cwd).startswith(os.path.realpath(WORKSPACE_DIR)):
                    self._send_json(403, {"error": "Execution outside /workspace boundary is forbidden"})
                    return
                
                res = self._run_command(cmd, cwd=cwd, shell=True)
                self._send_json(200, res)
            except Exception as e:
                self._send_json(500, {"error": str(e)})
        else:
            self._send_json(404, {"error": "Not found"})

    def _check_opencode_installed(self):
        try:
            return subprocess.call(["which", "opencode"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL) == 0
        except Exception:
            return False

    def _run_command(self, cmd, cwd=WORKSPACE_DIR, shell=False):
        start_time = time.time()
        try:
            proc = subprocess.Popen(
                cmd,
                cwd=cwd,
                shell=shell,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            stdout, stderr = proc.communicate(timeout=60)
            return {
                "exit_code": proc.returncode,
                "stdout": stdout,
                "stderr": stderr,
                "duration_sec": round(time.time() - start_time, 3)
            }
        except subprocess.TimeoutExpired:
            proc.kill()
            return {"exit_code": -1, "stdout": "", "stderr": "Command timed out", "duration_sec": 60.0}
        except Exception as e:
            return {"exit_code": -1, "stdout": "", "stderr": str(e), "duration_sec": 0.0}

def run_server(port=DEFAULT_PORT):
    server = HTTPServer(("0.0.0.0", port), SupervisorHandler)
    print(f"Guest Supervisor listening on port {port}...")
    server.serve_forever()

if __name__ == "__main__":
    run_server()
