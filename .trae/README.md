## .trae (MDK-ELIS)

- Pasta de artefatos internos do Trae Solo.
- Não guardar lógica de produto aqui; apenas specs, checklists, templates e metadados de agentes.

### Estrutura recomendada

- `.trae/specs/<slug>/spec.md` – contexto e decisões de pesquisa/implementação
- `.trae/specs/<slug>/tasks.md` – lista de tarefas executáveis derivadas da spec
- `.trae/specs/<slug>/checklist.md` – critérios de aceite/validação

### Convenções de slug

- `research-<tema>-<foco>` para pesquisa parruda (via SEARCHER), ex.:
  - `research-nextjs-routing`
  - `research-tailwind-design-system`
  - `research-testing-strategy`
- `impl-<feature>-<contexto>` para specs de implementação (via CODER), ex.:
  - `impl-dashboard-auth-nextjs`
  - `impl-landing-page-hero`

### Relação com IA/

- Definições de especialistas e regras vivem em: `IA/AGENTS/*` e `IA/RULES/*`.
- O SEARCHER gera specs em `.trae/specs/*` (research).
- CODER, DESIGNER, TESTER e QUALITY consomem/referenciam essas specs e podem criar novas specs de implementação.

### Skills

- Descoberta no Trae: usar a skill `find-skills`.
- Ecossistema externo: skills.sh (instalação via `npx skillsadd <owner/repo>`), com wrappers em `scripts/skills.*`.
