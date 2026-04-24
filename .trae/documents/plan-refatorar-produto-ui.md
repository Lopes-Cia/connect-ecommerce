# Plano — Refatorar página de produto (UI/UX)

## Objetivo

Refatorar a página de produto em `app/(shop)/produtos/[...slug]` para se aproximar do layout da referência enviada (PDP clássica): galeria à esquerda, informações e compra à direita, abas de conteúdo abaixo e seção “Você também pode gostar”.

## Referência (o que vamos espelhar)

- **Topo**: breadcrumb discreto.
- **Above the fold**: grade com
  - **Esquerda**: imagem principal + thumbnails verticais/horizontais (já existe).
  - **Direita**: categoria/brand, nome, rating (placeholder), preço, atributos (SKU/estoque), quantidade + CTA (add to cart/buy).
  - **Ações secundárias**: “share on”.
- **Abaixo**: área tabulada (Descrição / Informações adicionais / …). Como não existe sistema de reviews hoje, “Reviews” vira placeholder ou fica fora do escopo (decisão na execução).
- **Fim**: vitrine “Você também pode gostar” com carrossel.

## Escopo de mudança (mínimo e seguro)

- **Layout da página**: reorganizar `ProdutoClient` para uma hierarquia de seções mais próxima da referência.
- **Breadcrumb**: substituir o `<nav>` manual do produto pelo componente de breadcrumb já usado na categoria (`components/ui/breadcrumb`), mantendo rotas existentes.
- **Bloco de compra**: ajustar `ProductActivity` para “parecer PDP”, sem mudar a lógica de carrinho/checkout.
- **Conteúdo abaixo da dobra**: trocar o bloco atual de `ProductInfo` (seções empilhadas) por uma experiência “tipo tabs”:
  - Implementar tabs leves (sem dependência externa) ou criar `components/ui/tabs` no padrão do repo (decisão na execução).
  - Mapear os conteúdos atuais (descrição completa, specs técnicas, aviso legal, etc.) para as tabs.
- **Cross-sell**: adicionar seção “Você também pode gostar” reutilizando `ProductCarousel` já existente.
  - Fonte de dados segura (sem novas APIs): usar os produtos já disponíveis no `ECOMMERCESTORE` (home: “Mais vendidos”/“Promoções”), ou, se fizer mais sentido, usar `loadProdutosByCategoria` (exige expor categoryId no viewModel).

## Fora do escopo (para evitar risco)

- Implementar reviews reais (API, persistência, contagem, nota).
- Implementar variações reais (cor/tamanho) se não houver dados no modelo.
- Implementar cálculo de frete/CEP de verdade (hoje é placeholder).
- Alterar contratos de API ou normalização de dados além do necessário para o layout.

## Estratégia de implementação

1. **Levantamento e mapeamento**
   - Confirmar quais dados existem no `ProdutoDetailViewModel` para “SKU/Disponibilidade/Categoria/Marca”.
   - Definir o que vira UI estática (rating/share) vs. UI real (preço/estoque/CTA).

2. **Refatorar composição do topo**
   - Criar um “ProductHeader” (composição) dentro de `ProdutoClient`:
     - Coluna 1: `ImageViewer` (já atende o padrão de thumbnails).
     - Coluna 2: “ProductMeta” (novo, só apresentação) com nome/categoria/marca/sku/estoque/mini specs.
     - Coluna 3 (ou inline na 2): `ProductActivity` (mantendo handlers existentes).

3. **Aba de conteúdo**
   - Criar um componente local (ex.: `ProductTabs`) para alternar “Descrição” e “Informações adicionais”.
   - Reaproveitar `ProductInfo` internamente ou dividir em subcomponentes (sem mudar a fonte dos textos).

4. **Seção “Você também pode gostar”**
   - Reutilizar `app/(shop)/_components/ProductCarousel`.
   - Começar com fonte de dados do `ECOMMERCESTORE` (mais seguro) e só evoluir para “por categoria” se necessário.

5. **Responsividade e polimento**
   - Mobile: stack vertical (galeria → infos → CTA → tabs → carrossel), com espaçamento próximo ao layout da categoria.
   - Estados: loading/erro mantendo o visual atual (cards com borda tracejada).

## Critérios de aceite (validação)

- UI do produto segue a estrutura da referência: galeria + infos/compra + tabs + “Você também pode gostar”.
- Breadcrumb usa o mesmo padrão visual da categoria (fonte/tokens e componente).
- Ações principais continuam funcionando: “Adicionar ao carrinho” e “Comprar agora”.
- Nenhuma regressão de TypeScript nos arquivos alterados (checagem via diagnósticos).

## Arquivos alvo (prováveis)

- `app/(shop)/produtos/[...slug]/produto-client.tsx` (principal)
- `app/(shop)/produtos/_components/*` (ajustes pontuais)
- `app/(shop)/_components/ProductCarousel.tsx` (somente reutilização, sem mudança idealmente)
- `lib/produtos/viewModels.ts` (apenas se precisar expor dados extras como categoryId/sku explicitamente)

