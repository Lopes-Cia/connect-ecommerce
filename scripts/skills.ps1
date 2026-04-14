param(
  [Parameter(Position = 0)]
  [ValidateSet("help", "add")]
  [string]$Command = "help",

  [Parameter(Position = 1)]
  [string]$Repo,

  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Args
)

$IsDotSourced = $MyInvocation.InvocationName -eq "."
if (-not $IsDotSourced) {
  Set-StrictMode -Version Latest
}
$ErrorActionPreference = "Stop"

if ($Command -eq "help") {
  Write-Output "Uso:"
  Write-Output "  pwsh scripts/skills.ps1 help"
  Write-Output "  pwsh scripts/skills.ps1 add <owner/repo> [--skill <name> ...] [--agent <name> ...]"
  Write-Output ""
  Write-Output "Notas:"
  Write-Output "  - Instalação é SEMPRE nível de projeto (sem -g/--global)."
  Write-Output "  - Comando base: npx skills add <owner/repo>"
  exit 0
}

if (-not $Repo) {
  Write-Error "Repo obrigatório. Ex.: pwsh scripts/skills.ps1 add owner/repo"
  exit 1
}

if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
  Write-Error "npx não encontrado. Instale Node.js (inclui npm/npx) e tente novamente."
  exit 1
}

npx -y skills add $Repo --agent Trae --copy @Args
