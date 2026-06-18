# Redis no connect-ecommerce — Referência de implementação (CLI + BFF + CRUD dev)

## Objetivo

Este documento consolida, de forma copiável, **como o Redis é usado neste projeto** como read model/materialização do catálogo (produtos/categorias/marcas) e quais peças existem no repositório (CLI, módulos de runtime e endpoints).

Fonte única: o próprio código do repo (links abaixo).

## Visão rápida (arquitetura)

- **CLI (pasta `REDIS/`)**: prepara o Redis (import/sync), cria índices do RediSearch e oferece query de validação.
- **Next.js (Route Handlers)**: consulta Redis em runtime via `JSON.GET` e `FT.SEARCH`.
- **Auto-sync (server-side)**: pode sincronizar Lopes → Redis automaticamente (throttle + lock), acionado por endpoints de catálogo.

Referências:

- CLI: [REDIS/README.md](file:///c:/LOPES/www/connect-ecommerce/REDIS/README.md)
- Redis client (Next): [catalogRedis.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/catalogRedis.ts)
- Queries/listagens/health: [catalogService.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/catalogService.ts)
- Sync + ensure index: [catalogAdminService.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/catalogAdminService.ts)
- Auto-sync: [catalogAutoSync.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/catalogAutoSync.ts)

## Variáveis de ambiente (Redis)

Exemplo canônico: [.env.example](file:///c:/LOPES/www/connect-ecommerce/.env.example#L21-L32)

- Prefixo de chave:
  - `CATALOG_KEY_PREFIX` (default: `catalog`)
- Conexão (use 1 dos jeitos):
  - `REDIS_URL=rediss://...`
  - `REDIS_HOST`, `REDIS_PORT`, `REDIS_USERNAME`, `REDIS_PASSWORD`
- TLS:
  - `REDIS_TLS` (boolean; no projeto o exemplo local está como `0`)
  - `REDIS_TLS_SERVERNAME` (opcional, caso o provedor exija)

## Modelo de dados no Redis

### Convenção de chaves (namespace por prefixo)

O prefixo vem de `CATALOG_KEY_PREFIX` e é lido por:

- [getCatalogKeyPrefix](file:///c:/LOPES/www/connect-ecommerce/lib/integration/catalogRedis.ts#L124-L126)

Chaves usadas:

- `{prefix}:product:{id}`
- `{prefix}:category:{id}`
- `{prefix}:brand:{id}`

### Formato do valor (RedisJSON)

Os documentos são armazenados como JSON (RedisJSON):

- Leitura: `JSON.GET {key}`
- Escrita: `JSON.SET {key} $ {json}`

Exemplo de leitura (produto por id):

- [by-id/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/catalog/produtos/by-id/%5BidProduto%5D/route.ts#L21-L30)

## Índices RediSearch

Os índices são garantidos por:

- CLI: [REDIS/src/commands/index.mjs](file:///c:/LOPES/www/connect-ecommerce/REDIS/src/commands/index.mjs)
- Next (admin): [ensureCatalogIndex](file:///c:/LOPES/www/connect-ecommerce/lib/integration/catalogAdminService.ts#L663-L704)

### `idx:catalog:product` (ON JSON, prefix `{prefix}:product:`)

Campos indexados (resumo do SCHEMA):

- `rank` (NUMERIC, SORTABLE)
- `id` (NUMERIC, SORTABLE)
- `sku` (TAG)
- `name` (TEXT, SORTABLE)
- `slug` (TAG)
- `price` (NUMERIC, SORTABLE)
- `stock` (NUMERIC, SORTABLE)
- `inStock` (TAG)
- `categoryId` (NUMERIC, SORTABLE) a partir de `$.category.id`
- `brandId` (NUMERIC, SORTABLE) a partir de `$.brand.id`
- `badges` (TAG) a partir de `$.badges[*]`

Consulta padrão usada no projeto:

- `FT.SEARCH idx:catalog:product <query> SORTBY <field> <ASC|DESC> LIMIT <offset> <limit> RETURN 1 $ DIALECT 2`

Implementações:

- Next: [searchCatalogProducts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/catalogService.ts#L232-L263)
- CLI: [query.mjs](file:///c:/LOPES/www/connect-ecommerce/REDIS/src/commands/query.mjs#L93-L134)

### `idx:catalog:category` (ON JSON, prefix `{prefix}:category:`)

Campos indexados (resumo do SCHEMA):

- `id` (NUMERIC, SORTABLE)
- `parentId` (NUMERIC, SORTABLE)
- `order` (NUMERIC, SORTABLE)
- `name` (TEXT, SORTABLE)
- `slug` (TAG)

Listagem padrão (paginação interna em batches):

- Implementação: [listCatalogCategories](file:///c:/LOPES/www/connect-ecommerce/lib/integration/catalogService.ts#L298-L332)

## Ferramenta CLI (pasta `REDIS/`)

### O que é

Pacote Node (ESM) com scripts para operar o catálogo no Redis:

- Dependências: [REDIS/package.json](file:///c:/LOPES/www/connect-ecommerce/REDIS/package.json)
- Entry: [REDIS/src/cli.mjs](file:///c:/LOPES/www/connect-ecommerce/REDIS/src/cli.mjs)

### Comandos

Documentação completa: [REDIS/README.md](file:///c:/LOPES/www/connect-ecommerce/REDIS/README.md)

- `health`: conecta e valida módulos RedisJSON/RediSearch
- `import`: importa arquivos locais `REDIS/JSON/*.json` para chaves `{prefix}:*`
- `index`: cria/garante índices `idx:catalog:product` e `idx:catalog:category`
- `query`: consulta produtos via RediSearch (paginação/filtros/sort)
- `clean`: remove somente o namespace do catálogo via `SCAN + UNLINK` (sem FLUSH)
- `sync`: sincroniza catálogo a partir do backend real (variáveis `BACK_*`), com prune opcional

### Conexão

Como o CLI monta a conexão:

- [createRedisClient](file:///c:/LOPES/www/connect-ecommerce/REDIS/src/lib/redis-client.mjs#L23-L53)

## Runtime Next.js (BFF) — como o app usa Redis

### Cliente Redis (singleton)

Ponto canônico:

- [getCatalogRedisClient](file:///c:/LOPES/www/connect-ecommerce/lib/integration/catalogRedis.ts#L95-L122)

### Healthcheck (módulos + índices + amostras)

O health do catálogo valida:

- `PING`
- `MODULE LIST` (RedisJSON + RediSearch)
- `JSON.SET/JSON.GET` em chave temporária
- `FT._LIST` (índices)
- `SCAN` de amostra por prefixos (categories/brands/products)

Implementação: [catalogHealthcheck](file:///c:/LOPES/www/connect-ecommerce/lib/integration/catalogService.ts#L163-L216)

### Auto-sync (Lopes → Redis) no caminho crítico

Usado para manter o Redis atualizado sem depender apenas do CLI:

- Throttle por `maxAgeMs` (default 5 min)
- Lock distribuído via `SET key value NX PX`
- Estado:
  - `{prefix}:meta:lastSyncAt`
  - `{prefix}:meta:syncLock`

Implementação: [ensureCatalogSynced](file:///c:/LOPES/www/connect-ecommerce/lib/integration/catalogAutoSync.ts#L25-L62)

## Endpoints (mapa de rotas)

### Catálogo (contrato “novo”)

- `GET /api/catalog/health`
  - Implementação: [health/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/catalog/health/route.ts)
- `GET /api/catalog/products` (busca/paginação)
  - Implementação: [products/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/catalog/products/route.ts)
- `GET /api/catalog/categories`
  - Implementação: [categories/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/catalog/categories/route.ts)
- `GET /api/catalog/brands`
  - Implementação: [brands/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/catalog/brands/route.ts)

Todos retornam headers de diagnóstico:

- [buildCatalogHeaders](file:///c:/LOPES/www/connect-ecommerce/lib/integration/catalogHeaders.ts)

### Catálogo (compat/legado)

Existe uma família de rotas em `/api/catalog/produtos/*` que também consulta Redis (ex.: by-id).

Exemplo:

- [by-id/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/catalog/produtos/by-id/%5BidProduto%5D/route.ts)

### CRUD Redis (somente dev)

Endpoints dev para mexer diretamente em docs no Redis:

- Brand by-id (GET/PUT/DELETE): [route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/dev/redis/catalog/brand/by-id/%5BidBrand%5D/route.ts)

## Checklist (para replicar “como foi feito aqui”, sem inventar nada)

1) Copiar a pasta de CLI (se quiser a ferramenta):
   - `REDIS/` (inteiro), com seu `.env` separado (não commitar segredos).
2) No app (Next.js), copiar módulos canônicos:
   - [catalogRedis.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/catalogRedis.ts)
   - [catalogService.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/catalogService.ts)
   - (Se for usar auto-sync) [catalogAdminService.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/catalogAdminService.ts) + [catalogAutoSync.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/catalogAutoSync.ts)
3) Definir envs (mesmos nomes):
   - `.env.example` como referência (não copiar valores).
4) Garantir que o Redis destino tem módulos:
   - RedisJSON + RediSearch (Redis Stack/Redis Cloud)
5) Ordem mínima de operação (ambiente novo):
   - Conectar (`health`) → importar/sync → criar índices (`index`) → validar (`/api/catalog/health`) → testar query (`/api/catalog/products` ou CLI `query`)

## Referências adicionais (já existentes no repo)

- Visão do desenho e explicações extras: [REDIS-CATALOGO.md](file:///c:/LOPES/www/connect-ecommerce/IA/DESENHOS/REDIS-CATALOGO.md)
- Regra de origem de dados (Lopes vs Redis): [ref-origem-dados-catalogo-lopes-redis.md](file:///c:/LOPES/www/connect-ecommerce/.trae/documents/ref-origem-dados-catalogo-lopes-redis.md)

