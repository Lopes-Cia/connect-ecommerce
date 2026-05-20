# url-scraper — Notas (instruções)

## Páginas-base

1. Home (lista de marcas): https://www.catalogoambev.com.br/site

## Interpretadores

- Marcas de Mercado: `src/interpreters/marcas-de-mercado.js`
- Embalagens de Mercado: `src/interpreters/embalagens-de-mercado.js`

## Fluxo de Trabalho (Único Fluxo)

### Passo 1 — extrair marcas (loop)
Objetivo: entrar na Home e extrair todas as marcas listadas.

Arquivo gerado: `data/output/marcas.json`

Chamada (CLI):
```bash
node src/index.js marcas
```

### Passo 2 — criar pastas das marcas (loop)
Objetivo: ler `data/output/marcas.json` e criar a pasta da marca para cada item.

Chamada (CLI):
```bash
node src/index.js marcas-2
```

### Passo 3 — criar arquivos das marcas e gerar fila (loop)
Objetivo: salvar `config.json` e baixar `logo.<ext>` dentro da pasta da marca. Também montar `data/output/fila.json` para rastrear processamento futuro.

Chamada (CLI):
```bash
node src/index.js marcas-3
```

### Passo 4 — processar a fila
Objetivo: ler `data/output/fila.json` e processar cada item.

Regras:
- Para cada item com `processado: 0`, abrir o `config.json` apontado em `path`, ler a chave `url` e detectar se é `produtos-mercado` ou `embalagens-mercado`
- **Se for `produtos-mercado`**:
  - Criar `produtos-mercado/` dentro da pasta da marca
  - Salvar `produtos-mercado/config.json`
  - Criar pastas/arquivos por produto (config + logo)
  - Marcar o item da fila como `processado: 1`
  - Adicionar novos itens no final da fila para cada produto
- **Se for `embalagens-mercado`**:
  - Criar `Embalagens/` dentro da pasta da marca/produto
  - Extrair dados do showcase (chaves dinâmicas como Produto, Marca, Categoria)
  - Extrair link de mídia (download)
  - Extrair embalagens (abrindo o modal de cada uma)
  - Baixar as imagens das embalagens
  - Salvar `Embalagens/config.json`
  - Marcar o item da fila como `processado: 1`

Chamada (CLI):
```bash
node src/index.js fila-1
```

## Fluxo Completo (Recomendado)

```bash
# 1. Limpar dados antigos (se houver)
npm run clean

# 2. Extrair marcas
node src/index.js marcas

# 3. Criar pastas das marcas
node src/index.js marcas-2

# 4. Salvar arquivos das marcas e gerar fila
node src/index.js marcas-3

# 5. Processar a fila
node src/index.js fila-1
```

## Detectar tipo da página

Regra: detectar pela existência do seletor na página.

- **Produtos de Mercado**:
  - Seletor: `body > div.os-padding > div > div > div.master > div > div.container.clearfix > div.min-height-container > div.content.content-fluid > div > section > div.listing > ul`
- **Embalagens de Mercado**:
  - Seletor: `body > div.os-padding > div > div > div.master > div > div.container.clearfix > div.min-height-container > div.content.content-fluid > div.packshelf-container.margin-top-20.margin-bottom-10 > section > div > div > div > ul`

Ordem: testar **Produtos de Mercado**; depois **Embalagens de Mercado**; senão marcar como `unknown`.
