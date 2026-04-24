# Mapa de rotas do BFF (`/api/*`)

## Objetivo

Inventariar as rotas do BFF (Next Route Handlers), apontando:

- endpoint (método e caminho)
- dependência principal (service/client)
- observações relevantes (sessão, envs, padrões de erro)

Este mapa serve para escolher rotas piloto e para migrar por domínio com segurança.

## Legenda (fluxo)

- **Front → Back**: `page.tsx` / componente / context → store (Zustand) e/ou `lib/api/*` → `apiClient` → `fetch("/api/...")`.
- **Back → Back**: `app/api/**/route.ts` → `lib/integration/**` → upstream (serviço externo).
- **Back → Front**: `route.ts` retorna `NextResponse.json(...)` e o client trata erros via `ApiError` em [apiClient](file:///c:/LOPES/www/connect-ecommerce/lib/api/client.ts).

## Auth (cliente)

- `POST /api/auth/send-token` → [send-token/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/auth/send-token/route.ts) → usa token do auth webservice em [authWebserviceClient](file:///c:/LOPES/www/connect-ecommerce/lib/integration/authWebserviceClient.ts)
- `POST /api/auth/verify-token` → [verify-token/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/auth/verify-token/route.ts) → grava cookie de sessão via [session.ts](file:///c:/LOPES/www/connect-ecommerce/lib/auth/session.ts)
- `GET /api/auth/me` → [me/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/auth/me/route.ts) → lê cookie via [session.ts](file:///c:/LOPES/www/connect-ecommerce/lib/auth/session.ts)
- `POST /api/auth/logout` → [logout/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/auth/logout/route.ts) → limpa cookie via [session.ts](file:///c:/LOPES/www/connect-ecommerce/lib/auth/session.ts)
- `POST /api/auth/register` → [register/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/auth/register/route.ts) → exige env `KEY` via [integration/config.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/config.ts)

**Fluxo (exemplo real: sessão no client)**
- Front: o provider [AuthContext](file:///c:/LOPES/www/connect-ecommerce/contexts/AuthContext.tsx) roda `getCurrentSession()` no mount.
- Front: `getCurrentSession()` está em [lib/api/auth.ts](file:///c:/LOPES/www/connect-ecommerce/lib/api/auth.ts) e chama `/api/auth/me` via [apiClient](file:///c:/LOPES/www/connect-ecommerce/lib/api/client.ts).
- Back: `/api/auth/me` é atendido por [me/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/auth/me/route.ts) e lê o cookie de sessão via [session.ts](file:///c:/LOPES/www/connect-ecommerce/lib/auth/session.ts).

## Clientes

- `PUT /api/clientes/meus-dados` → [clientes/meus-dados/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/clientes/meus-dados/route.ts) → [clientesService.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/clientesService.ts)
- `PUT /api/clientes/privacidade` → [clientes/privacidade/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/clientes/privacidade/route.ts) → [clientesService.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/clientesService.ts)
- Endereços:
  - `POST /api/clientes/enderecos` → [clientes/enderecos/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/clientes/enderecos/route.ts)
  - `PUT|DELETE /api/clientes/enderecos/:enderecoId` → [clientes/enderecos/[enderecoId]/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/clientes/enderecos/%5BenderecoId%5D/route.ts)
  - `GET /api/clientes/enderecos/cliente/:clienteId` → [clientes/enderecos/cliente/[clienteId]/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/clientes/enderecos/cliente/%5BclienteId%5D/route.ts)

**Fluxo (login de cliente — token)**
- Front: formulário [LoginForm](file:///c:/LOPES/www/connect-ecommerce/app/(auth)/login/_components/LoginForm.tsx) chama `sendLoginToken(...)` e depois `verifyLoginToken(...)` ([lib/api/auth.ts](file:///c:/LOPES/www/connect-ecommerce/lib/api/auth.ts)).
- Back: `/api/auth/send-token` e `/api/auth/verify-token` são atendidos em [app/api/auth](file:///c:/LOPES/www/connect-ecommerce/app/api/auth) e gravam cookie de sessão.

## Carrinho

- `GET /api/carrinho/:clienteId` → [carrinho/[clienteId]/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/carrinho/%5BclienteId%5D/route.ts) → [checkoutService.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/checkoutService.ts)
- Itens:
  - `POST /api/carrinho/itens` → [carrinho/itens/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/carrinho/itens/route.ts)
  - `PUT|DELETE /api/carrinho/itens/:itemId` → [carrinho/itens/[itemId]/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/carrinho/itens/%5BitemId%5D/route.ts)
- Cupom:
  - `POST|DELETE /api/carrinho/cupom` → [carrinho/cupom/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/carrinho/cupom/route.ts)

**Fluxo (visão geral)**
- Front: geralmente orquestrado por store em [carrinho-store.ts](file:///c:/LOPES/www/connect-ecommerce/stores/carrinho-store.ts) e pelo contexto [CartContext](file:///c:/LOPES/www/connect-ecommerce/contexts/CartContext.tsx).
- Front → Back: chamadas via `apiClient` (ou wrappers `lib/api/*`) para `/api/carrinho/*`.
- Back → Back: handlers delegam principalmente para [checkoutService](file:///c:/LOPES/www/connect-ecommerce/lib/integration/checkoutService).

## Checkout

- `POST /api/checkout/sessoes` → [checkout/sessoes/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/checkout/sessoes/route.ts) → [checkoutService.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/checkoutService.ts)
- `GET /api/checkout/sessoes/:checkoutId` → [checkout/sessoes/[checkoutId]/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/checkout/sessoes/%5BcheckoutId%5D/route.ts)
- `PUT /api/checkout/sessoes/:checkoutId/contato` → [contato/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/checkout/sessoes/%5BcheckoutId%5D/contato/route.ts)
- Endereço:
  - `PUT /api/checkout/sessoes/:checkoutId/entrega/endereco` → [endereco/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/checkout/sessoes/%5BcheckoutId%5D/entrega/endereco/route.ts)
- Frete:
  - `GET /api/checkout/sessoes/:checkoutId/entrega/frete/opcoes` → [opcoes/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/checkout/sessoes/%5BcheckoutId%5D/entrega/frete/opcoes/route.ts)
  - `PUT /api/checkout/sessoes/:checkoutId/entrega/frete` → [frete/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/checkout/sessoes/%5BcheckoutId%5D/entrega/frete/route.ts)
- Pagamento (PIX):
  - `POST /api/checkout/sessoes/:checkoutId/pagamento/pix` → [pix/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/checkout/sessoes/%5BcheckoutId%5D/pagamento/pix/route.ts)
  - `POST /api/checkout/sessoes/:checkoutId/pagamento/pix/confirmar` → [confirmar/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/checkout/sessoes/%5BcheckoutId%5D/pagamento/pix/confirmar/route.ts)
- Finalização:
  - `POST /api/checkout/sessoes/:checkoutId/finalizar` → [finalizar/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/checkout/sessoes/%5BcheckoutId%5D/finalizar/route.ts)

**Fluxo (visão geral)**
- Front: geralmente orquestrado pelo store [pedidos-store.ts](file:///c:/LOPES/www/connect-ecommerce/stores/pedidos-store.ts).
- Front → Back: chamadas sequenciais para `/api/checkout/*` com dados de cliente, entrega, frete e pagamento.
- Back → Back: handlers delegam principalmente para [checkoutService](file:///c:/LOPES/www/connect-ecommerce/lib/integration/checkoutService).

## Pedidos

- `GET /api/pedidos?clienteId=...` → [pedidos/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/pedidos/route.ts) → [checkoutService.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/checkoutService.ts)
- `GET /api/pedidos/:pedidoId` → [pedidos/[pedidoId]/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/pedidos/%5BpedidoId%5D/route.ts) → [checkoutService.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/checkoutService.ts)

**Fluxo (visão geral)**
- Front: listagem e detalhe normalmente passam por [pedidos-store.ts](file:///c:/LOPES/www/connect-ecommerce/stores/pedidos-store.ts).
- Back → Back: handlers delegam para [checkoutService](file:///c:/LOPES/www/connect-ecommerce/lib/integration/checkoutService).

## Catálogo (produtos)

**Fonte (base path)**
- O client alterna os endpoints entre `/api/produtos/...` e `/api/lopes/produtos/...` por `NEXT_PUBLIC_FONTE` em [produtosBasePath](file:///c:/LOPES/www/connect-ecommerce/lib/api/produtos.ts#L24-L26).
- Quando `NEXT_PUBLIC_FONTE !== 'lopes'`:
  - Back → Back: handlers em `app/api/produtos/**` delegam para [produtosService](file:///c:/LOPES/www/connect-ecommerce/lib/integration/produtosService.ts) (upstream “integração” via `INTEGRATION_URL_API`).
- Quando `NEXT_PUBLIC_FONTE === 'lopes'`:
  - Back → Back: handlers em `app/api/lopes/produtos/**` usam [lopesBackClient.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/lopesBackClient.ts) e/ou snapshots JSON em `lib/mockups/data/*.json`.

**Categorias**
- Árvore de categorias
  - Front → Back: `useProdutosStore.loadCategoriasTree()` ([produtos-store.ts](file:///c:/LOPES/www/connect-ecommerce/stores/produtos-store.ts#L166-L184)) → `getCategoriasTree()` ([produtos.ts](file:///c:/LOPES/www/connect-ecommerce/lib/api/produtos.ts#L28-L31)) → `GET /api{base}/categorias`
  - Back (padrão): [produtos/categorias/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/produtos/categorias/route.ts) → [produtosService.getCategoriasTree](file:///c:/LOPES/www/connect-ecommerce/lib/integration/produtosService.ts#L68-L72)
  - Back (lopes): [lopes/produtos/categorias/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/lopes/produtos/categorias/route.ts) lê `categorias.json` e monta árvore (`x-data-source: categorias.json`)
- Categoria por id (com children)
  - Front → Back: `useProdutosStore.loadCategoriaById({ idCategoria })` ([produtos-store.ts](file:///c:/LOPES/www/connect-ecommerce/stores/produtos-store.ts#L200-L225)) → `getCategoriaById(idCategoria)` ([produtos.ts](file:///c:/LOPES/www/connect-ecommerce/lib/api/produtos.ts#L33-L36)) → `GET /api{base}/categorias/:idCategoria`
  - Back (padrão): [produtos/categorias/[idCategoria]/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/produtos/categorias/%5BidCategoria%5D/route.ts) → [produtosService.getCategoriaByIdWithChildren](file:///c:/LOPES/www/connect-ecommerce/lib/integration/produtosService.ts#L74-L82)
  - Back (lopes): [lopes/produtos/categorias/[idCategoria]/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/lopes/produtos/categorias/%5BidCategoria%5D/route.ts) lê `categorias.json` e retorna `{ category, children }` (`x-data-source: categorias.json`)
- Categoria por slug
  - Front → Back: `useProdutosStore.loadCategoriaBySlug({ slug })` ([produtos-store.ts](file:///c:/LOPES/www/connect-ecommerce/stores/produtos-store.ts#L227-L253)) → `getCategoriaBySlug(slug)` ([produtos.ts](file:///c:/LOPES/www/connect-ecommerce/lib/api/produtos.ts#L38-L49)) → `GET /api{base}/categorias/by-slug/<...slug>`
  - Back (padrão): [produtos/categorias/by-slug/[...slug]/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/produtos/categorias/by-slug/%5B...slug%5D/route.ts) → [produtosService.getCategoriaBySlug](file:///c:/LOPES/www/connect-ecommerce/lib/integration/produtosService.ts#L84-L100)
  - Back (lopes): [lopes/produtos/categorias/by-slug/[...slug]/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/lopes/produtos/categorias/by-slug/%5B...slug%5D/route.ts) lê `categorias.json`, trata `/categoria/sem-categoria` e encontra no tree (`x-data-source: categorias.json`)

**Produtos**
- Produtos por categoria
  - Front → Back: `useProdutosStore.loadProdutosByCategoria({ idCategoria, includeDescendants, page, pageSize })` ([produtos-store.ts](file:///c:/LOPES/www/connect-ecommerce/stores/produtos-store.ts#L300-L330)) → `getProdutosByCategoria(idCategoria, params)` ([produtos.ts](file:///c:/LOPES/www/connect-ecommerce/lib/api/produtos.ts#L51-L73)) → `GET /api{base}/by-categoria/:idCategoria?includeDescendants=&page=&pageSize=`
  - Back (padrão): [produtos/by-categoria/[idCategoria]/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/produtos/by-categoria/%5BidCategoria%5D/route.ts) → [produtosService.getProdutosByCategoria](file:///c:/LOPES/www/connect-ecommerce/lib/integration/produtosService.ts#L102-L143)
  - Back (lopes): [lopes/produtos/by-categoria/[idCategoria]/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/lopes/produtos/by-categoria/%5BidCategoria%5D/route.ts) agrega `lopes-back` + `categorias.json` + `brands.json` (`x-data-source: lopes-back + categorias.json + brands.json`)
- Produto por id
  - Front → Back: `useProdutosStore.loadProdutoById({ idProduto })` ([produtos-store.ts](file:///c:/LOPES/www/connect-ecommerce/stores/produtos-store.ts#L332-L357)) → `getProdutoById(idProduto)` ([produtos.ts](file:///c:/LOPES/www/connect-ecommerce/lib/api/produtos.ts#L75-L78)) → `GET /api{base}/by-id/:idProduto`
  - Back (padrão): [produtos/by-id/[idProduto]/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/produtos/by-id/%5BidProduto%5D/route.ts) → [produtosService.getProdutoById](file:///c:/LOPES/www/connect-ecommerce/lib/integration/produtosService.ts#L145-L149)
  - Back (lopes): [lopes/produtos/by-id/[idProduto]/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/lopes/produtos/by-id/%5BidProduto%5D/route.ts) chama `lopes-back` e traduz com `categorias.json` + `brands.json`
- Produto por slug
  - Front → Back: `useProdutosStore.loadProdutoBySlug({ slug })` ([produtos-store.ts](file:///c:/LOPES/www/connect-ecommerce/stores/produtos-store.ts#L359-L385)) → `getProdutoBySlug(slug)` ([produtos.ts](file:///c:/LOPES/www/connect-ecommerce/lib/api/produtos.ts#L80-L90)) → `GET /api{base}/by-slug/:slug`
  - Back (padrão): [produtos/by-slug/[slug]/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/produtos/by-slug/%5Bslug%5D/route.ts) → [produtosService.getProdutoBySlug](file:///c:/LOPES/www/connect-ecommerce/lib/integration/produtosService.ts#L151-L156)
  - Back (lopes): [lopes/produtos/by-slug/[slug]/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/lopes/produtos/by-slug/%5Bslug%5D/route.ts) exige slug terminando com `-<idProduto>` e busca no `lopes-back`

**Marcas**
- Lista de marcas
  - Front → Back: `useProdutosStore.loadBrands()` ([produtos-store.ts](file:///c:/LOPES/www/connect-ecommerce/stores/produtos-store.ts#L255-L269)) → `getBrands()` ([produtos.ts](file:///c:/LOPES/www/connect-ecommerce/lib/api/produtos.ts#L92-L95)) → `GET /api{base}/brands`
  - Back (padrão): [produtos/brands/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/produtos/brands/route.ts) → [produtosService.getBrands](file:///c:/LOPES/www/connect-ecommerce/lib/integration/produtosService.ts#L158-L162)
  - Back (lopes): [lopes/produtos/brands/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/lopes/produtos/brands/route.ts) lê `brands.json` (`x-data-source: brands.json`)
- Marca por id (paginação)
  - Front → Back: `useProdutosStore.loadBrandById({ idBrand, page, pageSize })` ([produtos-store.ts](file:///c:/LOPES/www/connect-ecommerce/stores/produtos-store.ts#L271-L298)) → `getBrandById(idBrand, params)` ([produtos.ts](file:///c:/LOPES/www/connect-ecommerce/lib/api/produtos.ts#L97-L117)) → `GET /api{base}/brands/:idBrand?page=&pageSize=`
  - Back (padrão): [produtos/brands/[idBrand]/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/produtos/brands/%5BidBrand%5D/route.ts) → [produtosService.getBrandById](file:///c:/LOPES/www/connect-ecommerce/lib/integration/produtosService.ts#L164-L174)
  - Back (lopes): [lopes/produtos/brands/[idBrand]/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/lopes/produtos/brands/%5BidBrand%5D/route.ts) lê `brands.json` e retorna payload (sem produtos) (`x-data-source: brands.json`)

**Exemplo real (página de categoria)**
- Tela: [categoria/[...slug]/page.tsx](file:///c:/LOPES/www/connect-ecommerce/app/(shop)/categoria/%5B...slug%5D/page.tsx)
- Fluxo disparado:
  - `loadCategoriaBySlug({ slug: "/categoria/<...>" })` → `GET /api{base}/categorias/by-slug/<...>` (categoria)
  - `loadProdutosByCategoria({ idCategoria, includeDescendants: 0, page, pageSize: 24 })` → `GET /api{base}/by-categoria/:idCategoria?includeDescendants=0&page=1&pageSize=24` (lista de produtos)

**Trace (valores observáveis no código)**
- URL aberta no browser: `/categoria/<...slug>` (ex.: `/categoria/cervejas`)
- `slugPath` montado na página: ``/categoria/${slugParts.join("/")}`` ([page.tsx](file:///c:/LOPES/www/connect-ecommerce/app/(shop)/categoria/%5B...slug%5D/page.tsx#L158-L162))
- Normalização do slug no wrapper: remove `/` inicial, split por `/`, trim e `encodeURIComponent` ([produtos.ts](file:///c:/LOPES/www/connect-ecommerce/lib/api/produtos.ts#L38-L49))
- Seleção do base path (`{base}`) por `NEXT_PUBLIC_FONTE` ([produtosBasePath](file:///c:/LOPES/www/connect-ecommerce/lib/api/produtos.ts#L24-L26)):
  - `NEXT_PUBLIC_FONTE !== 'lopes'` → `{base} = /produtos` → endpoints `/api/produtos/...`
  - `NEXT_PUBLIC_FONTE === 'lopes'` → `{base} = /lopes/produtos` → endpoints `/api/lopes/produtos/...`

## E-commerce (home)

- `GET /api/ecommerce/home` → [ecommerce/home/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/ecommerce/home/route.ts) → [ecommerceService.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/ecommerceService.ts) ou snapshot condicionado por `NEXT_PUBLIC_FONTE`

**Fluxo (visão geral)**
- Front: normalmente orquestrado por [ecommerce-store.ts](file:///c:/LOPES/www/connect-ecommerce/stores/ecommerce-store.ts) via wrapper em [lib/api/ecommerce.ts](file:///c:/LOPES/www/connect-ecommerce/lib/api/ecommerce.ts).
- Back: handler em [ecommerce/home/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/ecommerce/home/route.ts).

## Dev (ambiente de desenvolvimento)

- `GET /api/dev/cliente-integrado` → [dev/cliente-integrado/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/dev/cliente-integrado/route.ts) → [gpClient](file:///c:/LOPES/www/connect-ecommerce/lib/integration/gpClient.ts)
- `POST /api/dev/insert-dado-integration` → [dev/insert-dado-integration/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/dev/insert-dado-integration/route.ts) → [gpClient](file:///c:/LOPES/www/connect-ecommerce/lib/integration/gpClient.ts)
- `POST /api/dev/*/update-json` → rotas que atualizam snapshots e bloqueiam em produção
