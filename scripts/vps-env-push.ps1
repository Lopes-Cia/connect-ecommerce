param(
  [Parameter(Position = 0)]
  [ValidateSet("help", "push")]
  [string]$Command = "push",

  [string]$SshHost = "189.45.246.228",
  [int]$Port = 23377,
  [string]$User = "deploy",
  [string]$AppDir = "/var/www/connect-ecommerce",
  [string]$ProcessName = "connect-ecommerce",
  [string]$NodeVersion = "24",
  [switch]$Restart
)

$IsDotSourced = $MyInvocation.InvocationName -eq "."
if (-not $IsDotSourced) {
  Set-StrictMode -Version Latest
}
$ErrorActionPreference = "Stop"

if ($Command -eq "help") {
  Write-Output "Uso:"
  Write-Output "  pwsh scripts/vps-env-push.ps1 push"
  Write-Output "  pwsh scripts/vps-env-push.ps1 push -Restart"
  Write-Output ""
  Write-Output "Opções:"
  Write-Output "  -SshHost <ip>         (default: 189.45.246.228)"
  Write-Output "  -Port <porta>         (default: 23377)"
  Write-Output "  -User <usuario>       (default: deploy)"
  Write-Output "  -AppDir <path>        (default: /var/www/connect-ecommerce)"
  Write-Output "  -ProcessName <nome>   (default: connect-ecommerce)"
  Write-Output "  -NodeVersion <ver>    (default: 24)"
  exit 0
}

if (-not (Get-Command scp -ErrorAction SilentlyContinue)) {
  Write-Error "scp não encontrado. Instale OpenSSH client (Windows) e tente novamente."
  exit 1
}

if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
  Write-Error "ssh não encontrado. Instale OpenSSH client (Windows) e tente novamente."
  exit 1
}

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$EnvFile = Join-Path $RepoRoot ".env"

if (-not (Test-Path -Path $EnvFile -PathType Leaf)) {
  Write-Error ".env não encontrado em $EnvFile"
  exit 1
}

scp -P $Port $EnvFile "$User@$SshHost`:/tmp/connect-ecommerce.env"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$RestartCmd = ""
if ($Restart) {
  $RestartCmd = @"
pm2 delete $ProcessName || true
pm2 start bash --name "$ProcessName" -- -lc "cd `"$AppDir`"; set -a; . ./.env; set +a; npm start -- -p 3000"
pm2 save
"@
}

$RemoteCmd = @'
set -eu
export NVM_DIR="/home/{0}/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use {1} >/dev/null 2>&1 || true
cd "{2}"
mv /tmp/connect-ecommerce.env .env
sed -i 's/\r$//' .env
chmod 600 .env
{3}
'@ -f $User, $NodeVersion, $AppDir, $RestartCmd

$RemoteCmd = $RemoteCmd -replace "`r", ""
$RemoteB64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($RemoteCmd))
$ExecCmd = "echo '$RemoteB64' | base64 -d | bash"
ssh -p $Port "$User@$SshHost" $ExecCmd
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
