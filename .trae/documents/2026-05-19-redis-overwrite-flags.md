# Plano — flags de overwrite (RAW <- Redis) por produto

## Resumo

Criar um modelo simples (MVP) para **salvar no Redis**, por produto, as marcações (on/off) que indicam se, no futuro, vamos aplicar overwrite do **RAW** usando dados do **Redis** nos campos:
- category
- brand
- image

Neste passo **não aplicamos o overwrite** na UI nem no contrato; apenas persistimos e exibimos/edita as flags no AIChat (aba Contexto).

## Estado atual (repo)

- O produto é carregado no client via `loadProdutoBySlug()` e a view é montada por `toProdutoDetailViewModel()` em [produto-client.tsx](file:///c:/LOPES/www/connect-ecommerce/app/(shop)/produtos/[...slug]/produto-client.tsx).
- O AIChat (aba Contexto) já consulta produto no Redis via `GET /api/catalog/produtos/by-id/:id` e tem endpoints internos de escrita no Redis em `app/api/dev/redis/catalog/produto/*` (ex.: [stock/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/dev/redis/catalog/produto/stock/route.ts)).
- Não existe hoje uma persistência “por produto” para configurações/flags; `localStorage` não serve para este caso (decisão do usuário).

## Decisões aprovadas (chat)

- Persistência: **Redis em chave separada** (não dentro de `catalog:product:<id>`).
- Escopo (por enquanto): **somente salvar a informação**, sem aplicar overwrite na view/contrato.
- UI: **novo card abaixo do card Redis** no AIChat > Contexto.
- Default quando não existir key: **tudo OFF**.

## Proposta (modelo + API + UI)

### 1) Modelo de dados (Redis)

- Chave (por produto):
  - `${CATALOG_KEY_PREFIX}:product_overwrite:${idProduto}`
  - Ex.: `catalog:product_overwrite:77`
- Documento JSON (RedisJSON):

```json
{
  "category": 0,
  "brand": 0,
  "image": 0
}
```

Regras:
- Valores sempre **0/1** (MVP).
- Se a chave não existir: retornar `{ category: 0, brand: 0, image: 0 }`.

### 2) API (Next.js Route Handler)

Criar endpoint de leitura/escrita das flags (rápido, sem `ensureCatalogSynced()`):

- Arquivo novo:
  - `app/api/catalog/produtos/overwrite/by-id/[idProduto]/route.ts`

Endpoints:
- `GET /api/catalog/produtos/overwrite/by-id/:idProduto`
  - 200: `{ success: true, data: { category: 0|1, brand: 0|1, image: 0|1 } }`
  - 400: id inválido
  - 500: erro Redis
- `POST /api/catalog/produtos/overwrite/by-id/:idProduto`
  - Body aceito (MVP):
    - `{ category: 0|1|true|false, brand: 0|1|true|false, image: 0|1|true|false }`
  - Normalização:
    - boolean => 1/0
    - number/string => 1 se `=== 1` (ou `"1"`), senão 0
  - 200: `{ success: true, data: { category, brand, image } }`

Detalhes de implementação:
- Usar `getCatalogRedisClient()` e `getCatalogKeyPrefix()` de [catalogRedis.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/catalogRedis.ts).
- Usar `buildCatalogHeaders({ origin: 'lopes', readModel: 'redis' })`.
- `JSON.GET` para leitura; `JSON.SET key '$' <json>` para escrita.

### 3) UI (AIChat > Contexto)

Adicionar um card novo **abaixo** do card “Redis” em:
- [ContextoView.tsx](file:///c:/LOPES/www/connect-ecommerce/components/ai/views/ContextoView.tsx)

Comportamento:
- Quando `contratoRaw.id` existir:
  - Fazer `GET /api/catalog/produtos/overwrite/by-id/:id` e preencher os 3 toggles.
  - Se falhar (404/erro): usar default OFF (sem bloquear UI).
- UI do card (minimalista):
  - 3 linhas: `category`, `brand`, `image`
  - Cada linha tem um botão `ON/OFF` (usando `Button variant="outline" size="sm"`)
  - Botão “Salvar” que faz `POST` com o estado atual.
  - Loading states simples: “Carregando…” / “Salvando…”
- Ao salvar:
  - Exibir o JSON retornado no painel à direita via `openJson()`.

## Compatibilidade / fallback (MVP)

- Se não tiver `idProduto` no contrato: card mostra mensagem “id não disponível” e desabilita ações.
- Se o Redis não tiver a key: UI assume OFF.
- API aceita boolean e 0/1 para reduzir fricção com código legado.

## Verificação (após implementação)

- Rodar lint do projeto (padrão).
- Teste manual rápido:
  - Abrir um produto, abrir AIChat > Contexto.
  - No card “Overwrite (RAW <- Redis)”, alternar flags e salvar.
  - Recarregar a página e confirmar que as flags persistiram (GET retorna os mesmos valores).

