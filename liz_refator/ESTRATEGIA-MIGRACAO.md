# Estratégia de migração (isolada e segura)

## Objetivo

Migrar o código de requisições server-side para `liz_refator/`, por rota, mantendo contratos e reduzindo risco.

## Princípios

- Migração por estrangulamento: uma rota por vez, com validação mínima entre migrações.
- Facade compatível primeiro: delegar para o legado, evitando reimplementação.
- Invariantes explícitos: o que não pode mudar durante a convivência.

## Fases

### Fase 0 — Baseline e invariantes

- Congelar invariantes de comportamento (retry/cache/parse/auth/status/shape).
- Escolher uma rota piloto:
  - preferir `GET` read-only
  - baixo acoplamento e poucos parâmetros
  - usa o mesmo stack de erro/parse do legado (reduz drift)

**Exemplo real (rota piloto sugerida)**
- Baseado na página [categoria/[...slug]/page.tsx](file:///c:/LOPES/www/connect-ecommerce/app/(shop)/categoria/%5B...slug%5D/page.tsx), duas boas candidatas a piloto são:
  - `GET /api/produtos/categorias/by-slug/<...slug>` ([route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/produtos/categorias/by-slug/%5B...slug%5D/route.ts))
  - `GET /api/produtos/by-categoria/:idCategoria?includeDescendants=0&page=1&pageSize=24` ([route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/produtos/by-categoria/%5BidCategoria%5D/route.ts))

### Fase 1 — Facade compatível em `liz_refator/integration`

- Criar uma API mínima para executar requests server-side.
- Internamente, delegar para o legado:
  - `fetchWithRetry` + `readResponseData` + `HttpError` ([network.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/network.ts))
  - e/ou `businessRequest` quando precisar de auth/refresh ([httpClient.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/httpClient.ts))

**Detalhamento proposto (pilot-ready, sem implementar ainda)**

**Objetivo do desenho:** no piloto, permitir trocar apenas o “miolo” Back → Back (execução HTTP, parse, erro) sem reescrever handlers, mantendo:
- throws de `HttpError` para erros HTTP (igual ao legado)
- retry apenas em falha de rede
- `cache: 'no-store'`

**Estrutura sugerida (mínima)**
- `liz_refator/integration/client.ts` (cliente de integração: URL + GET + erro + auth opcional)
- `liz_refator/integration/produtos.ts` (funções do domínio de produtos usadas no piloto)

**Assinatura sugerida (compatível com o padrão atual)**
```ts
// Retorna payload já parseado e lança HttpError em status !ok (igual ao legado).
export async function integrationGetJson<T>(
  path: string,
  query?: Record<string, string | number | boolean | null | undefined>
): Promise<T>
```

**Função de domínio do piloto (exemplo)**
```ts
export async function getCategoriaBySlug(slug: string): Promise<{ success: true; data: { category: unknown } }>
```

**Como a rota piloto mudaria (em alto nível)**
- Antes: handler importa `getCategoriaBySlug` de `lib/integration/produtosService.ts`.
- Depois: handler importa `getCategoriaBySlug` de `liz_refator/integration/produtos` (ou equivalente).
- O handler mantém o mesmo tratamento de erro:
  - `HttpError` → `status = error.status` e body = `error.data` (ou fallback)
  - erro inesperado → `500` com `{ success:false, message }`

### Fase 2 — Migrar 1 rota piloto

- Migrar apenas a rota, sem alterar o contrato.
- Validar:
  - status HTTP (ok e erro)
  - shape do JSON (ok e erro)
  - headers relevantes (quando existirem)
  - diagnósticos TypeScript

**Exemplo real (o que validar na rota de categoria por slug)**
- OK: `GET /api/produtos/categorias/by-slug/<...slug>` retorna `{ success:true, data:{ category: ... } }` via [produtosService.getCategoriaBySlug](file:///c:/LOPES/www/connect-ecommerce/lib/integration/produtosService.ts#L84-L100).
- Erro upstream: `HttpError` vira `status = error.status` e body = `error.data` (ou fallback de mensagem) no handler ([route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/produtos/categorias/by-slug/%5B...slug%5D/route.ts#L26-L36)).

**Validação adicional (porque a página de categoria chama 2 endpoints)**
- Repetir o mesmo tipo de validação para `GET /api/produtos/by-categoria/:idCategoria?includeDescendants=0&page=1&pageSize=24` ([route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/produtos/by-categoria/%5BidCategoria%5D/route.ts)), garantindo que:
  - defaults e validações de query (`includeDescendants`, `page`, `pageSize`) permaneçam iguais
  - o payload continue trazendo `page`, `pageSize`, `total`, `totalPages` quando aplicável (contrato observado em [produtosService.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/produtosService.ts#L102-L143))

### Fase 3 — Rollout por domínio

- Migrar em lotes pequenos (catálogo → clientes → carrinho → checkout → pedidos).
- A cada lote, registrar:
  - diferenças encontradas
  - se era bug do legado ou regressão da refatoração

### Fase 4 — Extração do “cross-cutting” para a nova camada

Depois de várias rotas migrarem com sucesso:

- mover parse/erro/retry/auth/url do legado para `liz_refator`
- reduzir dependência do legado progressivamente

## Checklist por rota migrada

- Contrato: status e body preservados para sucesso e erro.
- Retry: semântica igual ao legado; sem retry automático em `POST/PUT/DELETE` sem regra explícita.
- Cache: manter `no-store` nas requisições server-side.
- Auth/Refresh: regra de refresh/reexecução em `401/403` preservada.
- Runtime: `server-only` e Node-only; sem dependências incompatíveis.
- Observabilidade mínima: logs com `url/status/tentativa` e, se aplicável, `correlation-id`.
- Diagnósticos: sem erros TypeScript/diagnósticos relevantes.

## Timeout (quando introduzir)

- Não introduzir no piloto.
- Introduzir em etapa posterior e controlada, com:
  - timeout padrão por tipo de chamada
  - `AbortController`
  - validação para garantir que o contrato Back→Front permaneça igual
