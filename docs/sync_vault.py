#!/usr/bin/env python3
"""
Automated Cross-Platform Obsidian Agentic Vault Sync Script.
Works across Windows, macOS, and Linux.
"""

import subprocess
import sys
from datetime import datetime
from pathlib import Path


def run_command(cmd, cwd=None):
    result = subprocess.run(cmd, cwd=cwd, shell=True, text=True, capture_output=True)
    if result.returncode != 0:
        print(f"❌ Command failed: {cmd}\n{result.stderr}")
        return False, result.stderr
    return True, result.stdout


def main():
    script_dir = Path(__file__).resolve().parent
    repo_root = script_dir.parent

    commit_msg = sys.argv[1] if len(sys.argv) > 1 else f"Auto-sync Obsidian vault: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"

    print(f"🔄 Syncing Obsidian Vault at {repo_root}...")

    # 1. Pull
    print("⬇️ Pulling latest changes from remote...")
    success, _ = run_command("git pull --rebase", cwd=repo_root)
    if not success:
        print("⚠️ Warning during git pull; attempting to proceed...")

    # 2. Stage docs/
    print("➕ Staging docs/ changes...")
    run_command("git add docs/", cwd=repo_root)

    # 3. Check diff
    success, status = run_command("git status --porcelain docs/", cwd=repo_root)
    if not status.strip():
        print("✅ Vault is already clean and up to date.")
        return 0

    # 4. Commit
    print(f"📝 Committing vault updates: '{commit_msg}'...")
    success, out = run_command(f'git commit -m "{commit_msg}"', cwd=repo_root)
    if not success:
        print("❌ Git commit failed.")
        return 1

    # 5. Push
    print("🚀 Pushing to remote...")
    success, out = run_command("git push", cwd=repo_root)
    if not success:
        print("❌ Git push failed.")
        return 1

    print("🎉 Vault synchronized successfully!")
    return 0


if __name__ == "__main__":
    sys.exit(main())
