---
title: Checklist — UX Detalhe do Pedido
scope: app/(shop)/cliente/meus-pedidos/[pedidoId]
date: 2026-05-05
---

## Aceite (UX)

- [ ] Em mobile, “Itens do pedido” aparece antes de Resumo/Pagamento/Entrega.
- [ ] Não há repetição de status em mais de um lugar (exceto quando status de pagamento difere).
- [ ] Itens são legíveis no mobile (lista/cards; sem tabela espremida e sem overflow).
- [ ] Existe card “Status do pedido” com timeline baseada em dados reais.
- [ ] Existe bloco “Dados fiscais” (CPF/CNPJ) quando disponível no payload.
- [ ] Existe ações utilitárias (copiar pedido / copiar ou baixar JSON) sem poluir o layout.
- [ ] Pix “copia e cola” quebra linha e o botão “Copiar” não sai da tela.
- [ ] Desktop mantém: itens à esquerda (2 colunas) e sidebar à direita (1 coluna).

## Aceite (técnico)

- [ ] Sem novos erros TypeScript/JS nos diagnostics.
- [ ] Loading state espelha a estrutura do success (ordem e grid).
