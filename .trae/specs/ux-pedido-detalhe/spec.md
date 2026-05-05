---
title: UX — Detalhe do Pedido
scope: app/(shop)/cliente/meus-pedidos/[pedidoId]
date: 2026-05-05
---

## Objetivo

Reorganizar a página de detalhe do pedido para:

- Remover repetição de informações (status/data/pagamento/totais).
- Melhorar hierarquia visual (o que é “principal” vs “secundário”).
- Corrigir problemas no mobile (ordem dos blocos, legibilidade e layout).

## Contexto

A página atual já tem bom design (tokens, tipografia, cards), mas o arranjo ainda cria fricção:

- Em mobile, blocos “Resumo/Pagamento/Entrega” aparecem antes dos itens (ordem por DOM).
- Há espaços grandes entre blocos e muitos “cards separados”, gerando sensação de áreas vazias.
- “Itens do pedido” em tabela fica apertado no mobile e vira leitura pesada.
- Alguns dados aparecem em mais de um lugar (status/pagamento/totais).

## Blueprint (profissional, mantendo o layout atual)

Arquivo visual do blueprint: `blueprint.svg` (neste mesmo diretório).

Ideia central: manter o mesmo layout de cards já usado hoje, mas com arranjo mais profissional e mais informativo:

1) **Topo (identidade do pedido + ações)**  
2) **Timeline (status) + dados fiscais, sem invenção**  
3) **Conteúdo (itens como principal + sidebar com 3 cards: Totais, Pagamento, Entrega)**

### 0) Grid e densidade

- Base: `grid` com `gap-3` (não `gap-4/5`) para reduzir áreas vazias.
- Cards: padding consistente `p-4` e `sm:p-5` apenas onde necessário.
- Separadores: usar com parcimônia (menos linhas horizontais por “default”).

### 1) Header (fixar hierarquia)

- Manter breadcrumb.
- Título: `Pedido #<id>` + badge de status (somente uma vez).
- Ações: Voltar + Atualizar (desktop à direita; mobile em 2 botões full width).
- Metadados: Data + Pagamento (método) + (opcional) status do pagamento somente se diferente do status do pedido.

### 2) Timeline + dados fiscais (sem fallback “inventado”)

- Inserir um card compacto “Status do pedido” com uma timeline simples.
- A timeline só mostra passos sustentados por dados existentes:
  - Pedido criado (createdAt / dateOrder)
  - Pagamento confirmado (quando houver status/datetime de pagamento)
  - Status atual (sempre)
  - Enviado/Entregue apenas se o status do pedido vier com esses termos.
- Inserir “Dados fiscais” (CPF/CNPJ do pedido e, se existir, cobrança) puxando do payload real (raw/payload/cliente/cgc/CPFCNPJ).

### 3) Conteúdo (ordem e responsividade)

Mobile (ordem vertical):

1. Itens do pedido (principal).
2. Status do pedido (timeline) + Dados fiscais.
3. Itens do pedido.
4. Totais (breakdown).
5. Pagamento (inclui Pix, quando existir).
6. Entrega (endereço + frete).

Desktop:

- Coluna principal (2/3): Itens do pedido.
- Sidebar (1/3): um card “Detalhes” (Pagamento + Entrega) + um card “Totais”.

### 4) Itens do pedido (mobile-first, sem tabela espremida)

- Em mobile: lista de itens com layout em 2 linhas:
  - Linha 1: foto + nome (truncate) + subtotal à direita
  - Linha 2: `Qtd x Unit.` (texto menor) + SKU opcional
- Em `sm+`: manter tabela (boa densidade).

Isso remove o “efeito planilha” no mobile e reduz altura/ruído.

### 5) Ações extras (úteis e reais)

- Adicionar ações utilitárias (sem inventar recursos de negócio):
  - Copiar número do pedido
  - Copiar JSON do pedido (raw/payload) para debug/suporte
  - Baixar JSON (opcional) como arquivo local

### 6) Pix (ergonomia)

- Botão “Copiar” com largura adequada no mobile (evitar quebrar ou sair da tela).
- Campo “copia e cola” com quebra de linha e sem overflow horizontal.

## Não-objetivos

- Não mudar tema, cores, tipografia, nem componentes base (shadcn).
- Não alterar contratos de API nem a forma de carregamento do pedido (store).
