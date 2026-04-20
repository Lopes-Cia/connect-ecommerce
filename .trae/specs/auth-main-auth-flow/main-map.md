# Mapa do fluxo (main) — app/(auth)

## Arquivos de entrada (UI)

- Layout do grupo auth: [layout.tsx](file:///c:/LOPES/www/connect-ecommerce__main_worktree/app/(auth)/layout.tsx)
- Login: [login/page.tsx](file:///c:/LOPES/www/connect-ecommerce__main_worktree/app/(auth)/login/page.tsx)
- Form de login (token 2 passos): [login/_components/LoginForm.tsx](file:///c:/LOPES/www/connect-ecommerce__main_worktree/app/(auth)/login/_components/LoginForm.tsx)
- Register: [register/page.tsx](file:///c:/LOPES/www/connect-ecommerce__main_worktree/app/(auth)/register/page.tsx)
- Form de register: [register/_components/RegisterForm.tsx](file:///c:/LOPES/www/connect-ecommerce__main_worktree/app/(auth)/register/_components/RegisterForm.tsx)

## Chamadas internas (browser → Next)

### Login (token)

1) UI chama `sendLoginToken({ email | whatsapp })` em [auth.ts](file:///c:/LOPES/www/connect-ecommerce__main_worktree/lib/api/auth.ts)
2) `apiClient` chama `POST /api/auth/send-token` via [client.ts](file:///c:/LOPES/www/connect-ecommerce/lib/api/client.ts)
3) Route Handler [send-token/route.ts](file:///c:/LOPES/www/connect-ecommerce__main_worktree/app/api/auth/send-token/route.ts)
4) Route Handler chama sistema externo `POST {AUTH_BASE_URL}/enviarToken?email=...` ou `...?whatsapp=...`

### Verify (token)

1) UI chama `verifyLoginToken({ token })` em [auth.ts](file:///c:/LOPES/www/connect-ecommerce__main_worktree/lib/api/auth.ts)
2) `apiClient` chama `POST /api/auth/verify-token`
3) Route Handler [verify-token/route.ts](file:///c:/LOPES/www/connect-ecommerce__main_worktree/app/api/auth/verify-token/route.ts)
4) Externo:
   - `POST {AUTH_BASE_URL}/verificarTokenSistema?token=...`
   - `GET  {AUTH_BASE_URL}/getOperadorSistemaForId?id=...`
5) Em sucesso, grava cookie `session` via [setSession](file:///c:/LOPES/www/connect-ecommerce__main_worktree/lib/auth/session.ts#L27-L36)

### Sessão (AuthContext)

- No carregamento do app, [AuthContext.tsx](file:///c:/LOPES/www/connect-ecommerce__main_worktree/contexts/AuthContext.tsx) chama `GET /api/auth/me` (via `getCurrentSession`) para popular `user` no client.
- No logout, chama `POST /api/auth/logout`.

### Register

1) UI chama `registerUser(payload)` em [auth.ts](file:///c:/LOPES/www/connect-ecommerce__main_worktree/lib/api/auth.ts)
2) `POST /api/auth/register`
3) Route Handler [register/route.ts](file:///c:/LOPES/www/connect-ecommerce__main_worktree/app/api/auth/register/route.ts)
4) Externo: `POST {AUTH_BASE_URL}/postAutenticaAplicativo` com `chaveAtivacao` vindo de [getActivationKey](file:///c:/LOPES/www/connect-ecommerce__main_worktree/lib/auth/externalApi.ts#L9-L11)

## Dependência crítica atual nas rotas /api/auth/*

As rotas `/api/auth/send-token`, `/api/auth/verify-token` e `/api/auth/register` chamam:

- `ensureAuthReady({ backgroundRefresh: false })` em [authService.ts](file:///c:/LOPES/www/connect-ecommerce__main_worktree/lib/integration/authService.ts#L283-L308)

O `ensureAuthReady` quando não há estado completo executa um boot que inclui:

- `requestTokenByProduct()` (gera token)
- `requestIntegrationConfig()` (busca configuração) em [authService.ts](file:///c:/LOPES/www/connect-ecommerce__main_worktree/lib/integration/authService.ts#L142-L165)

**Ponto de falha observado**

- O erro `"Failed to fetch integration config"` é lançado em `requestIntegrationConfig()` quando `status !== 200` ([authService.ts](file:///c:/LOPES/www/connect-ecommerce__main_worktree/lib/integration/authService.ts#L160-L162)).

## Variáveis de ambiente envolvidas (inferidas pela leitura dos módulos)

- `AUTH_BASE_URL`: base do webservice de autenticação (`getAuthWebserviceBaseUrl`)
- `KEY`: chave de ativação no register (`getActivationKey`)
- No boot de `ensureAuthReady`:
  - `INTEGRATION_URL_API`, `ID_INTEGRADORA`, `PRODUTO`, `EAN`, `COD_CLI` (usadas para token/config)

