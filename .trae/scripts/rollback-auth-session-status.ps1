$ErrorActionPreference = "Stop"

$baselineMsg = "baseline:auth-session-status-start-20260420"
$baselineLine = git stash list --format="%gd %s" | Select-String -SimpleMatch $baselineMsg | Select-Object -First 1

if (-not $baselineLine) {
  throw "Baseline stash não encontrado: $baselineMsg"
}

$baselineRef = ($baselineLine.ToString().Split(" ")[0])

Write-Output "Stashing current work (safety)..."
git stash push -u -m "backup:before-rollback:auth-session-status" | Out-Null

Write-Output "Resetting working tree to HEAD..."
git reset --hard | Out-Null

Write-Output "Cleaning untracked files..."
git clean -fd | Out-Null

Write-Output "Restoring baseline stash $baselineRef ..."
git stash apply $baselineRef | Out-Null

Write-Output "Rollback completed."
