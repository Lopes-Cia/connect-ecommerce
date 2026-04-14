#!/usr/bin/env bash
set -euo pipefail

die() {
  printf "%s\n" "$1" >&2
  exit 1
}

cmd="${1:-help}"
repo="${2:-}"

if [[ "$cmd" == "help" ]]; then
  printf "%s\n" "Uso:"
  printf "%s\n" "  ./scripts/skills.sh help"
  printf "%s\n" "  ./scripts/skills.sh add <owner/repo> [--skill <name> ...] [--agent <name> ...]"
  printf "%s\n" ""
  printf "%s\n" "Notas:"
  printf "%s\n" "  - Instalação é SEMPRE nível de projeto (sem -g/--global)."
  printf "%s\n" "  - Comando base: npx skills add <owner/repo>"
  exit 0
fi

if [[ "$cmd" != "add" ]]; then
  die "Comando inválido: $cmd"
fi

if [[ -z "$repo" ]]; then
  die "Repo obrigatório. Ex.: ./scripts/skills.sh add owner/repo"
fi

if ! command -v npx >/dev/null 2>&1; then
  die "npx não encontrado. Instale Node.js (inclui npm/npx) e tente novamente."
fi

shift 2

npx -y skills add "$repo" --agent Trae --copy "$@"
