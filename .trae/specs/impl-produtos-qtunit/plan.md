## Objetivo

Atualizar o “contrato” de produto no fluxo Lopes → mock/Redis/JSON para incluir as chaves `qtUnitCaixa` e `qtUnit` de ponta a ponta, sem quebrar chamadas existentes.

## Contexto (estado atual)

- Existem 2 contratos de produto no repo:
  - `Product` (ERP/integrado) já possui `qtUnit`/`qtUnitCaixa` em `lib/types/product.ts` e usa em `lib/products/viewModels.ts`.
  - O fluxo “catálogo/mock/Redis/home JSON” usa `lib/mockups/translateLopesProdutosToProdutos.ts` e grava os docs no Redis via `lib/integration/catalogAdminService.ts`.
- Hoje `translateLopesProdutosToProdutos.ts` não declara nem preserva `qtUnit`/`qtUnitCaixa`, então esses campos se perdem no mock/home e nos docs gravados no Redis.

## Premissas / Restrições

- A mudança deve ser incremental, tipada e reversível.
- Não alterar index do Redis (FT.CREATE) a menos que você peça filtros/ordenação por esses campos.
- Evitar “fallback silencioso”: se o backend não enviar `qtUnit*`, os campos devem existir no output como `null` (campo presente, valor desconhecido), em vez de inventar `0`.

## Plano (passos)

1) Atualizar o tradutor Lopes → ProdutoMock
   - Em `lib/mockups/translateLopesProdutosToProdutos.ts`:
     - Ampliar `LopesProdutoRaw` para incluir `qtUnitCaixa` e `qtUnit`.
     - Ampliar `ProdutoMock` para incluir `qtUnitCaixa` e `qtUnit` (como `number | null`).
     - No `return { ... }` do `translateLopesProdutosToProdutosMock`, incluir `qtUnitCaixa` e `qtUnit` parseados.

2) Propagar contrato para o restante do “produto catálogo”
   - Atualizar o tipo `Produto` em `lib/types/produtos.ts` para aceitar `qtUnitCaixa?: number | null` e `qtUnit?: number | null` (compatível com múltiplas fontes).
   - (Opcional, se necessário) declarar explicitamente esses campos no `ProdutoSchema` de `lib/produtos/viewModels.ts` para documentação/clareza (mesmo com `.passthrough()`).

3) Garantir impacto em Redis e JSON
   - Redis: confirmar que `catalogAdminService.ts` continua gravando o doc inteiro (já faz `upsertJsonDocs({ docs: produtos })`), então os novos campos passam a ser persistidos automaticamente.
   - JSON Home: `app/api/dev/home/update-json/route.ts` usa o tradutor; ao regenerar `lib/mockups/data/colections.json`, os novos campos passarão a existir nos itens de produto das seções.

4) Validação
   - Rodar diagnósticos TypeScript para garantir que não há erros.
   - Verificação pontual por leitura (sem testes longos): conferir que o objeto retornado pelo tradutor contém `qtUnit`/`qtUnitCaixa`.

## Critérios de aceite

- `LopesProdutoRaw`, `ProdutoMock` e o objeto retornado do tradutor contêm `qtUnit` e `qtUnitCaixa`.
- Redis: ao executar o sync de catálogo, os docs `prefix:product:*` passam a incluir `qtUnit`/`qtUnitCaixa`.
- JSON: ao executar o update-json, os produtos em `colections.json` passam a incluir `qtUnit`/`qtUnitCaixa`.
- Sem erros de TypeScript.

