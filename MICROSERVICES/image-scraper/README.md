# image-scraper (modo JSON local)

Coleta imagens de produtos e atualiza JSON local, sem usar MOCK-END e sem tenant.

## MCP (opcional)

Este microservice também está exposto como tool MCP (stdio) via:
- `MICROSERVICES/image-scraper-mcp-server` (tool: `image_scraper_term_download`)

## Estrutura esperada

- `data/input/produtos.json` (entrada)
- `data/output/produtos.json` (saída enriquecida)
- `data/output/image-meta.json` (metadados)
- `data/output/not-found.json` (fila de não encontrados)
- `data/assets/images/produtos/` (arquivos de imagem)
- `data/assets/images/semImagem.png` (placeholder local)

## Como rodar

1. Copie o catálogo para `data/input/produtos.json`.
2. Ajuste `.env` com base em `.env.example` se necessário.
3. Execute:

```bash
npm install
npm start
```

Execução com limpeza automática:

```bash
npm run fresh
```

Comportamento:
- `npm run fresh` = limpa e processa 100% (`--no-safe`)
- `npm run fresh -- --safe` = limpa e processa amostra (10%)

## Flags úteis

- `--term <texto>` (MVP: termo → URL → download; salva em `data/assets/images/terms/`)
- `--count <n>` (no modo `--term`: quantas imagens baixar; default 3)
- `--profile <logo|generic>` (no modo `--term`: perfil de busca; default `logo`)
- `--target-type produto|categoria|marca|banner`
- `--input <path>`
- `--output <path>`
- `--meta <path>`
- `--assets-dir <path>`
- `--assets-base-url <path>`
- `--retry-not-found` (processa somente itens de `not-found.json`)
- `--safe` (10%) e `--no-safe` (100%)

Exemplo (modo termo):

```bash
npm start -- --term brahma --count 3
```

## Qualidade da imagem (1 produto)

Para reduzir imagens com múltiplos produtos (pack/kit) e priorizar foto de ecommerce:
- busca reforçada com termos de "produto unitário" e "fundo branco"
- filtro de palavras de pack/kit/caixa/combo
- filtro de proporção (`MIN_IMAGE_ASPECT_RATIO` e `MAX_IMAGE_ASPECT_RATIO`)
- opção de exigir indício de fundo branco no resultado (`REQUIRE_WHITE_BG_HINT=1`)
- filtro visual real com `sharp` (fundo claro predominante + limite de objetos)

### Recuperação de não encontrados

- Cada execução grava `data/output/not-found.json` com os produtos sem imagem válida.
- Para tentar novamente só nesses produtos:

```bash
npm start -- --retry-not-found --no-safe
```

- No modo `--retry-not-found`, o código aplica fallback automático:
  - tenta perfil estrito primeiro
  - se falhar, tenta perfil relaxado (configurável por `RELAXED_*`)
- Coleta de candidatos em arquitetura de providers (`candidateProviders[]`) com ranking por fonte.
- Ajuste fino de volume:
  - `CANDIDATE_POOL_SIZE` (pool coletado)
  - `CANDIDATE_EVAL_LIMIT` (quantos candidatos realmente validar/baixar)

### Perfis por tipo de alvo

- `produto`: mantém foco em item unitário (filtro pack mais rígido)
- `categoria`: não exige fundo branco e aceita proporções mais amplas
- `marca`: prioriza logo/logomarca (campo de destino `logo`)
- `banner`: aceita formatos horizontais e múltiplos elementos

### Placeholder (not-found)

Quando não encontra imagem válida, o scraper pode preencher automaticamente o campo (`image`/`logo`) com um placeholder.

Config:
- `PLACEHOLDER_ON_NOT_FOUND=1`
- `PLACEHOLDER_IMAGE_URL=/assets/images/semImagem.png`
