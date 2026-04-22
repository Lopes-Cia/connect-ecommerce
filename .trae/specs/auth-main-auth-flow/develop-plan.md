# Plano (develop) — replicar e refatorar com referência da main

## Objetivo

Reproduzir em `develop` o fluxo de `app/(auth)` que funciona na `main`, usando como referência os arquivos em `main-code.md`, e então aplicar uma refatoração **limitada à conexão do auth** para evitar que o login por token dependa do carregamento de integration config.

## Premissas

- Escopo estrito: `app/(auth)` + conexões diretas necessárias para ele funcionar (`app/api/auth/*`, `lib/api/auth.ts`, `contexts/AuthContext.tsx`, `lib/auth/*`, e o mínimo em `lib/integration/*` que for chamado por `/api/auth/*`).
- Não mexer em rotas de produtos/loja/categorias/etc.
- Verificação: apenas erros de sintaxe/TypeScript (diagnósticos).

## Estado atual (develop) observado

- `app/(auth)/login/page.tsx` está com seleção condicional por `NEXT_PUBLIC_FONTE` para renderizar `login_ori`.
- Existe `app/(auth)/login_ori/*` com o formulário de token.
- As rotas `app/api/auth/*` estão iguais às da `main` e chamam `ensureAuthReady()`.
- O erro relatado aparece quando `ensureAuthReady()` entra em `requestIntegrationConfig()` e falha com `"Failed to fetch integration config"`.

## Etapa 1 — Congelar a referência (sem mudar lógica)

- Manter a pasta `.trae/specs/auth-main-auth-flow/` como “fonte” do que a `main` faz.
- Quando precisar comparar, usar esses arquivos como checklist de equivalência.

## Etapa 2 — Replicar o fluxo da main no front de auth (se necessário)

Critério: `GET /login` deve apresentar o fluxo de token em 2 passos (send/verify) idêntico ao da `main`.

- Garantir que o formulário que você quer usar (`login_ori/_components/LoginForm.tsx`) permaneça semanticamente igual ao `main`:
  - Chama `sendLoginToken` e `verifyLoginToken` de `lib/api/auth.ts`
  - Após verify, chama `refreshSession` e redireciona.

## Etapa 3 — Refatoração segura da conexão (apenas /api/auth/*)

### Problema específico

Hoje as rotas `/api/auth/send-token`, `/api/auth/verify-token`, `/api/auth/register` dependem de `ensureAuthReady()`, que executa um boot mais amplo do que elas precisam, incluindo `requestIntegrationConfig()`.

### Direção da refatoração

Criar uma alternativa ao `ensureAuthReady()` voltada só para autenticação no `AUTH_BASE_URL`, reaproveitando o padrão do `lopesBackClient.ts`:

- Um módulo `lib/integration/authWebserviceClient.ts` (server-only) que:
  - Faz `ensureToken()` (cache + refresh) usando o mesmo `tokenService` já usado hoje
  - Não chama `requestIntegrationConfig()`
  - Expõe um helper para obter `Authorization` (`toRawToken(token.hashToken)`)

Depois:

- Atualizar apenas:
  - `app/api/auth/send-token/route.ts`
  - `app/api/auth/verify-token/route.ts`
  - `app/api/auth/register/route.ts`
- Para usar `authWebserviceClient.ensureToken()` (ou `getAuthHeader()`), em vez de `ensureAuthReady()`.

### Critérios de aceite (mínimos)

- `/api/auth/send-token` continua aceitando `{email|whatsapp}` e retornando `{ success, data|message }`.
- `/api/auth/verify-token` continua retornando `{ success, data: { verification, operador } }` e gravando cookie `session`.
- `/api/auth/register` continua aceitando `{ responsavel, cnpj, email, whatsapp }` e chamando `postAutenticaAplicativo` com `chaveAtivacao`.
- O fluxo `app/(auth)` não dispara mais o caminho `requestIntegrationConfig()` durante login/register.
- TypeScript/diagnósticos sem erros nos arquivos alterados.

## Etapa 4 — Comparação final (main vs develop) no escopo

Gerar um checklist final:

- UI `app/(auth)` bate com a referência desejada (main-code.md)
- Rotas `/api/auth/*` batem em contrato e não dependem do boot completo
- Sessão (cookie `session`) e `AuthContext` continuam funcionando igual

