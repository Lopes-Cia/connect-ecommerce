## .trae/skills

Pasta para documentar e padronizar descoberta/adoção de skills.

### Fontes

- Trae (interno): usar a skill `find-skills` para descobrir capacidades reutilizáveis já disponíveis no IDE.
- skills.sh (externo): ecossistema de skills instaláveis via `npx skills add <owner/repo>` (projeto por padrão).

### Regras de uso

- Sempre preferir `find-skills` quando a necessidade for “como fazer X”.
- Usar skills.sh quando:
  - não existir skill equivalente no Trae, ou
  - for necessário instalar uma skill nova para o projeto/time.
- Política do projeto:
  - a IA pode decidir e instalar
  - SEMPRE instalar em nível de projeto (sem `-g/--global`)
  - manter 3–5 skills boas por especialista (SEARCHER/CODER/DESIGNER/TESTER/QUALITY)

### Wrappers

- `scripts/skills.ps1` (Windows)
- `scripts/skills.sh` (bash)

### Onde fica instalado

- Trae (projeto): `.trae/skills/` (este repo)
- Regra: instalar apontando o agente `Trae` para evitar criar pastas de outros agentes no repo
