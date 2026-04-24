# Tasks

- [x] Task 1: Atualizar tradutor Lopes → ProdutoMock para incluir qtUnit/qtUnitCaixa
  - [x] Incluir `qtUnitCaixa` e `qtUnit` em `LopesProdutoRaw`
  - [x] Incluir `qtUnitCaixa: number | null` e `qtUnit: number | null` em `ProdutoMock`
  - [x] Preencher `qtUnitCaixa` e `qtUnit` no `return { ... }` do tradutor com parse para `number | null`

- [x] Task 2: Propagar contrato para o tipo global do catálogo
  - [x] Atualizar `lib/types/produtos.ts` (`Produto`) para incluir `qtUnitCaixa?: number | null` e `qtUnit?: number | null`

- [x] Task 3: (Opcional) Documentar campos no schema de detalhe do produto
  - [x] Atualizar `lib/produtos/viewModels.ts` (`ProdutoSchema`) para aceitar `qtUnitCaixa` e `qtUnit` como `z.coerce.number().nullable().optional()`

- [x] Task 4: Garantir propagação para Redis e JSON sem alterações de índice
  - [x] Confirmar que `catalogAdminService.ts` grava o doc inteiro do produto (nenhuma mudança de código, apenas verificação)
  - [x] Confirmar que `app/api/dev/home/update-json/route.ts` usa o tradutor e, portanto, passa a incluir os novos campos no JSON gerado

- [x] Task 5: Validação mínima
  - [x] Verificar diagnósticos TypeScript sem erros
  - [x] Verificação pontual por leitura: conferir que o tradutor retorna `qtUnit`/`qtUnitCaixa` no output

# Task Dependencies

- Task 4 depende de Task 1 (os campos precisam existir no tradutor para propagar).
- Task 5 depende de Tasks 1–3.
