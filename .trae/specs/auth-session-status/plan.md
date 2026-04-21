# /plan — Detectar “logado/deslogado” (sessão por cookie) em toda a UI

## Objetivo

Garantir que a aplicação consiga **identificar e refletir** o estado de “logado/deslogado” usando como fonte da verdade a **sessão por cookie** (`session`, via `AuthContext` e `/api/auth/me`) em **todos os pontos de UI relevantes** (Header, SidebarMenu e Dashboard), sem mexer no código das páginas que dependem do `clientes-store` para o mock-end.

## Premissas e restrições

- **Fonte da verdade (backend):** `AuthContext` (`isAuthenticated` / `user`) que vem de `GET /api/auth/me` (cookie `session`).
- **Não modificar** o fluxo existente que usa `clientes-store` nas páginas `/cliente/*` (mock-end). Essas páginas continuam existindo e devem permanecer como estão.
- A UI deve conseguir **alternar** entre duas origens:
  - **Backend mode:** sessão via cookie (`AuthContext`).
  - **Mock mode:** estado local do `clientes-store`.
- Preferência de validação: **somente diagnósticos TypeScript/sintaxe**, sem build/lint completo.

## Situação atual (diagnóstico)

- `AuthProvider` está montado globalmente via [AppProviders.tsx](file:///c:/LOPES/www/connect-ecommerce/components/providers/AppProviders.tsx) e carrega sessão em [AuthContext.tsx](file:///c:/LOPES/www/connect-ecommerce/contexts/AuthContext.tsx).
- O **Header da loja** e o **SidebarMenu mobile** usam `useClientesStore.isLoggedIn`, portanto não refletem login por cookie:
  - [Header.tsx](file:///c:/LOPES/www/connect-ecommerce/components/layout/Header.tsx)
  - [SidebarMenu.tsx](file:///c:/LOPES/www/connect-ecommerce/components/layout/SidebarMenu.tsx)
- O **Dashboard** usa `AuthContext` e é protegido por `middleware` via cookie `session`:
  - [DashboardSidebar.tsx](file:///c:/LOPES/www/connect-ecommerce/components/layout/DashboardSidebar.tsx)
  - [middleware.ts](file:///c:/LOPES/www/connect-ecommerce/middleware.ts)

## Estratégia (alto nível)

1) Definir um “modo” de origem de dados no client:
   - **Backend mode:** `NEXT_PUBLIC_FONTE === "lopes"` (mesma convenção já usada hoje para escolher login).
   - **Mock mode:** qualquer outro valor.
2) No **Header** e **SidebarMenu** (somente UI), alternar a fonte de “logado”:
   - Se Backend mode: usar `useAuth()` (`isAuthenticated`, `user`, `logoutUser`).
   - Se Mock mode: manter exatamente como está hoje (`useClientesStore`).
3) Padronizar links/ações no Backend mode:
   - “Minha conta” deve apontar para `/dashboard` (fonte cookie + middleware).
   - “Sair” deve chamar `logoutUser()` (que chama `/api/auth/logout`) e redirecionar para `/login`.

## Passos de implementação (sequência segura)

### Passo 1 — Adicionar um helper pequeno de “modo”

- Criar um util client-safe (ex.: `lib/runtime/appMode.ts`) com:
  - `export function isBackendMode(): boolean` baseado em `process.env.NEXT_PUBLIC_FONTE`.
- Isso evita duplicar lógica em vários componentes e deixa explícito o “alternar entre 2 origens”.

### Passo 2 — ShopHeader: refletir sessão por cookie quando Backend mode

- Arquivo: [Header.tsx](file:///c:/LOPES/www/connect-ecommerce/components/layout/Header.tsx)
- Alterações:
  - Importar `useAuth()` e o helper de modo.
  - Se Backend mode:
    - `isLoggedIn = isAuthenticated`
    - Links: “Minha conta” → `/dashboard`
    - Logout: `await logoutUser()` (mantendo confirmação via `frontModal`)
  - Se Mock mode:
    - Não tocar no fluxo atual baseado em `useClientesStore`.

### Passo 3 — SidebarMenu mobile: refletir sessão por cookie quando Backend mode

- Arquivo: [SidebarMenu.tsx](file:///c:/LOPES/www/connect-ecommerce/components/layout/SidebarMenu.tsx)
- Alterações:
  - Importar `useAuth()` e helper de modo.
  - Se Backend mode:
    - Renderizar uma variante “Authenticated” baseada em `user` do AuthContext:
      - Nome: `user.name || user.email || "Usuário"`
      - Links: Home, Dashboard (`/dashboard`), e opcionalmente “Voltar para Loja”.
      - Logout: `await logoutUser()` + redirect `/login`.
    - Renderizar “Guest” com links `/login` e `/register` (igual hoje, só sem depender de store).
  - Se Mock mode:
    - Manter o comportamento atual intacto (`clientes-store` + páginas `/cliente/*`).

### Passo 4 — Dashboard (conferência)

- Não mudar `DashboardSidebar.tsx` (já usa `useAuth()` corretamente).
- Não mudar `middleware.ts` (proteção por cookie é compatível com Backend mode).

## Validação

- Rodar apenas diagnósticos TypeScript nos arquivos alterados (sem build/lint completo).
- Checagem manual (rápida):
  - Backend mode (`NEXT_PUBLIC_FONTE=lopes`):
    - Após login token, Header/Sidebar mostram “Minha conta” e “Sair” e o nome/email do operador.
    - “Minha conta” leva ao `/dashboard` e não redireciona para `/login`.
    - “Sair” remove cookie e volta para `/login`.
  - Mock mode:
    - Header/Sidebar permanecem usando `clientes-store` e os links `/cliente/*` continuam iguais.

## Rollback (gatilho)

- Antes de iniciar a implementação, criar um tag de backup (ex.: `backup/auth-session-status-start-YYYYMMDD`) e um script de rollback equivalente ao já existente em `.trae/scripts/`.

