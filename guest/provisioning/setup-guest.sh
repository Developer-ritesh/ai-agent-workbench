#!/usr/bin/env bash
set -euo pipefail

echo "=== Provisioning macOS AI Agent Workbench Guest VM ==="

# 1. Update package lists
sudo apt-get update -y
sudo apt-get install -y curl wget git jq python3 python3-pip

# 2. Setup Virtio-FS mount for project workspace
sudo mkdir -p /workspace
if ! grep -q "project /workspace virtiofs" /etc/fstab; then
    echo "project /workspace virtiofs defaults 0 0" | sudo tee -a /etc/fstab
fi

# 3. Install OpenCode CLI if not present
if ! command -v opencode &> /dev/null; then
    echo "Installing OpenCode CLI..."
    curl -fsSL https://opencode.ai/install.sh | bash || true
fi

# 4. Install guest supervisor service
sudo cp /usr/local/bin/supervisor.py /usr/local/bin/workbench-supervisor 2>/dev/null || true
sudo chmod +x /usr/local/bin/workbench-supervisor 2>/dev/null || true

echo "Guest VM provisioning complete."
