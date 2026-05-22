param(
  [Parameter(Position = 0)]
  [ValidateSet("help", "run")]
  [string]$Command = "run",

  [switch]$Restart,

  [ValidateSet("sim", "não", "nao")]
  [string]$ApproveMerge
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function FailReason([string]$Reason, [string]$PrUrl = "") {
  if ($Reason -eq "Develop divergiu" -and $PrUrl) {
    [Console]::Error.WriteLine($Reason)
    [Console]::Error.WriteLine("PR: $PrUrl")
    exit 1
  }
  [Console]::Error.WriteLine($Reason)
  exit 1
}

if ($Command -eq "help") {
  Write-Output "Uso:"
  Write-Output "  pwsh scripts/deploy.ps1 run"
  Write-Output "  pwsh scripts/deploy.ps1 run -Restart"
  Write-Output "  pwsh scripts/deploy.ps1 run -ApproveMerge <sim|nao>"
  Write-Output ""
  Write-Output "Ritual (determinístico):"
  Write-Output "  1) Guardrails strict (develop + repo limpo + anti-surpresa com origin/main + gh ok + ssh ok)"
  Write-Output "  2) Push de env no VPS (npm run vps:env:push)"
  Write-Output "  3) Fechar PR aberto (se existir) e criar novo PR develop -> main via gh"
  Write-Output "  4) Esperar checks ficarem verdes (se falhar, fecha PR)"
  Write-Output "  5) Gate: 'Aprova? (sim/não)' e merge via gh"
  Write-Output "  6) Pós: fast-forward automático do develop para igualar main"
  exit 0
}

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $RepoRoot

$ReasonBranch = "FAIL: branch != develop"
$ReasonDirty = "Mudanças locais"
$ReasonBehind = "Develop desatualizado"
$ReasonEnv = "Env ausente"
$ReasonSsh = "ssh indisponível"
$ReasonGh = "gh indisponível/auth inválida"
$ReasonChecks = "Checks falharam"
$ReasonConflict = "Merge conflito"
$ReasonClosePr = "Falha fechar PR"
$ReasonDiverged = "Develop divergiu"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { FailReason $ReasonBehind }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { FailReason $ReasonEnv }
if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) { FailReason $ReasonSsh }
if (-not (Get-Command scp -ErrorAction SilentlyContinue)) { FailReason $ReasonSsh }
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { FailReason $ReasonGh }

$Branch = (git rev-parse --abbrev-ref HEAD).Trim()
if ($Branch -ne "develop") {
  FailReason $ReasonBranch
}

$Status = (git status --porcelain)
if ($Status -and $Status.Trim().Length -gt 0) {
  FailReason $ReasonDirty
}

try {
  git fetch --quiet --prune origin develop main 2>$null | Out-Null
  git pull --quiet --ff-only origin develop 2>$null | Out-Null
} catch {
  FailReason $ReasonBehind
}

try {
  git merge --quiet --ff-only origin/main 2>$null | Out-Null
} catch {
  FailReason $ReasonBehind
}

git merge-base --is-ancestor origin/main HEAD
if ($LASTEXITCODE -ne 0) {
  FailReason $ReasonBehind
}

if ($Restart) {
  npm run vps:env:push:restart
  if ($LASTEXITCODE -ne 0) { FailReason $ReasonEnv }
} else {
  npm run vps:env:push
  if ($LASTEXITCODE -ne 0) { FailReason $ReasonEnv }
}

try {
  gh auth status -h github.com | Out-Null
  gh repo view --json nameWithOwner,url | Out-Null
} catch {
  FailReason $ReasonGh
}

$SshOk = $false
try {
  $SshOut = (ssh -p 23377 -o BatchMode=yes -o ConnectTimeout=10 deploy@189.45.246.228 "echo SSH_OK" 2>$null)
  if ($SshOut -match "SSH_OK") { $SshOk = $true }
} catch {
  $SshOk = $false
}
if (-not $SshOk) { FailReason $ReasonSsh }

$CloseCommentRecreate = "Fechado automaticamente: recriando PR do deploy."
$CloseCommentChecks = "Fechado automaticamente: checks falharam. Correção será feita em develop e novo PR será aberto."
$CloseCommentConflict = "Fechado automaticamente: conflito. Correção será feita em develop e novo PR será aberto."

$ExistingPrNumber = (gh pr list --base main --head develop --state open --json number --jq '.[0].number').Trim()
if ($ExistingPrNumber -and $ExistingPrNumber -ne "null") {
  try {
    gh pr close $ExistingPrNumber -c $CloseCommentRecreate | Out-Null
  } catch {
    FailReason $ReasonClosePr
  }
}

$PrUrl = ""
$PrNumber = ""
try {
  $PrUrl = (gh pr create --base main --head develop --title "Deploy: develop → main" --body "Deploy (ritual): PR gerado automaticamente pelo comando local." ).Trim()
  if (-not $PrUrl) { FailReason $ReasonGh }
  $PrNumber = (gh pr view --json number --jq '.number').Trim()
  if (-not $PrNumber) { FailReason $ReasonGh }
} catch {
  FailReason $ReasonGh
}

$Mergeable = ""
$MergeState = ""
try {
  $Mergeable = (gh pr view $PrNumber --json mergeable --jq '.mergeable').Trim()
  $MergeState = (gh pr view $PrNumber --json mergeStateStatus --jq '.mergeStateStatus').Trim()
} catch {
  FailReason $ReasonGh
}
if ($Mergeable -ne "MERGEABLE") {
  try { gh pr close $PrNumber -c $CloseCommentConflict | Out-Null } catch { FailReason $ReasonClosePr }
  FailReason $ReasonConflict
}
if ($MergeState -eq "DIRTY" -or $MergeState -eq "BLOCKED") {
  try { gh pr close $PrNumber -c $CloseCommentConflict | Out-Null } catch { FailReason $ReasonClosePr }
  FailReason $ReasonConflict
}

try {
  gh pr checks $PrNumber --watch | Out-Null
} catch {
  try { gh pr close $PrNumber -c $CloseCommentChecks | Out-Null } catch { FailReason $ReasonClosePr }
  FailReason $ReasonChecks
}
if ($LASTEXITCODE -ne 0) {
  try { gh pr close $PrNumber -c $CloseCommentChecks | Out-Null } catch { FailReason $ReasonClosePr }
  FailReason $ReasonChecks
}

$CommitSha = (git rev-parse HEAD).Trim()
Write-Output "branch: develop"
Write-Output "sha: $CommitSha"
Write-Output "PR: $PrUrl"
Write-Output "checks: GREEN"

$Approval = ""
if ($ApproveMerge) {
  $Approval = $ApproveMerge.Trim().ToLowerInvariant()
  if ($Approval -eq "não") { $Approval = "nao" }
} else {
  $Approval = (Read-Host "Merge pronto para executar via gh. Aprova? (sim/não)").Trim().ToLowerInvariant()
  if ($Approval -eq "não") { $Approval = "nao" }
}

if ($Approval -ne "sim") {
  exit 0
}

try {
  gh pr merge $PrNumber --merge | Out-Null
} catch {
  FailReason $ReasonGh
}

try {
  git fetch --quiet --prune origin main 2>$null | Out-Null
  $MainSha = (git rev-parse origin/main).Trim()
  git pull --quiet --ff-only origin develop 2>$null | Out-Null
  git merge --quiet --ff-only origin/main 2>$null | Out-Null
  git push --quiet origin develop 2>$null | Out-Null
} catch {
  FailReason $ReasonDiverged $PrUrl
}

Write-Output "main: $MainSha"
Write-Output "done"
