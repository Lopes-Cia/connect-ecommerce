# qtUnit/qtUnitCaixa no Catálogo (Redis/API/PDP) — Spec

## Why

Os campos `qtUnit` e `qtUnitCaixa` existem como parte do contrato de produtos, mas não aparecem na PDP nem nos endpoints de catálogo consumidos pelo frontend porque não estão sendo propagados no fluxo que popula o Redis (catálogo). Isso impede validar e usar o dado de embalagem/unidade ponta‑a‑ponta.

## What Changes

- Propagar `qtUnit` e `qtUnitCaixa` no fluxo que alimenta o catálogo (Lopes → tradutor `liz_refator` → Redis JSON).
- Garantir que os endpoints do catálogo que retornam o documento do produto (`by-slug`, `by-id`, `by-categoria`) entreguem os campos quando presentes no doc do Redis.
- (UI/PDP) Expor os valores no view model e renderizar em lista com separador discreto (label leve + valor em negrito), sem criar “quadros dentro de quadros”.

## Impact

- Affected specs:
  - Catálogo em Redis (docs JSON de `product`)
  - Endpoints `app/api/catalog/produtos/*`
  - PDP (`app/(shop)/produtos/[...slug]`)
- Affected code (alvos prováveis):
  - `liz_refator/contracts/lopes/raw.ts` (contrato do payload Lopes)
  - `liz_refator/contracts/lopes/models.ts` (shape `ProdutoMock` persistido no Redis)
  - `liz_refator/contracts/lopes/translate.ts` (mapeamento/parse dos campos)
  - `lib/integration/catalogAdminService.ts` (apenas confirmação: grava doc inteiro)
  - `app/api/catalog/produtos/by-slug/[slug]/route.ts` e `by-id/[idProduto]/route.ts`, `by-categoria/[idCategoria]/route.ts` (apenas confirmação: retornam doc)
  - `lib/produtos/viewModels.ts` (PDP view model: aceitar e mapear para specs se necessário)
  - `app/(shop)/produtos/_components/ProductSummary.tsx` (renderização na lista, sem wrapper extra)

## ADDED Requirements

### Requirement: Preservar qtUnit/qtUnitCaixa no doc do catálogo (Redis)
O sistema SHALL preservar `qtUnit` e `qtUnitCaixa` no documento do produto gravado no Redis quando o payload de origem contiver esses campos.

#### Scenario: Campos presentes na origem
- **WHEN** o payload do Lopes contiver `qtUnit` e/ou `qtUnitCaixa`
- **THEN** o doc gravado em `${CATALOG_KEY_PREFIX}:product:<id>` SHALL conter `qtUnit` e `qtUnitCaixa` com valores numéricos (ou `null` quando explicitamente informado como vazio)

#### Scenario: Campos ausentes na origem
- **WHEN** o payload do Lopes não contiver `qtUnit` e/ou `qtUnitCaixa`
- **THEN** o tradutor SHALL não inventar valores (sem defaults); os campos podem ficar ausentes no doc ou como `null`, conforme padrão definido no tradutor

### Requirement: Endpoints de catálogo retornam os campos quando presentes
Os endpoints do catálogo SHALL incluir `qtUnit` e `qtUnitCaixa` no `data` quando esses campos existirem no doc retornado do Redis.

#### Scenario: PDP consulta produto por slug
- **WHEN** o cliente fizer GET `/api/catalog/produtos/by-slug/:slug`
- **THEN** a resposta SHALL conter `data.qtUnit` e `data.qtUnitCaixa` quando o doc no Redis possuir esses campos

### Requirement: PDP exibe qtUnit/qtUnitCaixa sem degradar UI
A PDP SHALL exibir `qtUnit` e `qtUnitCaixa` no bloco de especificações (lista com separador discreto), sem adicionar um “quadro” interno extra.

#### Scenario: Valores disponíveis
- **WHEN** `qtUnit` e/ou `qtUnitCaixa` estiverem presentes no view model do produto
- **THEN** a UI SHALL renderizar linhas “Quantidade por unidade” e “Quantidade por caixa” com label leve e valor em negrito

#### Scenario: Valores indisponíveis
- **WHEN** `qtUnit` e/ou `qtUnitCaixa` estiverem ausentes ou `null`
- **THEN** a UI SHALL omitir as linhas (sem placeholders ou defaults)

## MODIFIED Requirements

### Requirement: Sincronização do catálogo para Redis
A sincronização do catálogo SHALL continuar gravando o documento completo do produto. Ao incluir novos campos no tradutor, esses campos passam a ser persistidos automaticamente no JSON do Redis.

## REMOVED Requirements

N/A

