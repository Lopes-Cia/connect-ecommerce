# Plano — Trocar “Buscar produto” por menus de Filtros/Ordenação (sem aplicar ainda)

## Resumo
- Objetivo: na página [categoria/[...slug]/page.tsx](file:///c:/LOPES/www/connect-ecommerce/app/(shop)/categoria/%5B...slug%5D/page.tsx), substituir o bloco atual de **busca por nome** (“Buscar produto”) por **2 botões com menus**: **Filtros** e **Ordenar**.
- Importante: neste passo, **não aplicar** filtros/ordenação na lista (apenas UI + opções geradas).
- As opções de filtros devem ser geradas a partir dos dados disponíveis em `products` (`ProductCardViewModel`), para já preparar o passo 2.

## Estado atual (análise)
- A toolbar atual (no `FiltersToolbar`) tem 2 inputs:
  - Select “Categoria” (navega com `router.push`)
  - Input “Buscar produto” (controlado por `searchTerm`) que filtra `products` por nome em `filteredProducts`
  - Botão “Limpar filtros” aparece quando `searchTerm` tem valor
- O modelo que temos na página:
  - `products: ProductCardViewModel[]`
  - Campos úteis para filtros/ordenação:
    - `name` (texto)
    - `price` e `discountPrice?` (para preço efetivo)
    - `cardType` (pode indicar indisponível via `coming-soon`)
    - `category` (já temos filtro de categoria por rota)

## Decisões (já aprovadas pelo pedido)
- Remover a busca por nome **por enquanto** (volta no passo 2).
- UI dos controles: **2 botões (menu)** (estilo dropdown).
- Não é necessário aplicar filtros/ordenação agora; apenas renderizar UI e gerar opções.

## Mudanças propostas

### 1) Substituir a div do “Buscar produto” por dois menus (Filtros + Ordenar)
**Arquivo**
- [categoria/[...slug]/page.tsx](file:///c:/LOPES/www/connect-ecommerce/app/(shop)/categoria/%5B...slug%5D/page.tsx)

**Como (UI)**
- Remover o bloco:
  - label “Buscar produto”
  - `Search` icon + `<input value={searchTerm} ... />`
- Adicionar no lugar:
  - Um grupo `div` com duas colunas (responsivo) contendo:
    - Botão “Filtros” (abre menu)
    - Botão “Ordenar” (abre menu)
- Implementar menus usando componentes já existentes:
  - [dropdown-menu.tsx](file:///c:/LOPES/www/connect-ecommerce/components/ui/dropdown-menu.tsx)
  - [button.tsx](file:///c:/LOPES/www/connect-ecommerce/components/ui/button.tsx)

**Detalhe de layout**
- Manter larguras coerentes com o resto da toolbar:
  - Em desktop: “Categoria” + “Filtros” + “Ordenar”
  - Em mobile: empilhar os 3 controles

### 2) Gerar opções de “Filtros” a partir de `products` (sem aplicar)
**Como (dados)**
- Criar `useMemo` para gerar uma lista de opções baseada nos produtos carregados:
  - **Disponibilidade**:
    - “Em estoque” (onde `cardType !== 'coming-soon'`)
    - “Indisponível” (onde `cardType === 'coming-soon'`)
  - **Promoção**:
    - “Com desconto” (onde `discountPrice` existe)
  - **Preço (faixas)**:
    - Calcular `effectivePrice = discountPrice ?? price`
    - Extrair `min/max` e gerar 4 faixas (ou menos, se pouca variação), por exemplo:
      - “Até R$ X”
      - “R$ X–Y”
      - “R$ Y–Z”
      - “Acima de R$ Z”
- Mostrar essas opções no menu “Filtros” (com `DropdownMenuCheckboxItem`), apenas mudando estado local (opcional) ou apenas como itens (sem efeitos).

### 3) Definir opções de “Ordenar” (sem aplicar)
**Como (dados)**
- Menu “Ordenar” com `DropdownMenuRadioGroup` e opções estáticas (por enquanto):
  - “Padrão”
  - “Menor preço”
  - “Maior preço”
  - “A–Z”
  - “Z–A”
  - “Maior desconto”
- Seleção pode ser salva em estado local (para o passo 2), mas **não muda** o array exibido neste passo.

### 4) Ajustes de lógica (para não deixar código morto)
**Como**
- Remover `searchTerm`, `handleClearFilter` e o filtro por nome em `filteredProducts` (já que a UI de busca sai).
- Manter `filteredProducts` como `products` (ou renomear para `displayedProducts`) para manter o resto do componente simples e pronto para o passo 2.
- Remover import de `Search` se ficar sem uso.
- O botão “Limpar filtros” da toolbar:
  - Remover por enquanto (já que não teremos filtros funcionais aplicados ainda).

## Critérios de aceite
- A toolbar mostra “Categoria” + botões “Filtros” e “Ordenar” (com dropdown abrindo e exibindo opções).
- As opções de “Filtros” são derivadas de `products` (mudam conforme a categoria carregada).
- A lista de produtos continua carregando/paginando normalmente (sem regressão).
- Não existe efeito real de filtrar/ordenar a listagem neste passo.

## Verificação
- Diagnósticos TypeScript sem erros.
- Verificação visual no navegador na rota `/categoria/bebidas`:
  - Menus abrem e exibem opções
  - Paginação e grid continuam ok

