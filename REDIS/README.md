# Redis Cloud Catálogo (MVP) — CLI Node

MVP em Node.js para:

- Conectar no Redis Cloud via TLS
- Validar RedisJSON e RediSearch
- Importar JSON em chaves `catalog:*`
- Limpar somente o namespace do catálogo (prefixo)
- Sincronizar catálogo a partir do backend real (tokenService + prune)
- Criar índice `idx:catalog:product` (RediSearch ON JSON)
- Consultar produtos com paginação/busca/filtros/sort

## Pré-requisitos

- Node.js 18+ (recomendado)
- Acesso a um Redis Cloud com RedisJSON + RediSearch habilitados

## Setup

1) Instale dependências:

```bash
cd WWW/MICROSERVICE/REDIS
npm i
```

2) Configure ambiente:

- Copie `.env.example` para `.env`
- Preencha as variáveis sem commitar segredos

Exemplo (use apenas UMA forma):

- Via URL:
  - `REDIS_URL=rediss://default:SENHA@host:porta`
- Via partes:
  - `REDIS_HOST=...`
  - `REDIS_PORT=...`
  - `REDIS_USERNAME=default`
  - `REDIS_PASSWORD=...`

TLS:

- `REDIS_TLS=1` (padrão)
- `REDIS_TLS_SERVERNAME=` (opcional; use se seu provedor exigir)

Prefixo das chaves:

- `CATALOG_KEY_PREFIX=catalog` (padrão)

Backend (sync):

- `BACK_AUTH_BASE_URL=` (ex.: `https://gp.lopesecia.com.br:9002/ApiLopes/webservice/api`)
- `BACK_INTEGRATION_BASE_URL=` (ex.: `https://gp.lopesecia.com.br:9004`)
- `BACK_PRODUTO=CONNECT`
- `BACK_EAN=...`
- `BACK_IDINTEGRADORA=...`
- `BACK_CODCLI=...`

## Comandos (CLI)

Todos os comandos retornam JSON no stdout e erro estruturado no stderr.

### 1) Healthcheck (conexão + módulos)

```bash
npm run health
```

### 2) Importar JSON

Arquivos esperados em `./JSON/`:

- `brands.json`
- `categorias.json`
- `produtos.json`

Importar tudo:

```bash
npm run import
```

Importar apenas produtos:

```bash
npm run import -- --only produtos
```

Alterar batch:

```bash
npm run import -- --batch 500
```

Chaves geradas:

- `catalog:brand:{id}`
- `catalog:category:{id}`
- `catalog:product:{id}`

### 3) Criar/garantir índice

```bash
npm run index
```

Recriar (drop + create):

```bash
npm run index -- --drop
```

### 4) Consultar produtos

Busca por texto:

```bash
npm run query -- -q "brahma"
```

Paginação:

```bash
npm run query -- --page 2 --pageSize 20
```

Filtro por estoque:

```bash
npm run query -- --inStock true
```

Filtro por categoria/brand:

```bash
npm run query -- --categoryId 1
npm run query -- --brandId 0
```

Filtro por preço:

```bash
npm run query -- --priceMin 2 --priceMax 15
```

Ordenação:

```bash
npm run query -- --sort price:asc
npm run query -- --sort stock:desc
```

### 5) Sync do backend real → Redis

```bash
npm run sync
```

Somente produtos:

```bash
npm run sync -- --only produtos
```

Sem prune:

```bash
npm run sync -- --no-prune
```

## Endpoints sugeridos para consumo (BFF)

Você tem 2 jeitos de “expor endpoints” pra consumir isso — depende de quem vai consumir (front, outro serviço, etc.). O mais simples é criar um BFF/rota interna (no seu backend) que só consulta o Redis e devolve JSON.

### Produtos

- `GET /api/catalog/products`
  - Query:
    - `q` (texto)
    - `categoryId`, `brandId`
    - `priceMin`, `priceMax`
    - `inStock` (`true|false`)
    - `sort` (`name:asc`, `price:desc`, `stock:desc`, `id:desc`)
    - `page` (1..), `pageSize` (1..200)
  - Response:
    ```json
    { "total": 1234, "page": 1, "pageSize": 20, "items": [] }
    ```

Implementação: faz o que o CLI `query` faz: `FT.SEARCH idx:catalog:product ... LIMIT ... SORTBY ... RETURN $ DIALECT 2`.

### Categorias

- `GET /api/catalog/categories`
  - Response: `[{ id, name, slug, parentId, image, order }]`

Implementação: pode ler do Redis via `SCAN catalog:category:*` + `JSON.GET` (suficiente no MVP). Se crescer, criar um índice próprio depois.

### Marcas

- `GET /api/catalog/brands`
  - Response: `[{ id, name, slug, image }]`

### Disparar sync (opcional, admin)

- `POST /api/catalog/sync`
  - Observação: manter protegido (chave interna / IP allowlist), porque mexe no catálogo.

## Roteiro de validação manual (passo a passo)

1) `npm run health`
   - Esperado: `ok: true`, módulos contendo RedisJSON e RediSearch

2) `npm run import`
   - Esperado: `ok: true` e contagens `written` iguais ao total do arquivo

3) `npm run index`
   - Esperado: `ok: true` e `created: true` (na primeira vez)

4) Rodar consultas e conferir:
   - Paginação: `page` e `pageSize` aplicados; `total` > `items.length` em listas grandes
   - Filtros: `--inStock false` deve reduzir resultados quando existir stock zero
   - Busca: `-q` deve retornar itens cujo `name` contenha o termo

5) Limpar namespace (somente prefixo `catalog:`):

```bash
npm run clean
```
