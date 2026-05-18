# Plano — Refatorar origem dos dados (Catálogo) entre Lopes e Redis

## Sumário

Objetivo: refatorar com segurança a forma como o projeto decide e consome a **origem dos dados do catálogo** (produtos/categorias/marcas), adotando **Lopes como única origem (source of truth)**, mantendo **Redis apenas como read model/materialização** usada especificamente na **Home** e nas **páginas de categoria**.

Diretriz adicional: o Redis entra para **complementar/enriquecer** dados que não existem no Lopes (ex.: `slug`, `rank`, normalizações), via um pipeline de sync.

Primeiro deliverable (antes de qualquer refactor): criar um **doc de referência** em `.trae/documents/` descrevendo:

- Estado atual (onde a escolha acontece e quais rotas dependem disso)
- Contrato canônico proposto (o que fica “oficial”) sob o modelo “Lopes → Redis (materialização) → Next”
- Plano de refatoração em fases, com riscos/mitigações e validação

## Estado atual (mapeamento objetivo)

### Como o front escolhe a fonte

- O layout injeta `data-fonte` e `data-catalog-fonte` no `<html>`: [layout.tsx](file:///c:/LOPES/www/connect-ecommerce/app/layout.tsx#L24-L43)
- O client “genérico” de produtos escolhe o basePath a partir de env/dataset (hoje permite múltiplas origens): [produtos.ts](file:///c:/LOPES/www/connect-ecommerce/lib/api/produtos.ts#L24-L45)
- A página de categoria já tem um caminho “Redis-first” (bypassando `produtosBasePath`) quando Redis está habilitado: [categoria page](file:///c:/LOPES/www/connect-ecommerce/app/%28shop%29/categoria/%5B...slug%5D/page.tsx#L385-L436)

Pontos de duplicidade do “switch”:

- A rota da home reimplementa a decisão de fonte (env `CATALOGO_FONTE|NEXT_PUBLIC_CATALOGO_FONTE` e `FONTE|NEXT_PUBLIC_FONTE`): [home route](file:///c:/LOPES/www/connect-ecommerce/app/api/ecommerce/home/route.ts#L31-L66)

### Famílias de endpoints (BFF) no Next

- Redis (catálogo materializado):
  - APIs “novo/EN”: `GET /api/catalog/products|categories|brands|health` (ex.: [catalogService](file:///c:/LOPES/www/connect-ecommerce/lib/integration/catalogService.ts))
  - APIs “legado/PT-BR”: `/api/catalog/produtos/*` (tree/by-id/by-slug/etc.) — árvore completa em [app/api/catalog/produtos](file:///c:/LOPES/www/connect-ecommerce/app/api/catalog/produtos)
- Lopes:
  - `/api/lopes/produtos/*` (ex.: por id usa `lopesBackClient` + snapshots de categorias/marcas): [lopes by-id](file:///c:/LOPES/www/connect-ecommerce/app/api/lopes/produtos/by-id/%5BidProduto%5D/route.ts#L33-L59)
- Default (/produtos):
  - `/api/produtos/*` usa o serviço “integração” (token webservice e/ou mock): [produtosService](file:///c:/LOPES/www/connect-ecommerce/lib/integration/produtosService.ts#L92-L246)

### Redis: onde está a integração e como opera

Base:

- Config/cliente Redis: [catalogRedis.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/catalogRedis.ts)
- Consultas de produtos/categorias/marcas: [catalogService.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/catalogService.ts)

Operação:

- CLI do Redis em `REDIS/` (import/sync/index/query): [REDIS README](file:///c:/LOPES/www/connect-ecommerce/REDIS/README.md)

Sync Lopes → Redis (como funciona hoje):

- O sync é feito pelo CLI `REDIS/src/commands/sync.mjs`: [sync.mjs](file:///c:/LOPES/www/connect-ecommerce/REDIS/src/commands/sync.mjs#L53-L139)
- Fluxo:
  - Gera token chamando `POST {BACK_AUTH_BASE_URL}/tokenService` com `BACK_PRODUTO|BACK_EAN|BACK_IDINTEGRADORA|BACK_CODCLI`: [backend-client.mjs](file:///c:/LOPES/www/connect-ecommerce/REDIS/src/lib/backend-client.mjs#L40-L60)
  - Busca lista completa de categorias via `GET /Servidor/webservice/integration/getListCategoria?idIntegradora=...`: [fetchAllCategorias](file:///c:/LOPES/www/connect-ecommerce/REDIS/src/lib/backend-client.mjs#L106-L122)
  - Busca lista completa de produtos via `GET /Servidor/webservice/integration/getListProdutoLoja?idIntegradora=...`: [fetchAllProdutos](file:///c:/LOPES/www/connect-ecommerce/REDIS/src/lib/backend-client.mjs#L88-L104)
  - Traduz/enriquece:
    - Categorias: calcula `slug` em cadeia (parentId → caminho) e normaliza campos: [translateCategorias](file:///c:/LOPES/www/connect-ecommerce/REDIS/src/lib/translate-lopes.mjs#L82-L114)
    - Produtos: cria `slug`, calcula `rank`, normaliza `price/stock/inStock`, etc.: [translateProdutos](file:///c:/LOPES/www/connect-ecommerce/REDIS/src/lib/translate-lopes.mjs#L116-L169)
  - Persiste em RedisJSON com `JSON.SET {prefix}:{type}:{id} $ {json}` em batches: [upsertJsonDocs](file:///c:/LOPES/www/connect-ecommerce/REDIS/src/commands/sync.mjs#L27-L42)
  - Opcionalmente executa prune por prefixo (remove ids que não vieram do Lopes): [pruneByPrefix](file:///c:/LOPES/www/connect-ecommerce/REDIS/src/commands/sync.mjs#L88-L118)
  - Brands hoje são fallback (não existe endpoint de marcas no sync): [buildFallbackBrands](file:///c:/LOPES/www/connect-ecommerce/REDIS/src/lib/translate-lopes.mjs#L171-L180)

Sync “interno” no Next (já existe para uso via HTTP):

- Implementação server-side (Next) do mesmo conceito de sync: [catalogAdminService.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/catalogAdminService.ts#L355-L492)
- Endpoint dev que dispara o sync: `POST /api/dev/catalog/sync` → [dev catalog sync](file:///c:/LOPES/www/connect-ecommerce/app/api/dev/catalog/sync/route.ts#L28-L53)

### Referência existente (para reaproveitar)

- Documento técnico já existente descrevendo Redis no catálogo e gargalos (dup/SCAN/etc.): [REDIS-CATALOGO.md](file:///c:/LOPES/www/connect-ecommerce/IA/DESENHOS/REDIS-CATALOGO.md)

## Proposta (direção canônica)

### 1) Origem canônica: Lopes (sempre)

Decisão (do seu jeito) para travar a execução:

- **Lopes é a única origem** para dados de catálogo. Não existe mais “fonte default” e nem “fonte redis”.
- Redis permanece, mas como **materialização derivada de Lopes**, consumida somente onde a UX/performance exige.

Impacto desejado:

- `NEXT_PUBLIC_FONTE` deixa de ser um switch “entre várias fontes” e passa a ter comportamento travado (ex.: `lopes` e, opcionalmente, `mock` só para dev).
- O front deixa de precisar “decidir entre Lopes/Redis” via env para cada tela; a decisão vira **regra fixa por feature**:
  - Home: Redis
  - Categoria: Redis (listagem/busca/paginação)
  - Demais telas de catálogo (ex.: PDP / produto): Lopes

### 2) Contrato canônico do read model (Redis) usado pela Home e Categoria

- Canonizar o consumo de Redis via endpoints “novo/EN”, porque já suportam paginação/filtros/sort:
  - `GET /api/catalog/products`
  - `GET /api/catalog/health` (gate operacional obrigatório)
  - (`/api/catalog/categories|brands` apenas se for necessário nessas telas)
- Manter `/api/catalog/produtos/*` apenas se ainda existir consumidor legado, mas **sem ser contrato principal** das telas.

### 3) Sync automático (a cada 5 minutos ou mais)

Decisão (nova):

- Implementar um “auto-sync” que só executa se o último sync bem-sucedido ocorreu há **5 minutos ou mais**.
- Usar Redis como estado do scheduler (timestamp + lock) para evitar concorrência em múltiplas instâncias.

### 4) Performance: remover SCAN por slug

Decisão proposta (com rollout seguro):

- Introduzir índice(s) em RediSearch para lookup por `slug` (produto e categoria) **ou** expandir `idx:catalog:product` para cobrir `slug`, e alterar as rotas `by-slug` a consultarem o índice ao invés de `SCAN`.
- Ajustar o CLI em `REDIS/` para criar/manter os índices necessários (e documentar a operação).

## Entregável 1 — Doc de referência (antes da refatoração)

Criar o arquivo:

- `.trae/documents/ref-origem-dados-catalogo-lopes-redis.md`

Estrutura proposta (seções):

1) **Objetivo e escopo**
2) **Glossário** (fonte, catalogFonte, BFF, upstream)
3) **Estado atual** (switch + matriz de envs + rotas por fonte)
4) **Contratos atuais** (diferenças `products` vs `produtos` e implicações)
5) **Gargalos e riscos atuais** (SCAN, duplicidade, inconsistência de headers)
6) **Proposta canônica** (contrato + switch + headers)
7) **Plano de refatoração em fases** (com “stop points” de validação)
8) **Checklist de validação** (manual + automatizada)
9) **Rollback / segurança operacional**

Critérios de aceite do doc:

- Um dev consegue apontar “onde mexer” para cada objetivo (contrato/switch/performance) sem precisar redescobrir arquivos.
- O doc lista o conjunto mínimo de arquivos-alvo por fase.
- O doc inclui validação objetiva via endpoints (`/api/catalog/health`) e cabeçalhos.

## Refatoração (execução) — fases propostas

### Fase A — Travar “origem” em Lopes (baixo risco, mudança controlada)

Mudanças:

- Ajustar o “switch” do client de catálogo para não apontar mais para `/produtos` nem para `/catalog/produtos` como basePath genérico.
  - Regra: catálogo “normal” usa `/lopes/produtos`.
  - Redis deixa de ser selecionável via `produtosBasePath` (fica restrito às features que chamam Redis explicitamente).
- Introduzir um utilitário (novo arquivo) para leitura de `fonte` (client/server), mas apenas para suportar `lopes` e (se permitido) `mock` em dev.
- Padronizar um header de diagnóstico (`x-catalog-origin: lopes` e `x-catalog-read-model: redis|none`) nos endpoints principais, sem vazar segredos.

Risco/mitigação:

- Mudança de roteamento do front → mitigar com validação manual navegando: home, categoria, PDP e brands.

### Fase B — Redis “por feature”: Home + Categoria (sem env-switch)

Mudanças:

- Home:
  - Remover branch “não redis” de [home route](file:///c:/LOPES/www/connect-ecommerce/app/api/ecommerce/home/route.ts#L31-L66) e tratar Redis como read model obrigatório.
  - Quando faltar “home importado no Redis”, erro deve ser explícito (já existe), mas com mensagem/headers padronizados.
- Categoria:
  - Formalizar que a listagem de produtos vem de `GET /api/catalog/products` (já implementado na página de categoria).
  - Remover o fallback “não redis” na página de categoria (se existir caminho de execução), mantendo só a rota Redis para listagem/paginação/filtros.

Risco/mitigação:

- Redis indisponível afeta home/categoria → mitigar com `/api/catalog/health` como pré-check e mensagens operacionais claras.

### Fase B2 — Auto-sync (throttle 5 min) com lock distribuído

Mudanças:

- Criar uma função server-only `ensureCatalogSynced({ maxAgeMs: 5min })` que:
  - Lê `lastSyncAt` de uma chave de meta (ex.: `{prefix}:meta:lastSyncAt`)
  - Se estiver “stale”, tenta adquirir lock (ex.: `{prefix}:meta:syncLock` via `SET key value NX EX <ttl>`)
  - Se adquirir lock, executa `syncCatalogToRedis()` (e, se necessário, `ensureCatalogIndex()`), atualiza `lastSyncAt` e libera/expira lock
  - Se não adquirir lock, não dispara outro sync (evita tempestade)
- Integrar o gatilho:
  - Home: antes de ler do Redis, chama `ensureCatalogSynced`
  - Categoria: antes de consultar `/api/catalog/products`, chama `ensureCatalogSynced` (idealmente do lado do BFF, não no client)

Risco/mitigação:

- Sync pode aumentar latência do primeiro request após 5 min → mitigar com lock + batch controlado; documentar que o primeiro hit pode ser mais lento.

### Fase C — Remover SCAN por slug (mudança estrutural no Redis)

Mudanças:

- Criar/alterar índice(s) no Redis (CLI em `REDIS/`) para suportar lookup por slug.
- Alterar rotas `by-slug` em `/api/catalog/produtos/*` para usar `FT.SEARCH` (ou equivalente) ao invés de `SCAN`.

Risco/mitigação:

- Índice ausente em ambientes → mitigar com:
  - erro explícito e diagnosticável (`x-catalog-source` + mensagem clara)
  - validação via `/api/catalog/health` (já existe)

## Assunções e decisões (travadas para execução)

- Escopo é apenas catálogo (produtos/categorias/marcas). A home entra apenas onde ela depende do catálogo Redis.
- O doc de referência será criado em `.trae/documents/` e será o gate de aprovação antes de refatorar.
- Não haverá fallback silencioso entre Lopes e Redis:
  - Lopes é origem, mas home/categoria devem falhar explicitamente se Redis/read-model não estiver operacional.

## Verificação (após implementar)

Validação manual mínima:

- Confirmar que PDP e endpoints “genéricos” de produto usam `/api/lopes/produtos/*`.
- Confirmar que:
  - Home usa Redis (e falha com mensagem clara se “home não importado”)
  - Categoria usa Redis para listagem/paginação/filtros (`/api/catalog/products`)
- `GET /api/catalog/health` retorna `ok: true` e reporta módulos/índices corretamente (gate antes de testar Home/Categoria).

Validação automatizada mínima:

- Testes unitários do utilitário de leitura de `fonte` (permitindo apenas `lopes`/`mock`, se aplicável).
- Checagem de typescript/lint do projeto para garantir que não houve regressão de build.
