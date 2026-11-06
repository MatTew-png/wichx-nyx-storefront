#!/usr/bin/env bash
# ==============================================================================
# Cloudflare Tunnel Automated Setup Script for Linux / Ubuntu VPS
# NYX9 STUDIO - Self-Hosted Origin Hardening
# ==============================================================================

set -e

echo -e "\e[1;36m=================================================================\e[0m"
echo -e "\e[1;36m  🛡️ CLOUDFLARE TUNNEL (cloudflared) INSTALLER FOR LINUX\e[0m"
echo -e "\e[1;36m=================================================================\e[0m"

# 1. เพิ่ม Cloudflare GPG Key และ Repository
sudo mkdir -p --mode=0755 /etc/apt/keyrings
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /etc/apt/keyrings/cloudflare-main.gpg >/dev/null
echo 'deb [signed-by=/etc/apt/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared jammy main' | sudo tee /etc/apt/sources.list.d/cloudflared.list

# 2. ติดตั้ง cloudflared ผ่าน apt
sudo apt-get update && sudo apt-get install -y cloudflared

echo -e "\e[1;32m✅ ติดตั้ง cloudflared สำเร็จแล้ว!\e[0m"
echo ""
echo -e "\e[1;33mคำแนะนำการรันเป็น Systemd Service (เปิดเครื่องทำงานอัตโนมัติ):\e[0m"
echo "  sudo cloudflared service install <YOUR_TUNNEL_TOKEN>"
echo "  sudo systemctl start cloudflared"
echo "  sudo systemctl enable cloudflared"
echo "  sudo systemctl status cloudflared"
