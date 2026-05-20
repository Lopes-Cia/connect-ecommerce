# Plano de Verificação — url-scraper

> Objetivo: Comparar o `NOTAS.md` com o código real do projeto e identificar discrepâncias.

---

## 1. Visão Geral dos Arquivos Principais

| Arquivo | Responsabilidade |
|---------|-------------------|
| `src/index.js` | CLI e roteamento de comandos |
| `src/interpreters/marcas-de-mercado.js` | Estágios 1-3 de marcas |
| `src/interpreters/produtos-de-mercado.js` | (mantido para compatibilidade, não usado) |
| `src/controller/fila.js` | Estágio 1 da fila |
| `scripts/clean.js` | Limpeza de dados gerados |

---

## 2. Verificação dos Comandos CLI

| Comando no NOTAS.md | Implementado em index.js? | Status |
|----------------------|----------------------------|--------|
| `marcas` | ✅ Linha 9 | OK |
| `marcas-2` | ✅ Linha 36 | OK |
| `marcas-3` | ✅ Linha 62 | OK |
| `fila-1` | ✅ Linha 91 | OK |

---

## 3. Verificação de Nomes de Diretórios

| Local | NOTAS.md | Código Real | Status |
|-------|-----------|--------------|--------|
| Produtos | `produtos-mercado` | `produtos-mercado` | OK |

---

## 4. Verificação dos Estágios (Fluxo Único)

### 4.1 Estágios de Marcas

| Passo | NOTAS.md | Código | Status |
|-------|-----------|--------|--------|
| 1 (marcas) | Gerar `marcas.json` | ✅ `buildMarcasJson()` | OK |
| 2 (marcas-2) | Criar pastas das marcas | ✅ `processMarcasStage2()` | OK |
| 3 (marcas-3) | Salvar config.json + logo, gerar fila.json | ✅ `processMarcasStage3()` | OK |

### 4.2 Estágio da Fila

| Passo | NOTAS.md | Código | Status |
|-------|-----------|--------|--------|
| 1 (fila-1) | Processar fila.json, detectar tipo de página | ✅ `processFila()` | OK |

---

## 5. Problemas Identificados e Resolvidos

| Problema | Descrição | Status |
|----------|-----------|--------|
| Duplicidade de diretórios | `Produtos de Mercado` vs `produtos-mercado` | ✅ Resolvido |
| Script de limpeza | Não existia | ✅ Criado (`npm run clean`) |
| Dois fluxos diferentes | Fila vs Produtos | ✅ Resolvido (mantido apenas Fila) |

---

## 6. Fluxo Recomendado de Uso

1. **Limpar dados antigos** (se houver):
   ```bash
   npm run clean
   ```

2. **Estágio 1 - Extrair marcas**:
   ```bash
   node src/index.js marcas
   ```

3. **Estágio 2 - Criar pastas das marcas**:
   ```bash
   node src/index.js marcas-2
   ```

4. **Estágio 3 - Salvar arquivos das marcas e gerar fila**:
   ```bash
   node src/index.js marcas-3
   ```

5. **Estágio 4 - Processar a fila**:
   ```bash
   node src/index.js fila-1
   ```

---

## 7. Próximos Passos (Opcionais)

- [ ] Implementar extração de embalagens no `processFila()`
- [ ] Remover o arquivo `produtos-de-mercado.js` (se não for mais necessário)
