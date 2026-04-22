## Objetivo

Ativar filtros e ordenação na página de categoria usando a mesma paginação do Redis (endpoint do catálogo), e tornar **page + filtros + sort** parâmetros de URL (querystring), com navegação consistente (deep link + back/forward).

## Escopo

- Fonte de dados: trocar a listagem da página de categoria para consultar o endpoint Redis paginado/filtrável.
- Estado dirigido por URL: a URL vira a fonte da verdade para `page`, `sort` e filtros.
- UI: menus “Filtrar” e “Ordenar” passam a alterar a URL e disparar refetch; paginação também altera a URL.

## Suposições (para não travar a execução)

- Usaremos o endpoint já existente `GET /api/catalog/products` (Redis/RediSearch) porque ele já suporta paginação + sort + filtros (conforme mapeamento anterior).
- A página de categoria já tem como obter `idCategoria` a partir do slug (já existe `loadCategoriaBySlug`/store); esse `idCategoria` será passado como `categoryId` para o endpoint Redis.
- `pageSize` continuará 24 (como já está na página), mas ficará centralizado num único lugar.

Se qualquer uma dessas suposições estiver errada durante a implementação, a prioridade é ajustar para o endpoint Redis correto (sem introduzir fallback automático).

## Contrato de URL (querystring)

Parâmetros suportados (proposta inicial):

- `page`: inteiro >= 1 (default: 1)
- `sort`: string (default: `default`)
  - `default` (ordenação padrão do catálogo)
  - `price-asc`, `price-desc`
  - `name-asc`, `name-desc`
  - `discount-desc` (somente se o catálogo suportar campo/ordenação de desconto; caso contrário, removemos da UI ou mapeamos para alternativa suportada)
- `inStock`: `1` | `0` (opcional)
- `priceMin`: number (opcional)
- `priceMax`: number (opcional)

Regras:

- Quando qualquer filtro/sort mudar, a URL deve ser reescrita com `page=1`.
- Valores inválidos são normalizados (ex.: `page=0` vira `page=1`; `priceMin` não-numérico é ignorado).
- A URL final deve refletir apenas parâmetros efetivos (sem lixo/duplicatas).

## Estratégia de implementação (alto nível)

### 1) Descoberta rápida (antes de mexer em código)

- Confirmar no endpoint Redis:
  - Quais nomes exatos de params ele aceita (`categoryId`, `inStock`, `priceMin`, `priceMax`, `sort`, etc.).
  - Quais valores de `sort` ele aceita (ex.: `price:asc`, `price:desc`, etc.) para mapear a UI atual.
  - Se existe ou não suporte real para “promoção / desconto”.

### 2) Refatorar a página de categoria para “URL-driven state”

- Extrair helpers puros:
  - `parseCategoryListQuery(searchParams) -> { page, sortKey, filters }`
  - `buildCategoryListQuery(nextState, currentSearchParams) -> string` (querystring canonicalizada)
- Ler estado inicial a partir da URL (querystring) e usar esse estado como fonte para:
  - Request ao endpoint Redis (page, pageSize, sort, filtros + categoryId)
  - Estado visual dos menus (checkbox/radio marcados)
  - Paginação (número atual)

### 3) Conectar filtros/ordenação/paginação à URL

- “Filtrar”:
  - Ao clicar num checkbox, atualizar a URL (mantendo os demais params) e resetar `page=1`.
- “Ordenar”:
  - Ao escolher uma ordenação, atualizar `sort` na URL e resetar `page=1`.
- Paginação:
  - Ao trocar página, atualizar apenas `page` na URL (mantendo filtros/sort).

### 4) Trocar a fonte de dados para o endpoint Redis

- Substituir (ou condicionar) o carregamento atual por categoria para usar `GET /api/catalog/products` com:
  - `categoryId=<idCategoria>`
  - `page=<page>`
  - `pageSize=24`
  - demais filtros/sort conforme URL
- Adaptar o shape da resposta para o `ProductCardViewModel` usado na UI.
- Atualizar `totalPages`/`totalItems` conforme retorno da API.

### 5) Ajustar a lista de opções da UI para refletir o que é suportado

- Se “discount-desc” não for suportado pelo Redis, remover essa opção (ou substituí-la por uma equivalente suportada) para não ter UX “enganosa”.
- Para filtros:
  - Manter os filtros que conseguimos mapear 1:1 para a API (ex.: estoque e faixa de preço).
  - Só ativar “promoção” se houver suporte real (campo/index) e critério inequívoco.

## Critérios de aceite (validação)

- Deep link: abrir `/categoria/<slug>?page=2&sort=price-asc&inStock=1` carrega exatamente o resultado esperado.
- Sincronização: alterar filtro/sort altera a URL; recarregar a página mantém estado e resultado.
- Reset correto: mudar filtro/sort sempre volta para `page=1`.
- Back/forward: navegação do browser restaura listagem coerente com a URL.
- Robustez: parâmetros inválidos não quebram a página (são normalizados/ignorados).

## Segurança operacional (sem fallback automático)

- Não introduzir fallback silencioso para outra fonte de dados.
- Se for necessário um fallback/feature-flag por segurança (por ser correção crítica), isso só entra com sua aprovação explícita.

## Artefatos / arquivos candidatos (a confirmar na etapa de descoberta)

- Página: `app/(shop)/categoria/[...slug]/page.tsx`
- API Redis: `app/api/catalog/products/route.ts`
- Integração Redis: `lib/integration/catalogService.ts`
- (Opcional) utilitário novo para parse/serialize de query params (se fizer sentido para reuse)

