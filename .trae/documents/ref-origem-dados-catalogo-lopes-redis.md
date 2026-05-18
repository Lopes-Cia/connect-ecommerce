# Referência — Origem dos dados do catálogo (Lopes ↔ Redis)

## Objetivo

Padronizar como o projeto decide e consome a origem dos dados do catálogo (produtos/categorias/marcas), com:

- **Lopes como única origem (source of truth)**
- **Redis como read model/materialização** derivada de Lopes, usado somente onde a UX/performance exige (Home e Categoria)

## Glossário

- **Origem (source of truth):** sistema onde o dado “nasce” e é considerado oficial (Lopes).
- **Read model / materialização:** cópia derivada (Redis) otimizada para leitura.
- **BFF (Next):** endpoints em `app/api/*` que normalizam/expõem o contrato para o front.
- **Auto-sync:** mecanismo server-side que sincroniza Lopes → Redis com throttle e lock.

## Regra canônica (decisão travada)

- **Produtos (PDP e demais telas de produto):** Lopes
- **Home:** Redis
- **Categoria (listagem/paginação/filtros):** Redis

Não há fallback silencioso entre Lopes e Redis para Home/Categoria. Se o Redis não estiver operacional, a falha deve ser explícita (com diagnóstico).

## Endpoints (contrato e responsabilidade)

### Read model (Redis) — contrato principal para Home/Categoria

- `GET /api/catalog/health` (gate operacional)
- `GET /api/catalog/products` (listagem com paginação/filtros/sort)
- `GET /api/catalog/categories` (lista completa, usada principalmente para navegação/árvore)
- `GET /api/catalog/brands` (lista de marcas do Redis quando existir)

### Legado (Redis) — manter apenas para compat

- `/api/catalog/produtos/*` (by-id, by-slug, árvore, etc.)

### Origem (Lopes)

- `/api/lopes/produtos/*`

## Diagnóstico via headers (padrão)

Em endpoints de catálogo, padronizar:

- `x-catalog-origin: lopes`
- `x-catalog-read-model: redis|none`

Uso:

- Endpoints Redis (read model): `x-catalog-origin=lopes` e `x-catalog-read-model=redis`
- Endpoints Lopes: `x-catalog-origin=lopes` e `x-catalog-read-model=none`

## Operação: Lopes → Redis (materialização)

### Sync manual (dev)

- `POST /api/dev/catalog/sync` (sincroniza catálogo para Redis)
- `POST /api/dev/catalog/index` (garante índices do RediSearch)

### Auto-sync (server-side)

O auto-sync roda no caminho crítico do BFF (antes de responder), com:

- **Throttle**: só roda se o último sync bem-sucedido foi há **5 min ou mais**
- **Lock distribuído**: `SET NX PX` para impedir concorrência entre instâncias
- **Estado no Redis**:
  - `{prefix}:meta:lastSyncAt`
  - `{prefix}:meta:syncLock`

## Performance: lookup por slug (sem SCAN)

Regras:

- Evitar `SCAN` para resolver `slug` (produto/categoria).
- Preferir `FT.SEARCH` em índices RediSearch:
  - `idx:catalog:product` (produto)
  - `idx:catalog:category` (categoria)

## Checklist de validação (smoke)

1) `GET /api/catalog/health` retorna `ok: true` e lista módulos/índices.
2) Home:
   - `GET /api/ecommerce/home` responde com `x-catalog-read-model: redis`
   - Se faltar `catalog:home`, falha explicando como importar
3) Categoria:
   - Listagem via `GET /api/catalog/products` com filtros/sort funcionando
4) Produto:
   - PDP e endpoints “genéricos” consultam Lopes (`/api/lopes/produtos/*`)
5) Verificar headers:
   - `x-catalog-origin` e `x-catalog-read-model` presentes em endpoints principais

## Rollback (segurança)

- Para incidentes envolvendo Redis (Home/Categoria), usar `GET /api/catalog/health` como primeiro diagnóstico.
- Se necessário, desabilitar temporariamente o consumo de Redis nas features afetadas via alteração controlada de código (não existe fallback automático).

