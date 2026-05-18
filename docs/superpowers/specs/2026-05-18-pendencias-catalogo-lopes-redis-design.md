# Pendências do plano “origem dos dados (catálogo)” — Design

**Contexto:** o core da refatoração já está funcionando (Lopes como origem; Redis como read model para Home/Categoria com auto-sync). Restam pendências listadas no plano para fechar o “contrato operacional”.

## Objetivos

1) Criar o **doc de referência** `.trae/documents/ref-origem-dados-catalogo-lopes-redis.md`.
2) Padronizar **headers de diagnóstico** nos endpoints do catálogo.
3) Eliminar uso de **SCAN para lookup por slug**, substituindo por RediSearch (`FT.SEARCH`) para:
   - produto por slug
   - categoria por slug

## Não-objetivos

- Não mudar comportamento funcional das páginas (apenas observabilidade/performance).
- Não alterar o formato do payload dos endpoints (mantém compat).

## Design

### 1) Doc de referência

Criar `.trae/documents/ref-origem-dados-catalogo-lopes-redis.md` com:
- Estado atual (rotas + responsabilidades)
- Contratos (quais endpoints são canônicos)
- Operação (auto-sync + índice + healthcheck)
- Checklist de validação e rollback

### 2) Headers de diagnóstico (sem segredos)

Criar helper simples para reuso e aplicar em endpoints principais:
- `x-catalog-origin`: `lopes`
- `x-catalog-read-model`: `redis` ou `none`

Aplicação:
- Endpoints Redis: `/api/catalog/*`, `/api/catalog/produtos/*`, `/api/ecommerce/home`
- Endpoints Lopes: `/api/lopes/produtos/*`

### 3) Remover SCAN por slug

**Produto por slug**
- Trocar `SCAN + JSON.GET` em `/api/catalog/produtos/by-slug/[slug]` por `FT.SEARCH idx:catalog:product @slug:{/produtos/<slug>}` retornando `$`.

**Categoria por slug**
- Remover dependência de `listCatalogCategories()` baseado em `scanIterator`.
- Criar índice `idx:catalog:category` (RedisJSON) e trocar `listCatalogCategories()` para paginar via `FT.SEARCH idx:catalog:category * LIMIT offset pageSize RETURN $`.
- Manter a lógica atual de montar árvore e `findNodeBySlug`, mas com a lista vinda do índice (sem SCAN).

**Garantia de índice**
- Expandir `ensureCatalogIndex()` para garantir também `idx:catalog:category`.
- Atualizar o CLI `REDIS/src/commands/index.mjs` para criar/garantir ambos índices (produto + categoria).

## Verificação

- `GET /api/catalog/health` lista os índices e confirma módulos.
- `GET /api/catalog/produtos/by-slug/<slug>` não usa SCAN (deve resolver via índice).
- `GET /api/catalog/produtos/categorias/by-slug/<...>` retorna o mesmo payload, sem SCAN.
- `npm run lint` e `npm run build`.

