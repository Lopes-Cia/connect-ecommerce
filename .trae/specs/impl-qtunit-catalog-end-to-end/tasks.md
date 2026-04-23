# Tasks

- [x] Task 1: Auditar ponto de origem (payload Lopes) para qtUnit/qtUnitCaixa
  - [x] Identificar em qual endpoint/shape do Lopes (`getBackListProdutoLoja`) esses campos aparecem (ou se não existem na origem)
  - [x] Registrar o “caminho de dados” (origem → tradutor → Redis → API → PDP) e quais pontos já estão preservando vs. descartando

- [x] Task 2: Propagar qtUnit/qtUnitCaixa no tradutor `liz_refator` (catálogo)
  - [x] Atualizar `liz_refator/contracts/lopes/raw.ts` para incluir `qtUnit` e `qtUnitCaixa`
  - [x] Atualizar `liz_refator/contracts/lopes/models.ts` (`ProdutoMock`) para incluir `qtUnit: number | null` e `qtUnitCaixa: number | null`
  - [x] Atualizar `liz_refator/contracts/lopes/translate.ts` para mapear/parsear os campos

- [x] Task 3: Garantir persistência e retorno via Redis/API
  - [x] Confirmar que `catalogAdminService.ts` grava o doc inteiro do produto no Redis (sem filtros)
  - [x] Confirmar que os endpoints `app/api/catalog/produtos/by-slug`, `by-id`, `by-categoria` retornam o doc completo (incluindo novos campos)
  - [x] (Se necessário) ajustar qualquer “shape final” que esteja removendo campos

- [x] Task 4: Expor na PDP (sem fallback e sem “quadro dentro de quadro”)
  - [x] Atualizar `lib/produtos/viewModels.ts` para carregar `qtUnit`/`qtUnitCaixa` no `ProdutoDetailViewModel` quando presentes
  - [x] Renderizar as linhas no bloco de specs em `ProductSummary` somente quando os valores existirem

- [x] Task 5: Validação mínima (evidência ponta-a-ponta)
  - [x] Diagnósticos TypeScript sem erros nos arquivos alterados
  - [x] Evidência via API: resposta de `/api/catalog/produtos/by-slug/:slug` contém `qtUnit`/`qtUnitCaixa` para um produto de teste que possua os campos
  - [x] Evidência via UI: PDP mostra as linhas “Quantidade por unidade/caixa” quando presentes

# Task Dependencies

- Task 2 depende de Task 1 (para garantir o nome/shape correto do campo na origem).
- Task 3 depende de Task 2.
- Task 4 depende de Tasks 2–3.
- Task 5 depende de Tasks 2–4.
