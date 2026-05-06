# Redis (Catálogo) — Como o projeto usa hoje

## Objetivo

Este documento descreve, do jeito mais direto possível, como o **connect-ecommerce** usa Redis atualmente para o **catálogo** (produtos/categorias/marcas), quais endpoints dependem disso, quais variáveis de ambiente controlam o comportamento e onde existem oportunidades claras de refatoração para “aproveitar melhor o serviço”.

Escopo: Redis é usado **apenas** para o catálogo. Sessão/auth não usa Redis.

Referências principais (código):

- Cliente/config: [catalogRedis.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/catalogRedis.ts)
- Serviço de catálogo (health/search/list): [catalogService.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/catalogService.ts)
- Endpoints (BFF) “novo”: [products/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/catalog/products/route.ts) e [health/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/catalog/health/route.ts)
- Endpoints (BFF) “legado PT-BR”: [app/api/catalog/produtos](file:///c:/LOPES/www/connect-ecommerce/app/api/catalog/produtos)
- Switch de fonte do catálogo no front: [produtos.ts](file:///c:/LOPES/www/connect-ecommerce/lib/api/produtos.ts)
- CLI Node para operar o Redis (import/index/query/sync): [REDIS/README.md](file:///c:/LOPES/www/connect-ecommerce/REDIS/README.md)

---

## Visão geral do desenho

O Redis funciona como um “catálogo pronto” (cache/materialização) que o Next.js consulta via rotas internas (`/api/...`). A carga inicial do catálogo (import/sync/index) não acontece automaticamente no runtime do Next; ela é feita por um CLI separado.

```mermaid
flowchart LR
  Backend[Backend Lopes / Integrações] -->|sync/import (CLI)| Redis[(Redis Stack / Redis Cloud)]
  Redis -->|BFF /api/catalog/*| NextAPI[Next.js Route Handlers]
  NextAPI --> UI[Pages/Components]
```

Componentes:

- **CLI** (pasta `REDIS/`) prepara dados e índices no Redis.
- **Next.js** consulta Redis em runtime via Route Handlers (`app/api/...`).
- **Front** escolhe “fonte do catálogo” via env (`NEXT_PUBLIC_CATALOGO_FONTE` / `NEXT_PUBLIC_FONTE`).

---

## O que exatamente está no Redis

### Prefixo e convenção de chaves

O prefixo padrão é `catalog` (configurável via `CATALOG_KEY_PREFIX`).

Chaves atuais esperadas:

- `catalog:product:{id}`
- `catalog:category:{id}`
- `catalog:brand:{id}`

O prefixo é aplicado em runtime por [getCatalogKeyPrefix](file:///c:/LOPES/www/connect-ecommerce/lib/integration/catalogRedis.ts#L124-L126).

### Formato do valor

Os documentos são armazenados como **JSON** via RedisJSON (`JSON.SET` / `JSON.GET`).

Exemplo de leitura em endpoint:

- Produto por id: [by-id/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/catalog/produtos/by-id/%5BidProduto%5D/route.ts#L17-L26)

### Índice RediSearch

Há um índice fixo usado para busca/paginação:

- `idx:catalog:product`

Esse índice é consultado via `FT.SEARCH` em [catalogService.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/catalogService.ts#L187-L230).

Observação: a criação/manutenção do índice é tarefa do CLI (`npm run index` no diretório `REDIS/`), conforme [REDIS/README.md](file:///c:/LOPES/www/connect-ecommerce/REDIS/README.md).

### Módulos necessários (obrigatório)

Para o catálogo funcionar, o Redis precisa ter:

- RedisJSON (comandos `JSON.GET`, `JSON.SET`)
- RediSearch (comandos `FT.SEARCH`, `FT._LIST`)

O endpoint [health](file:///c:/LOPES/www/connect-ecommerce/app/api/catalog/health/route.ts) faz a validação e reporta módulos e índices.

---

## Como o Next.js conecta no Redis

### Leitura de env e montagem da URL

O cliente é criado em [catalogRedis.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/catalogRedis.ts):

- Usa `REDIS_URL` se existir, senão monta a URL a partir de `REDIS_HOST`, `REDIS_PORT`, `REDIS_USERNAME`, `REDIS_PASSWORD`.
- TLS é controlado por `REDIS_TLS` (boolean). Se não definido, hoje o default no código é `true`.

Impacto prático:

- Para Redis Cloud (normalmente `rediss://`), `REDIS_TLS=1` faz sentido.
- Para Redis local sem TLS (normalmente `redis://`), é necessário setar `REDIS_TLS=0` para evitar erro de handshake.

Variáveis documentadas em [.env.example](file:///c:/LOPES/www/connect-ecommerce/.env.example#L19-L29).

### Reuso do client

O módulo mantém um singleton (`cachedClientPromise`) para reduzir reconexões em runtime do Next. Ver [getCatalogRedisClient](file:///c:/LOPES/www/connect-ecommerce/lib/integration/catalogRedis.ts#L95-L122).

---

## Endpoints que dependem do Redis

Existem duas “famílias” de endpoints hoje.

### 1) /api/catalog/* (novo)

Rotas:

- `GET /api/catalog/health` → healthcheck + módulos + índices + amostras de chaves
  - Implementação: [health/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/catalog/health/route.ts)
- `GET /api/catalog/products` → busca/paginação via `FT.SEARCH idx:catalog:product`
  - Implementação: [products/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/catalog/products/route.ts)
- `GET /api/catalog/categories` → lista categorias via `SCAN prefix:category:*` + `JSON.GET` em batch
  - Implementação: [categories/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/catalog/categories/route.ts)
- `GET /api/catalog/brands` → lista marcas via `SCAN prefix:brand:*` + `JSON.GET` em batch

Observações:

- Categories/brands ainda são “scan-based”, não indexadas.
- Products é “index-based”.

### 2) /api/catalog/produtos/* (legado PT-BR)

Rotas:

- Categorias (tree, by-id, by-slug): [categorias](file:///c:/LOPES/www/connect-ecommerce/app/api/catalog/produtos/categorias)
- Produtos por categoria: [by-categoria/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/catalog/produtos/by-categoria/%5BidCategoria%5D/route.ts)
  - Usa `listCatalogCategories` (scan) para calcular descendentes e usa `FT.SEARCH` para itens.
- Produto por id: [by-id/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/catalog/produtos/by-id/%5BidProduto%5D/route.ts)
  - Usa `JSON.GET` direto na chave do produto.
- Produto por slug: [by-slug/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/catalog/produtos/by-slug/%5Bslug%5D/route.ts)
  - Usa `SCAN` + `JSON.GET` (mais custoso).
- Brands: [brands](file:///c:/LOPES/www/connect-ecommerce/app/api/catalog/produtos/brands)

---

## Como o front “ativa” o Redis como fonte de catálogo

O front escolhe a base path de produtos/categorias/marcas em [produtosBasePath](file:///c:/LOPES/www/connect-ecommerce/lib/api/produtos.ts#L24-L30):

- Se `NEXT_PUBLIC_CATALOGO_FONTE=redis` **ou** `NEXT_PUBLIC_FONTE=redis` → usa `/catalog/produtos` (Redis)
- Se `NEXT_PUBLIC_FONTE=lopes` → usa `/lopes/produtos` (backend Lopes)
- Caso contrário → usa `/produtos` (fonte padrão atual)

Isso significa que “reativar Redis no projeto” geralmente envolve:

- Garantir Redis acessível (com módulos)
- Garantir envs Redis corretas
- Setar `NEXT_PUBLIC_CATALOGO_FONTE=redis` (ou `NEXT_PUBLIC_FONTE=redis`) para o front consumir endpoints Redis

---

## Operação: como validar que está “ok”

### 1) Validação no runtime do Next

- Acesse `GET /api/catalog/health`
  - Esperado: `ok: true`, `modules.hasRedisJson=true`, `modules.hasRediSearch=true`
  - Esperado: `indexes` contém `idx:catalog:product` (se já indexado)

### 2) Preparar dados no Redis (CLI)

O CLI está em `REDIS/` e cobre:

- `health` (ping + módulos)
- `import` (JSON → chaves `catalog:*`)
- `index` (cria índice `idx:catalog:product`)
- `query` (consulta via FT.SEARCH)
- `sync` (puxa do backend real e materializa no Redis)

Documentação completa do CLI: [REDIS/README.md](file:///c:/LOPES/www/connect-ecommerce/REDIS/README.md).

---

## Gargalos/limitações atuais (bons alvos de refatoração)

### 1) Duplicidade de APIs “products” vs “produtos”

Hoje coexistem:

- `/api/catalog/products` (modelo novo, já alinhado com query/paginação explícitas)
- `/api/catalog/produtos/*` (modelo PT-BR usado pelo front via `produtosBasePath`)

Oportunidade: escolher um “contrato canônico” e reduzir superfície duplicada.

### 2) SCAN para slug (produto e categoria)

Rotas que fazem scan:

- Produto por slug: [by-slug/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/catalog/produtos/by-slug/%5Bslug%5D/route.ts)
- Categoria por slug: [categorias/by-slug](file:///c:/LOPES/www/connect-ecommerce/app/api/catalog/produtos/categorias/by-slug/%5B...slug%5D/route.ts)

SCAN escala mal conforme o catálogo cresce e adiciona latência variável.

Oportunidade: criar índice(s) em RediSearch para `slug` (ex.: `idx:catalog:product_slug`, `idx:catalog:category_slug`) ou expandir o índice atual para permitir busca por slug, evitando SCAN.

### 3) Listagem de categorias/marcas por SCAN + JSON.GET

Categorias e marcas hoje dependem de:

- `SCAN prefix:category:*` / `SCAN prefix:brand:*` + batches de `JSON.GET` (multi)

Isso é ok no MVP, mas vira gargalo com volume alto. Dá para evoluir com:

- Índice RediSearch para categorias e brands, ou
- Chaves “lista” materializadas (ex.: `catalog:categories` como array), ou
- Hash/Set de ids para evitar scan.

### 4) Controle de TLS pouco “autoexplicativo”

Hoje `REDIS_TLS` defaulta para `true` no código. Se alguém esquecer de setar em local, a conexão a `redis://` vai falhar.

Oportunidade: tornar a regra mais explícita (ex.: inferir TLS da URL `redis://` vs `rediss://`, mantendo override por env).

### 5) Observabilidade mínima

Há logs de fonte de dados no dev (`[DATA-SOURCE] redis ...`) em [catalogService.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/catalogService.ts#L29-L33), mas não há:

- métricas por endpoint (latência, cache hit, tempo de query),
- correlação de erro (ex.: diferenciar “módulo ausente” vs “conexão” vs “índice faltando”).

Oportunidade: padronizar erros e adicionar telemetria leve (sem vazar segredos).

---

## Sugestão de roteiro de refatoração (alto nível)

1) Definir contrato canônico do catálogo (REST shape e nomes) e mapear onde o front consome hoje.
2) Remover SCAN por slug (primeiro impacto em latência) criando índice de slug (ou expandindo o índice existente).
3) Padronizar listagem de categorias/marcas sem scan (índice ou lista materializada).
4) Revisar o “switch” de fonte (`NEXT_PUBLIC_CATALOGO_FONTE`) para ficar explícito e simples de operar.
5) Ajustar conexão TLS para reduzir erro de configuração em dev sem afetar prod (override por env).

