# Automated Obsidian Agentic Vault Sync Script (PowerShell)
param (
    [string]$CommitMessage = "Auto-sync Obsidian vault: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
)

$ErrorActionPreference = "Stop"

Write-Host "🔄 Syncing Obsidian Vault..." -ForegroundColor Cyan

# Check if git is available
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error "Git is not installed or not in PATH."
    exit 1
}

# Navigate to repo root
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

# Pull latest changes
Write-Host "⬇️ Pulling latest changes from remote..." -ForegroundColor Yellow
git pull --rebase

# Stage docs changes
Write-Host "➕ Staging docs/ changes..." -ForegroundColor Yellow
git add docs/

# Check status
$status = git status --porcelain docs/
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "✅ Vault is already clean and up to date." -ForegroundColor Green
    exit 0
}

# Commit
Write-Host "📝 Committing vault updates: '$CommitMessage'..." -ForegroundColor Yellow
git commit -m "$CommitMessage"

# Push
Write-Host "🚀 Pushing to remote..." -ForegroundColor Yellow
git push

Write-Host "🎉 Vault synchronized successfully!" -ForegroundColor Green
