$ErrorActionPreference = "Stop"

Write-Output "Stashing current work (safety)..."
git stash push -u -m "backup:before-rollback:auth-strategy" | Out-Null

Write-Output "Resetting to tag backup/auth-strategy-start-20260420 ..."
git reset --hard "backup/auth-strategy-start-20260420" | Out-Null

Write-Output "Cleaning untracked files..."
git clean -fd | Out-Null

Write-Output "Rollback completed."
