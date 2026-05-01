# Relatório — Login e Sessão (connect-ecommerce)

## Objetivo

Este documento descreve como o projeto implementa login, como a sessão é armazenada, e quais são os pontos de atenção do fluxo atual.

## Visão geral (importante)

Atualmente existem **dois mecanismos distintos** relacionados a “estar logado”:

1) **Sessão `session` (server / operador)**
- Criada no backend (BFF) após validação do token.
- Armazenada em cookie **httpOnly** `session`.
- Lida via `GET /api/auth/me` para preencher o `AuthContext`.

2) **Login “cliente” (frontend / área `/cliente/*`)**
- Controlado por cookie **não httpOnly** `clientes_logged_in` (setado no browser).
- Estado adicional (`loginData`) fica em memória em um store Zustand (`clientes-store`).
- A proteção de rotas `/cliente/*` é baseada **somente** em `clientes_logged_in`.

## Componentes e rotas (frontend)

- Página: `app/(auth)/login/page.tsx` (usa `LoginForm`).
- Form principal: `app/(auth)/login/_components/LoginForm.tsx`.
- Sessão no client: `contexts/AuthContext.tsx` (carrega `GET /api/auth/me` no mount).
- Providers globais: `components/providers/AppProviders.tsx` → montado em `app/layout.tsx`.

## Fluxo de login (passo a passo)

### 1) Enviar token (email/whatsapp)

1. Usuário informa email/whatsapp na UI (`LoginForm`).
2. Front chama `sendLoginToken(payload)` (`lib/api/auth.ts`).
3. Isso chama `POST /api/auth/send-token`.
4. O BFF chama o serviço externo de auth em:
   - `AUTH_BASE_URL/enviarToken?email=...` ou
   - `AUTH_BASE_URL/enviarToken?whatsapp=...`
5. O BFF envia `Authorization` usando o token do **tokenService** (token de integração).

### 2) Verificar token

1. Usuário informa o token recebido.
2. Front chama `verifyLoginToken({ token })`.
3. Isso chama `POST /api/auth/verify-token`.
4. O BFF:
   - Chama `AUTH_BASE_URL/verificarTokenSistema?token=...`
   - Depois chama `AUTH_BASE_URL/getOperadorSistemaForId?id=...`
5. Se OK, o BFF grava o cookie `session` via `setSession()`.

### 3) Popular estado no frontend

1. Após verificar token, o frontend chama `refreshSession()` (AuthContext).
2. `refreshSession()` chama `GET /api/auth/me`.
3. `GET /api/auth/me` lê o cookie `session` (server) e devolve para o client.
4. O AuthContext define `user` e então `isAuthenticated` vira `true`.

## Onde o login é armazenado

### Cookie `session` (httpOnly)

- Nome do cookie: `session`
- Flags:
  - `httpOnly: true`
  - `sameSite: lax`
  - `secure: true` apenas em produção
  - `maxAge: 7 dias`
- Conteúdo:
  - O cookie é gravado como `JSON.stringify(session)`
  - Campos atuais: `{ userId, email, token, name? }`
- Implementação: `lib/auth/session.ts`

### Cookie `clientes_logged_in` (não httpOnly)

- Nome do cookie: `clientes_logged_in`
- É criado/removido no browser via `document.cookie`
- Duração: `Max-Age=604800` (7 dias)
- Implementação: `stores/clientes-store.ts`

### Store Zustand (memória)

- `stores/clientes-store.ts` mantém:
  - `isLoggedIn`
  - `loginData` (dados do cliente, endereços, privacidade, etc.)
- Não há persistência visível em `localStorage` nesse store: quando a página recarrega, apenas `isLoggedIn` é reidratado via cookie `clientes_logged_in`.

## Proteção de rotas (middleware)

- Arquivo: `middleware.ts`
- Protege apenas: `/cliente/:path*`
- Regra atual:
  - Se **não** existe cookie `clientes_logged_in` → redireciona para `/login`
  - Se existe → libera
- Observação: `session` (cookie httpOnly do operador) **não é usado** no middleware.

## Logout

- Endpoint: `POST /api/auth/logout`
  - Remove apenas o cookie `session` (server-side).
- Não remove o cookie `clientes_logged_in` (porque ele é setado no client).

## Pontos de atenção (riscos e inconsistências)

### 1) Duas fontes de “auth” com comportamentos diferentes

- `session` (server) e `clientes_logged_in` (client) coexistem.
- A área `/cliente/*` é liberada por `clientes_logged_in` mesmo sem sessão `session`.

### 2) Cookie `session` não possui validação de integridade

- `getSession()` faz `JSON.parse` do cookie e aceita como sessão válida.
- Não há assinatura, criptografia, schema validation, nem controle de expiração próprio (além do `maxAge` do cookie).

### 3) Cookie `clientes_logged_in` é fraco (forjável)

- Por ser criado via `document.cookie`, não é httpOnly e pode ser forjado no browser.
- O middleware usa apenas esse cookie para liberar `/cliente/*`.

### 4) Fluxo de “cliente” está com dados mock

- Após validar token, o `LoginForm` seta `loginData` com `mock-token` e `meus_dados.id: "1"`.
- Isso indica que a “sessão de cliente” ainda não é derivada de um retorno real.

### 5) Expiração do token externo pode não estar alinhada

- O serviço externo retorna dados com `dtExpira` no verify-token.
- A sessão local é gravada com `maxAge: 7 dias`, sem checar se o token externo expirou antes.

### 6) Logs de debug em fluxo de auth

- Existe `console.log` no envio de token no frontend e no backend, o que gera ruído e pode expor comportamento indevido em produção.

## Recomendações (mínimo seguro, por prioridade)

### Curto prazo (alto impacto, baixo risco)

1) Remover logs de debug do fluxo de auth.
2) No `middleware`, substituir a regra de `clientes_logged_in` por uma validação baseada na sessão real (ou seja, um mecanismo verificável no server).
3) No `LoginForm`, remover `loginData` mock e preencher `loginData` a partir de um endpoint real (ou então eliminar a segunda “auth” se não for necessária).

### Médio prazo (segurança)

1) Assinar/criptografar o cookie `session` (ou migrar para JWT assinado), e validar em `getSession()`.
2) Alinhar expiração do cookie/sessão com `dtExpira` retornado pelo serviço externo.
3) Revisar o modelo: separar claramente “Operador (backoffice)” vs “Cliente (área cliente)”, com contratos e guards consistentes.

## Referências (arquivos chave)

- `app/(auth)/login/_components/LoginForm.tsx`
- `app/api/auth/send-token/route.ts`
- `app/api/auth/verify-token/route.ts`
- `app/api/auth/me/route.ts`
- `app/api/auth/logout/route.ts`
- `lib/auth/session.ts`
- `contexts/AuthContext.tsx`
- `stores/clientes-store.ts`
- `middleware.ts`

