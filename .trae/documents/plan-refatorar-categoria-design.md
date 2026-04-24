# Plano — Refatorar PLP de Categoria para novo design

## Resumo
- Objetivo: refatorar a página [page.tsx](file:///c:/LOPES/www/connect-ecommerce/app/(shop)/categoria/%5B...slug%5D/page.tsx) para adotar um layout inspirado no print enviado (hero/banner + barra de filtros horizontal + grid “full width”), mantendo a lógica atual de carregamento, busca e paginação.
- Escopo aprovado: **somente** `/categoria/[...slug]`.
- Cards de produto: **reutilizar os existentes** via `ProductCardVariant` (sem criar card novo).
- Hero aprovado: usar **/public/assets/banner-1.webp** como fundo.

## Estado atual (análise)
- A página é client component e carrega:
  - `categoriasTree` para breadcrumb e select de navegação.
  - Categoria por slug + produtos paginados por categoria (`page`, `pageSize=24`).
- UI atual já possui:
  - Breadcrumb (shadcn breadcrumb) no topo.
  - Bloco de filtros (select de categoria + input de busca + botão limpar) e paginação (Anterior/Próxima) dentro do mesmo card.
  - Grid de produtos com `ProductCardVariant`.
- Padrões similares existem em:
  - [marca/[...slug]/page.tsx](file:///c:/LOPES/www/connect-ecommerce/app/(shop)/marca/%5B...slug%5D/page.tsx)
  - [products/page.tsx](file:///c:/LOPES/www/connect-ecommerce/app/(shop)/products/page.tsx)
- Assets disponíveis para hero/banner em `public/assets` (inclui `banner-1.webp`).

## Mudanças propostas (design + refactor)

### 1) Reorganizar a estrutura visual em 3 “faixas”
**Arquivo**
- [categoria/[...slug]/page.tsx](file:///c:/LOPES/www/connect-ecommerce/app/(shop)/categoria/%5B...slug%5D/page.tsx)

**Como**
- Substituir o “Header” atual por um **Hero** de largura total:
  - Fundo com `next/image` usando `/assets/banner-1.webp`.
  - Overlay (gradiente + leve escurecimento) para garantir legibilidade do texto.
  - Título (categoria) + subtítulo.
  - Breadcrumb dentro do hero (abaixo do título), mantendo o componente shadcn existente.
- Criar uma **Toolbar de filtros** mais próxima ao print:
  - Uma barra horizontal com:
    - “Showing X–Y of Z” adaptado para `Exibindo {filteredProducts.length} de {total} produtos`.
    - Select de categoria (navegação) e input de busca lado a lado.
    - Botão “Limpar filtros” alinhado à direita quando aplicável.
  - Responsivo:
    - Mobile: stack vertical, mantendo espaçamentos.
    - Desktop: linha única com gaps consistentes.
- Manter o **Grid de produtos** com `ProductCardVariant`, ajustando apenas layout:
  - Ajustar `gap`, `justify-items`, e número de colunas para ficar visualmente mais próximo ao print (grid “arejado” e centrado).

**Por quê**
- Aproximar o visual do print sem mexer em regras de negócio.
- Melhorar hierarquia: hero (contexto), toolbar (controle), grid (conteúdo).

### 2) Paginação: manter lógica, refatorar apresentação
**Como**
- Manter `page`, `totalPages`, `canPrev`, `canNext` e handlers existentes.
- Mover a paginação para uma área mais “editorial”:
  - Opção A (mínima e segura): manter “Anterior/Próxima” e o texto “Página X de Y”, mas com estilo semelhante a “pills”.
  - Opção B (mais fiel ao print, ainda segura): renderizar botões numerados quando `totalPages` for pequeno (ex.: até 7) e usar reticências quando for maior, preservando acessibilidade.

**Decisão no plano (para execução)**
- Implementar **Opção A** (mínima) para reduzir risco de regressão.

### 3) Refatoração de JSX em “subcomponentes” locais (sem criar arquivos novos)
**Como**
- Criar funções internas (no mesmo arquivo) para renderização:
  - `HeroSection`
  - `FiltersToolbar`
  - `ProductsSection`
- Não mover helpers (`asRecord`, `toProductItem`, etc.) para libs compartilhadas neste passo (refactor maior, risco maior).

**Por quê**
- Isolar responsabilidades visuais e reduzir chance de quebrar lógica de carregamento.

## Decisões e suposições (travadas)
- Aplicar design apenas em `/categoria/[...slug]`.
- Usar `/public/assets/banner-1.webp` no hero.
- Reutilizar `ProductCardVariant` sem alterações no card.
- Não alterar endpoints, payloads, nem regras de paginação/busca (somente reestilização e reorganização do layout).

## Critérios de aceite
- A página continua carregando categoria + produtos corretamente (sem mudar comportamento de busca/paginação).
- Breadcrumb continua exibindo e navegando corretamente.
- Select de categoria continua navegando via `router.push`.
- Visual segue a intenção do print:
  - hero com banner de fundo + título/breadcrumb,
  - barra de filtros horizontal,
  - grid mais “clean”.

## Verificação (segura)
- Checar diagnósticos TypeScript/Next do workspace (sem rodar build completo).
- Navegar manualmente para 2–3 categorias diferentes e validar:
  - troca de slug reseta pagina e busca,
  - paginação (anterior/próxima) funciona,
  - busca filtra na tela,
  - select muda rota.

