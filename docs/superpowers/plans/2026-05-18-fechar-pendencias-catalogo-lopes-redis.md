# Fechar pendências do catálogo (Lopes ↔ Redis) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar as pendências do plano: doc de referência, headers de diagnóstico e remoção de SCAN por slug (produto + categoria) usando RediSearch.

**Architecture:** Centraliza headers de diagnóstico em helper, garante índices (produto + categoria) no Next e no CLI `REDIS/`, e troca endpoints `by-slug`/listagens para `FT.SEARCH` em vez de `SCAN`.

**Tech Stack:** Next.js (App Router), RedisJSON, RediSearch, Node Redis client.

---

## Files

- Create: `c:/LOPES/www/connect-ecommerce/.trae/documents/ref-origem-dados-catalogo-lopes-redis.md`
- Create: `c:/LOPES/www/connect-ecommerce/lib/integration/catalogHeaders.ts`
- Modify: `c:/LOPES/www/connect-ecommerce/lib/integration/catalogAdminService.ts`
- Modify: `c:/LOPES/www/connect-ecommerce/lib/integration/catalogService.ts`
- Modify: `c:/LOPES/www/connect-ecommerce/REDIS/src/commands/index.mjs`
- Modify: `c:/LOPES/www/connect-ecommerce/app/api/catalog/products/route.ts`
- Modify: `c:/LOPES/www/connect-ecommerce/app/api/catalog/categories/route.ts`
- Modify: `c:/LOPES/www/connect-ecommerce/app/api/catalog/brands/route.ts`
- Modify: `c:/LOPES/www/connect-ecommerce/app/api/catalog/health/route.ts`
- Modify: `c:/LOPES/www/connect-ecommerce/app/api/ecommerce/home/route.ts`
- Modify: `c:/LOPES/www/connect-ecommerce/app/api/catalog/produtos/by-slug/[slug]/route.ts`
- Modify: `c:/LOPES/www/connect-ecommerce/app/api/catalog/produtos/categorias/by-slug/[...slug]/route.ts`
- Modify: `c:/LOPES/www/connect-ecommerce/app/api/lopes/produtos/**/route.ts` (aplicar headers)

---

### Task 1: Doc de referência

**Files:**
- Create: `.trae/documents/ref-origem-dados-catalogo-lopes-redis.md`

- [ ] **Step 1: Escrever doc com estado atual, contratos, operação e checklist**

---

### Task 2: Headers de diagnóstico padronizados

**Files:**
- Create: `lib/integration/catalogHeaders.ts`
- Modify: `app/api/**/route.ts` (catálogo + lopes)

- [ ] **Step 1: Criar helper de headers**
- [ ] **Step 2: Aplicar headers em endpoints Redis (read model)**
- [ ] **Step 3: Aplicar headers em endpoints Lopes (origin)**

---

### Task 3: Índice `idx:catalog:category` + listagem sem SCAN

**Files:**
- Modify: `lib/integration/catalogAdminService.ts`
- Modify: `lib/integration/catalogService.ts`
- Modify: `REDIS/src/commands/index.mjs`

- [ ] **Step 1: Garantir índice de categoria no Next (`ensureCatalogIndex`)**
- [ ] **Step 2: Atualizar CLI `REDIS index` para criar/garantir índice de categoria**
- [ ] **Step 3: Trocar `listCatalogCategories()` para usar `FT.SEARCH idx:catalog:category`**

---

### Task 4: Remover SCAN por slug (produto + categoria)

**Files:**
- Modify: `app/api/catalog/produtos/by-slug/[slug]/route.ts`
- Modify: `app/api/catalog/produtos/categorias/by-slug/[...slug]/route.ts`
- (Possível) Modify: `lib/integration/catalogService.ts` (helper de lookup por slug)

- [ ] **Step 1: Produto por slug via `FT.SEARCH idx:catalog:product @slug:{...}`**
- [ ] **Step 2: Categoria por slug sem SCAN (depende da Task 3)**

---

### Task 5: Verificação

- [ ] **Step 1: Rodar lint**

Run:
```bash
npm run lint
```
Expected: sem errors.

- [ ] **Step 2: Rodar build**

Run:
```bash
npm run build
```
Expected: build completo sem falhas.

