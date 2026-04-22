# Filtros, Ordenação e URL-driven State (Categoria + Redis) — Spec

## Why

A página de categoria já possui UI de filtros/ordenação, mas ainda não está funcional e a paginação não é “linkável”. Precisamos ativar filtros e ordenação usando a paginação do catálogo via Redis e tornar `page + filtros + sort` parâmetros de URL para suportar deep link e navegação consistente.

## What Changes

- A página `/categoria/[...slug]` passa a obter a lista de produtos via `GET /api/catalog/products` (Redis) com paginação, filtros e sort.
- O estado de listagem passa a ser dirigido pela URL (querystring):
  - ler `page`, `sort`, `inStock`, `priceMin`, `priceMax` da URL
  - ao interagir na UI, escrever esses parâmetros na URL e refazer o fetch
- A paginação passa a atualizar a URL (`page=...`) e a respeitar filtros/sort atuais.
- A UI de “Ordenar” passa a refletir apenas ordenações suportadas pelo endpoint Redis.

## Impact

- Affected specs: listagem de produtos por categoria, navegação por URL, consistência de paginação/filtros.
- Affected code:
  - `app/(shop)/categoria/[...slug]/page.tsx` (refatoração para URL-driven state)
  - `app/api/catalog/products/route.ts` (contrato já existente; apenas alinhamento de uso no front)
  - `lib/integration/catalogService.ts` (contrato de retorno usado pelo front)

## ADDED Requirements

### Requirement: Contrato de URL para listagem de categoria
O sistema SHALL suportar que a URL represente totalmente o estado da listagem de produtos da categoria.

#### Scenario: Deep link funcional
- **WHEN** o usuário abrir uma URL `/categoria/<slug>?page=2&sort=price:asc&inStock=true`
- **THEN** a página deve carregar a lista correspondente e exibir a paginação na página 2, com ordenação e filtros aplicados.

#### Scenario: Canonicalização e robustez de parâmetros
- **WHEN** parâmetros inválidos forem fornecidos (ex.: `page=0`, `inStock=1`, `priceMin=abc`)
- **THEN** a página deve normalizar/ignorar o inválido sem quebrar a renderização e manter comportamento consistente.

### Requirement: Integração com Redis (endpoint do catálogo)
O sistema SHALL consultar o endpoint `GET /api/catalog/products` usando os parâmetros derivados da URL e da categoria resolvida pelo slug.

#### Scenario: Request consistente
- **WHEN** a categoria for resolvida para `categoryId`
- **THEN** a requisição ao endpoint deverá incluir `categoryId`, `page` e `pageSize` e, quando presentes, `inStock`, `priceMin`, `priceMax` e `sort`.

### Requirement: Paginação sincronizada com URL
O sistema SHALL sincronizar a paginação com a URL.

#### Scenario: Navegação por paginação
- **WHEN** o usuário selecionar uma página diferente na UI de paginação
- **THEN** a URL deve ser atualizada com `page=<n>` preservando filtros e `sort`, e a lista deve ser recarregada.

#### Scenario: Reset de página ao mudar filtro/ordenação
- **WHEN** o usuário alterar qualquer filtro ou a ordenação
- **THEN** a URL deve ser atualizada e `page` deve ser resetado para `1`.

## MODIFIED Requirements

### Requirement: Ordenações suportadas
A UI SHALL oferecer apenas ordenações compatíveis com o endpoint `GET /api/catalog/products`:

- Campo/direção no formato `sort=<field>:<dir>`
- Campos permitidos: `id|name|price|stock|rank`
- Direções permitidas: `asc|desc`
- Default quando ausente: `rank:desc` (comportamento do endpoint)

Se existir opção de UI atual que não mapeie para esse contrato, ela deve ser removida ou mapeada para uma alternativa suportada.

## REMOVED Requirements

### Requirement: Estado local como fonte da verdade para filtros/pagina
**Reason**: o estado local impede deep link e tende a divergir de back/forward e refresh.
**Migration**: o estado passa a ser derivado da URL e as interações passam a escrever na URL.

