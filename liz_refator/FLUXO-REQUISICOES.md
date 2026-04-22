# Fluxo de requisições (Front → Back → Back → Front)

## Objetivo

Descrever, com base no código atual, como as requisições atravessam o sistema:

- Front → Back (browser/client → BFF Next `/api/*`)
- Back → Back (BFF → serviços externos via `lib/integration/**`)
- Back → Front (respostas/erros padronizados retornando ao client)

Este documento também define os pontos de extensão para a refatoração em `liz_refator/`.

## Front → Back (browser → BFF)

**Entrypoint principal**
- O client chama o BFF (rotas internas) via [apiClient](file:///c:/LOPES/www/connect-ecommerce/lib/api/client.ts), que executa `fetch("/api" + endpoint)`.

**Exemplo real (página de categoria)**
- Tela: [categoria/[...slug]/page.tsx](file:///c:/LOPES/www/connect-ecommerce/app/(shop)/categoria/%5B...slug%5D/page.tsx)
- Quando o usuário abre uma URL como `/categoria/cervejas`, a página monta `slugPath` e dispara:
  - `loadCategoriaBySlug({ slug: slugPath })` e depois `loadProdutosByCategoria({ idCategoria, includeDescendants: 0, page, pageSize: 24 })` (ver [CategoriaPage](file:///c:/LOPES/www/connect-ecommerce/app/(shop)/categoria/%5B...slug%5D/page.tsx#L184-L224)).
- Essas chamadas passam pela store [produtos-store.ts](file:///c:/LOPES/www/connect-ecommerce/stores/produtos-store.ts):
  - `loadCategoriaBySlug` → `getCategoriaBySlug(key)` ([produtos-store.ts](file:///c:/LOPES/www/connect-ecommerce/stores/produtos-store.ts#L227-L253))
  - `loadProdutosByCategoria` → `getProdutosByCategoria(...)` ([produtos-store.ts](file:///c:/LOPES/www/connect-ecommerce/stores/produtos-store.ts#L300-L330))
- Os wrappers em [lib/api/produtos.ts](file:///c:/LOPES/www/connect-ecommerce/lib/api/produtos.ts) montam os endpoints:
  - Categoria por slug: `GET /api{produtosBasePath()}/categorias/by-slug/<slug>` ([produtos.ts](file:///c:/LOPES/www/connect-ecommerce/lib/api/produtos.ts#L38-L49))
  - Produtos por categoria: `GET /api{produtosBasePath()}/by-categoria/:idCategoria?includeDescendants=0&page=1&pageSize=24` ([produtos.ts](file:///c:/LOPES/www/connect-ecommerce/lib/api/produtos.ts#L51-L73))
  - `produtosBasePath()` alterna entre `/produtos` e `/lopes/produtos` dependendo de `NEXT_PUBLIC_FONTE` ([produtos.ts](file:///c:/LOPES/www/connect-ecommerce/lib/api/produtos.ts#L24-L26)).

### Prova do fluxo — Categoria (trace verificável)

**Caso:** abrir `/categoria/cervejas` no browser.

**1) Page (React)**
- `slugParts` vem de `params.slug` e `slugPath` é montado como ``/categoria/${slugParts.join("/")}`` ([page.tsx](file:///c:/LOPES/www/connect-ecommerce/app/(shop)/categoria/%5B...slug%5D/page.tsx#L158-L162)).
- Em seguida, a página executa (nesta ordem): `loadCategoriaBySlug({ slug: slugPath })` → `loadProdutosByCategoria({ idCategoria, includeDescendants: 0, page, pageSize: 24 })` ([page.tsx](file:///c:/LOPES/www/connect-ecommerce/app/(shop)/categoria/%5B...slug%5D/page.tsx#L184-L203)).

**2) Store (Zustand)**
- `loadCategoriaBySlug` chama `getCategoriaBySlug(key)` ([produtos-store.ts](file:///c:/LOPES/www/connect-ecommerce/stores/produtos-store.ts#L227-L253)).
- `loadProdutosByCategoria` chama `getProdutosByCategoria(idCategoria, params)` ([produtos-store.ts](file:///c:/LOPES/www/connect-ecommerce/stores/produtos-store.ts#L300-L330)).

**3) Wrapper `lib/api/*` (montagem do endpoint)**
- `getCategoriaBySlug(slugPath)` normaliza:
  - remove `/` inicial, faz split por `/`, trim e `encodeURIComponent` por segmento (preserva `categoria/<...>` como parte do slug) ([produtos.ts](file:///c:/LOPES/www/connect-ecommerce/lib/api/produtos.ts#L38-L49)).
- `getProdutosByCategoria` monta querystring (quando presente) com `includeDescendants`, `page`, `pageSize` ([produtos.ts](file:///c:/LOPES/www/connect-ecommerce/lib/api/produtos.ts#L51-L73)).

**4) `apiClient` (BFF `/api/*`)**
- A chamada é sempre `fetch("/api" + endpoint)` com normalização de `/` e tratamento de erro via `ApiError` ([client.ts](file:///c:/LOPES/www/connect-ecommerce/lib/api/client.ts#L1-L55)).

**5) Endpoint final (depende de `NEXT_PUBLIC_FONTE`)**
- `NEXT_PUBLIC_FONTE !== 'lopes'`:
  - categoria: `GET /api/produtos/categorias/by-slug/categoria/cervejas`
  - produtos: `GET /api/produtos/by-categoria/<idCategoria>?includeDescendants=0&page=1&pageSize=24`
- `NEXT_PUBLIC_FONTE === 'lopes'`:
  - categoria: `GET /api/lopes/produtos/categorias/by-slug/categoria/cervejas`
  - produtos: `GET /api/lopes/produtos/by-categoria/<idCategoria>?includeDescendants=0&page=1&pageSize=24`

**Camadas típicas no client**
- Componentes/contexts chamam stores (Zustand) ou wrappers `lib/api/*`.
  - Ex.: [AuthContext](file:///c:/LOPES/www/connect-ecommerce/contexts/AuthContext.tsx) chama `getCurrentSession()` → `/api/auth/me` via [lib/api/auth.ts](file:///c:/LOPES/www/connect-ecommerce/lib/api/auth.ts).
  - Ex.: fluxo de login de clientes passa por store e usa `apiClient` direto ([clientes-store.ts](file:///c:/LOPES/www/connect-ecommerce/stores/clientes-store.ts)).
  - Ex.: pipeline de checkout é orquestrado por store e dispara múltiplas rotas `/api/checkout/*` ([pedidos-store.ts](file:///c:/LOPES/www/connect-ecommerce/stores/pedidos-store.ts)).

**Erros no client**
- `apiClient` lança `ApiError` quando `!response.ok` e tenta extrair `message` do JSON retornado pela API ([client.ts](file:///c:/LOPES/www/connect-ecommerce/lib/api/client.ts)).

## Back (BFF) — Next Route Handlers

**Onde vivem as rotas**
- Route Handlers em `app/api/**/route.ts` (ex.: [register/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/auth/register/route.ts)).

**Padrões de entrada**
- Querystring via `request.nextUrl.searchParams` (quando `NextRequest`) ou `new URL(request.url)` (quando `Request`).
- Body via `await request.json()` e validações manuais simples por campo.

**Padrões de saída**
- Em geral retornam JSON via `NextResponse.json(...)` com status adequado:
  - `400` para validação/parâmetro inválido
  - `401` quando não há sessão em `/api/auth/me`
  - `201` em criações (ex.: criação de sessão de checkout)
  - `500` em erro inesperado

## Back → Back (BFF → serviços externos)

O BFF chama serviços externos principalmente via `lib/integration/**`.

**Exemplo real (categoria por slug)**
- Rota do BFF chamada pelo browser (depende de `NEXT_PUBLIC_FONTE` via `produtosBasePath()` no client):
  - `GET /api/produtos/categorias/by-slug/<...slug>` ([route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/produtos/categorias/by-slug/%5B...slug%5D/route.ts))
  - `GET /api/lopes/produtos/categorias/by-slug/<...slug>` ([route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/lopes/produtos/categorias/by-slug/%5B...slug%5D/route.ts))
- Handler (padrão `/api/produtos/...`):
  - monta `safeSlug = parts.join('/')` a partir do catch-all `[...slug]` ([route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/produtos/categorias/by-slug/%5B...slug%5D/route.ts#L13-L22))
  - chama `getCategoriaBySlug(safeSlug)` do service [produtosService.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/produtosService.ts#L84-L100)
- Handler (lopes `/api/lopes/produtos/...`):
  - monta `safeSlug` igual, normaliza para `/<safeSlug>`, lê snapshot `lib/mockups/data/categorias.json` e encontra a categoria no tree (caso especial `/categoria/sem-categoria`) ([route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/lopes/produtos/categorias/by-slug/%5B...slug%5D/route.ts#L28-L67))
  - retorna header `x-data-source: categorias.json` para deixar a origem explícita ([route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/lopes/produtos/categorias/by-slug/%5B...slug%5D/route.ts#L51-L67))
- Dentro de `produtosService` (padrão `/api/produtos/...`):
  - monta URL usando `INTEGRATION_URL_API` via [getIntegrationEnvConfig](file:///c:/LOPES/www/connect-ecommerce/lib/integration/config.ts#L58-L74)
  - executa `fetchWithRetry` + `readResponseData` em [network.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/network.ts)
  - endpoint upstream (path fixo do legado): `/Servidor/webservice/integration/produtos/categorias/by-slug/<slug>` ([produtosService.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/produtosService.ts#L84-L100))

### Stack HTTP (legado atual)

- **Execução HTTP base (fetch + retry de rede + parse):**
  - `fetchWithRetry` e `readResponseData` em [network.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/network.ts)
  - Retry atual ocorre apenas quando `fetch(...)` lança (falha de rede), não por `5xx/429`.
- **Erro HTTP padronizado (carrega status + url + data parseada):**
  - `HttpError` em [network.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/network.ts)
- **Client “business” (injeta Authorization + refresh em 401/403):**
  - `businessRequest` em [httpClient.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/httpClient.ts)

### Autenticação server-side (duas trilhas)

- **Bundle de integração (token + keyBean.urlApi + integrationConfig):**
  - Boot/refresh em [authService.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/authService.ts)
  - Config/env em [config.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/config.ts)
- **Token “auth webservice” (rotas `/api/auth/*`):**
  - Cache/refresh em [authWebserviceClient.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/authWebserviceClient.ts)

## Back → Front (BFF → browser)

**Duas classes de erro**
- **Erro upstream controlado (HTTP):** geralmente representado por `HttpError`, com `status` e `data` do serviço externo.
- **Erro inesperado:** exceções não-HTTP (ex.: parse inválido, bug, falha após esgotar retry de rede) retornam `500`.

**Exemplo real (mapeamento de erro na rota de categoria)**
- Se o upstream falhar e o service lançar `HttpError`, o handler retorna:
  - `status = error.status`
  - body = `error.data` (ou `{ success:false, message:'Erro na integração (produtos)' }`) ([route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/produtos/categorias/by-slug/%5B...slug%5D/route.ts#L26-L36))
- No client, `apiClient` interpreta `!response.ok` como erro e lança `ApiError`, tentando extrair `message` do JSON retornado ([client.ts](file:///c:/LOPES/www/connect-ecommerce/lib/api/client.ts)).

**Regra operacional para a refatoração**
- Durante a migração, o contrato por rota (status + shape) deve ser preservado.
- O client depende do `status` e possivelmente de `message` retornado para exibir feedback (ver [apiClient](file:///c:/LOPES/www/connect-ecommerce/lib/api/client.ts)).

## Pontos de refatoração em `liz_refator/`

### Onde a nova camada entra

- Objetivo: criar uma camada nova, Node-only e `server-only`, que padroniza:
  - execução do request (fetch + parse)
  - erro padronizado
  - retry (no início, igual ao legado)
  - política de auth/refresh (no início, delegando ao legado)

### Invariantes (etapa inicial)

- Retry: apenas falha de rede (igual ao legado).
- Cache: `no-store` (igual ao legado).
- Auth: refresh e re-execução em `401/403` (igual ao legado).
- Contrato Back→Front: status e shape preservados por rota.
