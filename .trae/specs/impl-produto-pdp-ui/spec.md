# Refatorar Página de Produto (PDP) — Spec

## Why

A página de produto atual já funciona, mas não segue um padrão de PDP clássico e consistente com a referência de UI/UX. Isso reduz a clareza das informações acima da dobra e a descoberta de conteúdo complementar (descrição / specs / relacionados).

## What Changes

- Reestruturar o layout do produto para o padrão “PDP clássica”:
  - Galeria de imagens à esquerda.
  - Metadados/identificação do produto + bloco de compra à direita.
  - Área de conteúdo abaixo da dobra com navegação por tabs.
  - Seção “Você também pode gostar” com carrossel.
- Padronizar breadcrumb do produto usando o mesmo componente/padrão visual já usado na página de categoria.
- Implementar tabs leves e locais (sem adicionar dependências externas e sem criar novos componentes shadcn globais).
- Reutilizar componentes existentes (`ImageViewer`, `ProductActivity`, `ProductSummary`, `ProductInfo`, `BrandBlock`, `ProductCarousel`) e preservar a lógica atual de carrinho/checkout.

## Impact

- Affected specs:
  - Experiência de PDP (UI/UX)
  - Consistência visual com categoria (breadcrumb/tokens)
- Affected code:
  - `app/(shop)/produtos/[...slug]/produto-client.tsx`
  - `app/(shop)/produtos/_components/*`
  - `app/(shop)/_components/ProductCarousel.tsx` (somente consumo)
  - `app/(shop)/page.tsx` e viewModels de home (somente como referência para “Você também pode gostar”, sem mudanças idealmente)

## ADDED Requirements

### Requirement: Layout de PDP clássico

O sistema SHALL renderizar a PDP com estrutura semelhante à referência:
- breadcrumb no topo;
- grade acima da dobra com galeria + resumo/compra;
- conteúdo tabulado abaixo;
- seção de produtos recomendados/relacionados ao final.

#### Scenario: Produto carregado com sucesso
- **WHEN** o produto for carregado e convertido para `ProdutoDetailViewModel`
- **THEN** a página SHALL exibir a grade principal (galeria + metadados + compra) e as seções abaixo da dobra

### Requirement: Breadcrumb consistente com categoria

O sistema SHALL usar `components/ui/breadcrumb` na PDP, com rotas:
- Início → Categorias → [Nome do produto]

#### Scenario: Navegação do breadcrumb
- **WHEN** o usuário clicar em “Início” ou “Categorias”
- **THEN** a navegação SHALL levar para `/` e `/categorias`, respectivamente

### Requirement: Tabs locais para conteúdo abaixo da dobra

O sistema SHALL fornecer tabs locais para alternar conteúdo abaixo da dobra sem dependências externas.

#### Scenario: Alternar abas
- **WHEN** o usuário selecionar “Descrição”
- **THEN** o conteúdo de descrição completa SHALL ser exibido
- **WHEN** o usuário selecionar “Informações adicionais”
- **THEN** as especificações técnicas SHALL ser exibidas

#### Acessibilidade mínima
- As tabs SHALL ser botões com estado visual claro de seleção.
- O conteúdo SHALL mudar sem navegação de página e sem “scroll jump” inesperado.

### Requirement: Seção “Você também pode gostar”

O sistema SHALL renderizar uma seção “Você também pode gostar” com `ProductCarousel`.

#### Scenario: Lista disponível
- **WHEN** houver uma lista de produtos recomendados disponível (ex.: coleções de home)
- **THEN** a seção SHALL renderizar o carrossel com esses itens

#### Scenario: Lista indisponível
- **WHEN** não houver lista de recomendados
- **THEN** a seção SHALL renderizar um estado vazio discreto (sem quebrar o layout da página)

## MODIFIED Requirements

### Requirement: Bloco de compra mantém comportamento atual

O sistema SHALL manter o comportamento atual de:
- adicionar ao carrinho;
- comprar agora redirecionando para `/checkout`;
sem alterar o contrato do carrinho.

## REMOVED Requirements

### Requirement: Reviews reais na PDP
**Reason**: Não existe implementação de reviews no repo no momento.
**Migration**: N/A (fora do escopo).

