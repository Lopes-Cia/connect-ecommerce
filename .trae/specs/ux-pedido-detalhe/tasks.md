---
title: Tasks — UX Detalhe do Pedido
scope: app/(shop)/cliente/meus-pedidos/[pedidoId]
date: 2026-05-05
---

## Tarefas

1) Diagnóstico do layout atual
- Confirmar ordem de renderização no mobile e o que se repete.
- Identificar pontos de overflow/quebra (tabela, pix, botões).

2) Ajustar ordem mobile/desktop via grid + order
- Garantir “Itens do pedido” primeiro no mobile.
- Manter sidebar à direita no desktop.

3) Refatorar seção “Itens do pedido” para mobile-first
- `sm:hidden`: lista/card por item com:
  - Nome (+ sku se existir)
  - Qtd
  - Subtotal (e “Qtd x Unit.” em texto menor)
- `hidden sm:block`: manter tabela atual.

4) Adicionar “Status do pedido” (timeline) + “Dados fiscais”
- Montar timeline somente com dados reais do payload (sem inventar etapas).
- Exibir CPF/CNPJ do pedido quando disponível.

5) Adicionar “Ações extras” úteis
- Copiar número do pedido.
- Copiar JSON (raw/payload) e/ou baixar como arquivo.

6) Ajustar Pix para mobile
- Botão copiar com comportamento responsivo (evitar overflow).
- Container do texto com `break-words`/`whitespace-pre-wrap` se necessário.

7) Checagem de segurança (mínimo)
- Apenas diagnóstico TypeScript/Next via diagnostics do editor.
- Conferir que o loading state mantém a mesma estrutura/ordem do success.
