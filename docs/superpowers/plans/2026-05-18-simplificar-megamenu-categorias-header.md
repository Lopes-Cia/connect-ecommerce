# Simplificar megamenu de categorias (Header) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplificar o menu de categorias no header para um dropdown de 2 níveis (raiz → filhos) sem busca e sem seções extras.

**Architecture:** Mantém `CategoryHeader` com `DropdownMenu`, preserva o comportamento mobile (apenas link) e simplifica o conteúdo desktop para duas colunas (raízes e filhos do root ativo).

**Tech Stack:** Next.js (App Router), React, shadcn/ui DropdownMenu, Zustand (`useProdutosStore`).

---

## Files

- Modify: `c:/LOPES/www/connect-ecommerce/components/layout/CategoryHeader.tsx`
- Verify: `npm run lint`, `npm run build`

---

### Task 1: Simplificar UI do dropdown (2 níveis)

**Files:**
- Modify: `components/layout/CategoryHeader.tsx`

- [ ] **Step 1: Remover complexidade do megamenu**
  - Remover busca (`Input`) e seu estado (`query`)
  - Remover cards laterais (Ofertas/Mais vendidos) e imports (`Badge`, `Separator`)
  - Remover renderização de nível 3 (netos)

- [ ] **Step 2: Implementar layout 2 colunas**
  - Coluna esquerda: lista de categorias raiz
  - Coluna direita: lista de filhos do root ativo (ou mensagem “Sem subcategorias”)
  - Hover/focus na raiz altera root ativo; click navega

- [ ] **Step 3: Higienizar imports/estados**
  - Remover imports e estados não usados após simplificação
  - Garantir que `loadCategoriasTree` continue sendo chamado e erros exibidos

---

### Task 2: Verificação

- [ ] **Step 1: Rodar lint**

Run:
```bash
npm run lint
```
Expected: sem errors (warnings ok).

- [ ] **Step 2: Rodar build**

Run:
```bash
npm run build
```
Expected: build completo sem falhas de TypeScript.

