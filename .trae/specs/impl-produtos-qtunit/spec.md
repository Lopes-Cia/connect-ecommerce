# Contrato de Produtos (qtUnit/qtUnitCaixa) — Spec

## Why

Hoje os campos `qtUnit` e `qtUnitCaixa` existem no contrato do produto integrado (ERP), mas se perdem no fluxo de catálogo (mock/Redis/JSON). Isso impede o uso consistente desses dados em toda a aplicação.

## What Changes

- Incluir `qtUnitCaixa` e `qtUnit` no payload de entrada do tradutor Lopes (`LopesProdutoRaw`).
- Incluir `qtUnitCaixa` e `qtUnit` no contrato de saída do tradutor (`ProdutoMock`) e no objeto retornado.
- Propagar `qtUnitCaixa` e `qtUnit` para o contrato global de produto do catálogo (`lib/types/produtos.ts`) como campos opcionais/nullable.
- (Opcional) Declarar `qtUnitCaixa` e `qtUnit` explicitamente no schema de detalhe (`lib/produtos/viewModels.ts`) para manter o contrato documentado (mesmo com `.passthrough()`).

## Impact

- Affected specs:
  - Mock Lopes → produto catálogo
  - Persistência do catálogo no Redis (docs JSON gravados)
  - Geração/atualização do JSON de home (colections.json)
- Affected code:
  - `lib/mockups/translateLopesProdutosToProdutos.ts`
  - `lib/types/produtos.ts`
  - `lib/produtos/viewModels.ts` (schema)
  - `lib/integration/catalogAdminService.ts` (propagação via doc gravado, sem alteração estrutural)
  - `app/api/dev/home/update-json/route.ts` (propagação via tradutor)

## ADDED Requirements

### Requirement: Preservar qtUnit/qtUnitCaixa no produto catálogo

O sistema SHALL preservar os campos `qtUnit` e `qtUnitCaixa` no fluxo Lopes → produto catálogo (mock/Redis/JSON).

#### Scenario: Campos presentes no payload do Lopes
- **WHEN** o tradutor receber itens com `qtUnit` e/ou `qtUnitCaixa`
- **THEN** o `ProdutoMock` retornado SHALL conter `qtUnit` e `qtUnitCaixa` com os valores parseados

#### Scenario: Campos ausentes no payload do Lopes
- **WHEN** o tradutor receber itens sem `qtUnit` e/ou `qtUnitCaixa`
- **THEN** o `ProdutoMock` retornado SHALL conter `qtUnit` e `qtUnitCaixa` como `null` (campo presente, valor desconhecido)

### Requirement: Contrato global do catálogo aceita qtUnit/qtUnitCaixa

O sistema SHALL expor `qtUnit` e `qtUnitCaixa` no tipo global `Produto` do catálogo como campos opcionais/nullable para compatibilidade com múltiplas fontes.

#### Scenario: Consumo por APIs do catálogo
- **WHEN** o Redis retornar um `Produto` contendo `qtUnit`/`qtUnitCaixa`
- **THEN** o TypeScript SHALL aceitar o objeto sem casts adicionais

## MODIFIED Requirements

### Requirement: Persistência do catálogo no Redis

A persistência no Redis SHALL continuar gravando o documento completo do produto; ao incluir novos campos no produto (tradutor), esses campos passam a ser persistidos automaticamente.

## REMOVED Requirements

N/A

