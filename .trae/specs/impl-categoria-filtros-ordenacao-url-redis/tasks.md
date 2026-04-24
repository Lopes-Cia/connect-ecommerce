# Tasks

- [x] Task 1: Definir contrato final de querystring e mapeamento de sort/filtros
  - [x] Confirmar parâmetros aceitos por `GET /api/catalog/products` e defaults (`page`, `pageSize`, `sort`, `inStock`, `priceMin`, `priceMax`, `categoryId`)
  - [x] Definir mapeamento da UI atual para `sort=<field>:<dir>` (removendo/ajustando opções incompatíveis)
  - [x] Definir canonicalização: clamp de page, remoção de params vazios e reset de `page=1` em mudanças de filtro/sort

- [x] Task 2: Refatorar página de categoria para URL-driven state
  - [x] Ajustar estrutura para suportar leitura de query params com segurança (padrão com componente client dedicado, se necessário)
  - [x] Implementar parse/serialize de query params (helpers puros) para `page`, `sort`, `inStock`, `priceMin`, `priceMax`
  - [x] Remover `useState` como fonte da verdade para `page`, `sortKey` e filtros; derivar da URL

- [x] Task 3: Conectar listagem ao endpoint Redis com paginação/filtros/sort
  - [x] Resolver `categoryId` a partir do slug (fluxo já existente) e usar no request
  - [x] Implementar fetch para `GET /api/catalog/products` com `pageSize=24` e parâmetros derivados da URL
  - [x] Adaptar retorno `{ total, page, pageSize, items }` para `ProductCardViewModel[]` (reusar `toProductItem`)
  - [x] Calcular `totalPages` no front a partir de `total` e `pageSize` (mantendo UI de paginação)
  - [x] Garantir estados de loading/erro já existentes continuem corretos

- [x] Task 4: Conectar UI de filtros/ordenação e paginação à URL
  - [x] “Filtros”: ao marcar/desmarcar, atualizar a URL e resetar `page=1`
  - [x] “Ordenar”: ao selecionar, atualizar `sort` na URL e resetar `page=1`
  - [x] Paginação: atualizar `page` na URL preservando filtros/sort
  - [x] Garantir back/forward do navegador restaure corretamente o estado (URL = fonte da verdade)

- [x] Task 5: Verificação mínima e sanidade
  - [x] Checar diagnósticos TypeScript/Next da área alterada
  - [x] Verificar manualmente (via URL) pelo menos 3 combinações: somente page; page+sort; page+inStock+priceMin/Max

# Task Dependencies
- Task 2 depende de Task 1
- Task 3 depende de Task 2
- Task 4 depende de Task 2 e Task 3
- Task 5 depende de Task 1–4
