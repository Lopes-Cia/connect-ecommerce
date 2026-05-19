# Plano — Corrigir cálculo do carrinho (embalagem)

## Summary
Corrigir o valor/subtotal do carrinho para considerar embalagem, usando a regra:

`totalItem = quantidade * qtUnit * qtUnitCaixa * price`

Onde `price` é o valor unitário. O carrinho é 100% client-side (localStorage).<mccoremem id="01KRZQJT818B31T47X3NNV0FWM" />

## Current State Analysis
- O carrinho persiste itens em `localStorage` e calcula total usando `unitPrice * quantity`:
  - Store: [carrinho-store.ts](file:///c:/LOPES/www/connect-ecommerce/stores/carrinho-store.ts)
  - Sidebar: [CartSidebarMenu.tsx](file:///c:/LOPES/www/connect-ecommerce/components/layout/CartSidebarMenu.tsx#L146-L148)
  - Página carrinho: [cart/page.tsx](file:///c:/LOPES/www/connect-ecommerce/app/(shop)/cart/page.tsx#L70-L110)
- No detalhe do produto, já existe no UI o conceito de embalagem:
  - `embalagemUnits = view.qtUnit * view.qtUnitCaixa`
  - `embalagemValue = embalagemUnits * view.price`
  - Cálculo atual em: [produto-client.tsx](file:///c:/LOPES/www/connect-ecommerce/app/(shop)/produtos/%5B...slug%5D/produto-client.tsx#L211-L222)
  - O `ProductActivity` exibe “Total” usando `embalagemValue * quantity`, mas ao adicionar no carrinho grava `unitPrice: price` (unitário), quebrando o total do carrinho: [ProductActivity.tsx](file:///c:/LOPES/www/connect-ecommerce/app/(shop)/produtos/_components/ProductActivity.tsx#L54-L73)
- Checkout já usa itens do store (localStorage) para montar pedido mockup:
  - Tela de checkout: [CheckoutForm.tsx](file:///c:/LOPES/www/connect-ecommerce/app/(shop)/checkout/_components/CheckoutForm.tsx#L105-L152)
  - Builder do payload: [buildPedidoItensFromCarrinho](file:///c:/LOPES/www/connect-ecommerce/stores/pedidos-store.ts#L180-L209)

## Assumptions & Decisions (confirmados)
- Fallback quando `qtUnit`/`qtUnitCaixa` ausentes/0/null: usar multiplicador `1`.
- UI do carrinho deve mostrar preço “por embalagem” quando houver embalagem (multiplicador > 1).
- No payload do pedido (OrderLopes), `qt` deve continuar sendo apenas `quantidade` (sem multiplicar).

## Proposed Changes

### 1) Persistir multiplicador de embalagem no item do carrinho
**Arquivos**
- [carrinho-store.ts](file:///c:/LOPES/www/connect-ecommerce/stores/carrinho-store.ts)
- [CartContext.tsx](file:///c:/LOPES/www/connect-ecommerce/contexts/CartContext.tsx)

**Mudanças**
- Estender `CartItem` para carregar `embalagemUnits` (ex.: `qtUnit * qtUnitCaixa`).
- Estender o input de `addItem` para aceitar `embalagemUnits?: number`.
- Normalização:
  - Se `embalagemUnits` for number finito e > 1, guardar como inteiro (Math.floor).
  - Caso contrário, tratar como `1`.
- Atualizar `computeTotalAmount()` para somar `item.unitPrice * (embalagemUnits) * item.quantity`.
- Manter compatibilidade com itens já salvos no localStorage (sem campo): tratar como `1`.

### 2) Passar `embalagemUnits` ao adicionar no carrinho (detalhe do produto)
**Arquivos**
- [produto-client.tsx](file:///c:/LOPES/www/connect-ecommerce/app/(shop)/produtos/%5B...slug%5D/produto-client.tsx)
- [ProductActivity.tsx](file:///c:/LOPES/www/connect-ecommerce/app/(shop)/produtos/_components/ProductActivity.tsx)

**Mudanças**
- `produto-client.tsx` já calcula `embalagemUnits`; repassar para `ProductActivity` via nova prop `embalagemUnits`.
- `ProductActivity` ao chamar `addItem`, incluir `embalagemUnits`.
- Para produtos sem embalagem, não enviar (ou enviar `1`) e o store normaliza.

### 3) Corrigir subtotal e exibição no carrinho/checkout
**Arquivos**
- [CartSidebarMenu.tsx](file:///c:/LOPES/www/connect-ecommerce/components/layout/CartSidebarMenu.tsx)
- [cart/page.tsx](file:///c:/LOPES/www/connect-ecommerce/app/(shop)/cart/page.tsx)
- [CheckoutForm.tsx](file:///c:/LOPES/www/connect-ecommerce/app/(shop)/checkout/_components/CheckoutForm.tsx)

**Mudanças**
- Subtotal por item: `item.unitPrice * (embalagemUnits) * item.quantity`.
- Exibição do “preço unitário”:
  - Se `embalagemUnits > 1`: mostrar `formatCurrency(item.unitPrice * embalagemUnits)` e texto “por embalagem”.
  - Senão: manter `formatCurrency(item.unitPrice)` e texto “por unidade”.
- Total do carrinho (`totalAmount`) já sai correto pelo store.

### 4) Ajustar payload do pedido (OrderLopes) para manter `qt = quantidade`
**Arquivo**
- [pedidos-store.ts](file:///c:/LOPES/www/connect-ecommerce/stores/pedidos-store.ts#L180-L209)

**Mudanças**
- `qt` continua sendo `item.quantity`.
- `valorUnitario` passa a ser `item.unitPrice * embalagemUnits`.
- `subTotal = valorUnitario * qt`.

## Verification
- `npm run lint`
- `npm run build`
- Verificações manuais:
  - Produto com `qtUnit` e `qtUnitCaixa` > 0: adicionar com quantity > 1 e confirmar subtotal no sidebar e na página do carrinho.
  - Produto sem embalagem: comportamento idêntico ao atual (multiplicador 1).
  - Checkout: resumo e envio do pedido continuam funcionando (sem usar `/api/carrinho/*`), e total exibido bate com a regra.

