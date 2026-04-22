# /plan — Trazer RAW para o contrato (/api/lopes)

## Summary

Trazer os payloads “RAW” vindos do backend Lopes (endpoints `/webservice/integration/*` e `/webservice/api/*`) para um **contrato tipado e centralizado**, e padronizar as rotas **`app/api/lopes/**`** para devolverem **o objeto traduzido que o front realmente consome** (ex.: shape esperado por `lib/ecommerce/homeViewModels.ts`), eliminando `unknown` e traduções espalhadas em rotas.

Escopo confirmado: **Somente `/api/lopes`**.

## Current State Analysis (grounded)

### Onde o “RAW → traduzido” acontece hoje

- Tradução de produtos (RAW → `ProdutoMock`):
  - [translateLopesProdutosToProdutos.ts](file:///c:/LOPES/www/connect-ecommerce/lib/mockups/translateLopesProdutosToProdutos.ts)
  - Lê `input: unknown`, aceita `Array` ou `{ data: Array }` e gera `ProdutoMock` com:
    - `id,name,slug,price,inStock,image,compareAtPrice,category{...},brand{...}`
- Tradução de categorias (RAW → `Categoria[]` → `CategoriaNode[]`):
  - [syncDataFromBackToFront.ts](file:///c:/LOPES/www/connect-ecommerce/lib/mockups/syncDataFromBackToFront.ts)

### Quem consome

- Rotas `/api/lopes` chamam o backend e aplicam a tradução:
  - Categorias: [app/api/lopes/categorias/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/lopes/categorias/route.ts) usa `translateLopesCategoriasToCategoriasTree`.
  - Produto por id/slug e produto-loja: usam `translateLopesProdutoToProduto`.
  - Lista por categoria: [by-categoria/[idCategoria]/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/lopes/produtos/by-categoria/%5BidCategoria%5D/route.ts) usa `translateLopesProdutosToProdutosMock`.
- “Front que lê” esse shape na prática:
  - Home Lopes lê `colections.json` e renderiza cards via `homeViewModels`.
  - `homeViewModels` espera `section.data[]` com campos compatíveis com `ProdutoMock` (ex.: `record.category.name`, `record.compareAtPrice`, `record.inStock`, etc.):
    - [homeViewModels.ts](file:///c:/LOPES/www/connect-ecommerce/lib/ecommerce/homeViewModels.ts#L119-L149)
  - O arquivo `colections.json` é gerado no dev pela rota:
    - [app/api/dev/home/update-json/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/dev/home/update-json/route.ts)

### Problema atual

- O “contrato” não está explícito/centralizado: rotas retornam `{ success, data }` com `data` vindo de tradutores que aceitam `unknown`.
- Tipos RAW (ex.: `LopesProdutoRaw`, `LopesCategoriaRaw`) existem, mas são locais aos arquivos de mock e não fazem parte do contrato.
- A tradução fica “solta” em `lib/mockups/**`, mas o alvo é padronizar/centralizar como contrato da camada.

## Goal / Success Criteria

1) Rotas `app/api/lopes/**` retornam um contrato tipado e consistente com o que o front consome:
   - Para home: itens de produto com `category.name`, `compareAtPrice`, `inStock`, `slug`, etc.
2) Tipos RAW e tipos do contrato ficam centralizados (não espalhados / não `unknown`).
3) A lógica “RAW → contrato” fica isolada em um módulo único (para evitar drift e facilitar substituição futura).
4) Verificação mínima: **diagnósticos TypeScript limpos** (sem build/lint completo).<mccoremem id="01KPPGN18FQ0XQ6P8K474QSB0S" />

## Proposed Changes

### 1) Criar módulo de contrato para `/api/lopes`

Adicionar em `liz_refator/` (para manter a direção de “substituir a lib por ele”):

- `liz_refator/contracts/lopes/raw.ts`
  - Exportar tipos RAW (derivados dos atuais):
    - `LopesProdutoRaw` (campos como `codProd`, `descricaoEcomerce`, `ean`, `preco`, `categoriaPrinciapal`, etc.)
    - `LopesCategoriaRaw` (campos `codigo`, `codPai`, `categoria`, `imagem`, `sequencia`)
  - Exportar helpers de leitura que hoje estão “soltos” (`readListFrom`, `toIntOrZero`, etc.) quando fizer sentido.

- `liz_refator/contracts/lopes/models.ts`
  - Definir explicitamente o contrato que o front lê:
    - `LopesProdutoContract` (equivalente ao `ProdutoMock` atual: `id,name,slug,price,compareAtPrice,inStock,image,category{...},brand{...}`, etc.)
    - `LopesCategoriaContract` / `LopesCategoriaNodeContract` se necessário (hoje é `CategoriaNode`).

- `liz_refator/contracts/lopes/translate.ts`
  - Mover/replicar a lógica de tradução dos arquivos:
    - [translateLopesProdutosToProdutos.ts](file:///c:/LOPES/www/connect-ecommerce/lib/mockups/translateLopesProdutosToProdutos.ts)
    - [syncDataFromBackToFront.ts](file:///c:/LOPES/www/connect-ecommerce/lib/mockups/syncDataFromBackToFront.ts)
  - Garantir compatibilidade de shape com `homeViewModels`:
    - `category` deve ser objeto com `name`
    - `compareAtPrice` deve existir (null quando não aplicável)
    - `inStock` boolean coerente com `stock`
  - Manter o comportamento atual de aceitar `Array` e `{ data: Array }`, mas agora tipado.

Observação importante: manter a regra já usada no projeto de não deixar query sobrescrever `idIntegradora` do env em chamadas de integração, quando essa parte for usada.<mccoremem id="01KPF08MBSC1R414RM6DAAR1P9" />

### 2) Adaptar rotas `/api/lopes` para usar o contrato

Atualizar as rotas abaixo para importar do módulo de contrato (`liz_refator/contracts/lopes/*`) ao invés de depender diretamente de `lib/mockups/**`:

- `app/api/lopes/categorias/route.ts`
- `app/api/lopes/produto-loja/route.ts`
- `app/api/lopes/produtos/by-slug/[slug]/route.ts`
- `app/api/lopes/produtos/by-id/[idProduto]/route.ts`
- `app/api/lopes/produtos/by-categoria/[idCategoria]/route.ts`

O output JSON permanece `{ success: true, data: <contrato> }` (como hoje), mas o `data` fica tipado e centralizado.

### 3) Deprecar (não remover) `lib/mockups/**`

- Manter os arquivos `lib/mockups` por enquanto para não quebrar imports externos/legados.
- Opcional: trocar internamente os exports desses arquivos para reexportarem do novo módulo (estratégia “estrangulamento”), mas somente se isso não for considerado “fallback”/mascaramento.

## Assumptions & Decisions

- “Contrato” aqui significa **shape de resposta** usado pelo front (home/cards), não “raw debug”.
- O contrato atual de home/cards está implícito em `homeViewModels.ts`; vamos torná-lo explícito.
- O backend pode responder tanto `[]` quanto `{ data: [] }`; a tradução mantém essa compatibilidade.

## Verification (minimal, safe)

1) Rodar diagnósticos TypeScript (sem build):
   - Confirmar que não há erros após mover/importar tradutores.
2) Checagem rápida de consistência:
   - `homeViewModels` continua conseguindo ler `category.name`, `compareAtPrice`, `inStock`, etc. (tipos alinhados).

## Out of Scope (agora)

- Refatorar `/api/produtos/**` (BFF de produção).
- Alterar o formato de `colections.json` além do que o front já lê.
- “RAW debug” no contrato de produção (isso permanece restrito ao `/dev` quando necessário).

