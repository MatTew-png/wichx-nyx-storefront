# ==============================================================================
# Cloudflare Tunnel Automated Setup Script for Windows
# NYX9 STUDIO - Self-Hosted Origin Hardening
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  🛡️ CLOUDFLARE TUNNEL (cloudflared) AUTOMATED INSTALLER" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

$installDir = "$env:USERPROFILE\.cloudflared"
$exePath = "$installDir\cloudflared.exe"

if (!(Test-Path $installDir)) {
    New-Item -ItemType Directory -Path $installDir -Force | Out-Null
    Write-Host "📁 สร้างโฟลเดอร์สำหรับเก็บคีย์ที่: $installDir" -ForegroundColor Green
}

# 1. ตรวจสอบหรือดาวน์โหลด cloudflared.exe ล่าสุด
if (!(Test-Path $exePath)) {
    Write-Host "⬇️ กำลังดาวน์โหลด cloudflared.exe จาก Cloudflare Official Release..." -ForegroundColor Yellow
    $url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
    Invoke-WebRequest -Uri $url -OutFile $exePath
    Write-Host "✅ ดาวน์โหลดเรียบร้อย: $exePath" -ForegroundColor Green
} else {
    Write-Host "✅ พบไฟล์ cloudflared.exe อยู่แล้วในระบบ" -ForegroundColor Green
}

# เพิ่มลงใน User PATH ชั่วคราวเพื่อให้เรียกคำสั่งได้
if ($env:Path -notlike "*$installDir*") {
    $env:Path += ";$installDir"
}

Write-Host ""
Write-Host "🚀 วิธีการรัน Tunnel มี 2 แบบให้เลือก:" -ForegroundColor Cyan
Write-Host "-----------------------------------------------------------------"
Write-Host "👉 แบบที่ 1: ใช้ Cloudflare Zero Trust Token (ง่ายสุด แนะนำมากที่สุด ⭐️)" -ForegroundColor Yellow
Write-Host "   1. ไปที่ Cloudflare Dashboard > Zero Trust > Networks > Tunnels"
Write-Host "   2. กด Create Tunnel > ตั้งชื่อ > เลือก Windows"
Write-Host "   3. จะได้คำสั่งที่มี Token ให้นำ Token มารันด้วยคำสั่งนี้:"
Write-Host "      & '$exePath' service install <YOUR_TOKEN>" -ForegroundColor White
Write-Host ""
Write-Host "👉 แบบที่ 2: สร้างและ Login ผ่าน CLI ด้วยตัวเอง" -ForegroundColor Yellow
Write-Host "   1. เข้าสู่ระบบ Cloudflare:"
Write-Host "      & '$exePath' tunnel login" -ForegroundColor White
Write-Host "   2. สร้าง Tunnel ชื่อ nyx9-storefront:"
Write-Host "      & '$exePath' tunnel create nyx9-storefront" -ForegroundColor White
Write-Host "   3. รัน Tunnel ผ่านคอนฟิก:"
Write-Host "      & '$exePath' --config '$PSScriptRoot\config.example.yml' tunnel run" -ForegroundColor White
Write-Host "-----------------------------------------------------------------"
