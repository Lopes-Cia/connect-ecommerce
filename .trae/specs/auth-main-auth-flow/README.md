# Auth (main) — Fluxo e Referência

Este pacote documenta o fluxo que funciona na branch `main` referente a `app/(auth)` e suas conexões diretas (`/api/auth/*` e chamadas externas).

**Escopo**

- UI: `app/(auth)/login`, `app/(auth)/register`, `app/(auth)/layout`
- API interna: `app/api/auth/*`
- Clients internos: `lib/api/auth.ts`, `lib/api/client.ts`
- Sessão: `contexts/AuthContext.tsx`, `lib/auth/session.ts`
- Conexão externa: `lib/auth/externalApi.ts`, `lib/integration/authService.ts` (somente porque é dependência atual das rotas `/api/auth/*`)

**Artefatos**

- `main-map.md`: mapa do fluxo (UI → /api/auth → externo), contratos e pontos de falha
- `main-code.md`: cópia dos arquivos-chave da `main` (para usar como referência ao replicar na develop)
- `develop-plan.md`: plano de replicação/refatoração na develop, limitado ao escopo `app/(auth)`

**Worktree**

Uma cópia da branch `main` foi criada em `c:\LOPES\www\connect-ecommerce__main_worktree` para inspeção segura (sem alterar o estado da sua `develop`).

