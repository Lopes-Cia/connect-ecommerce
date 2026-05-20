# IA-First — Análise do image-scraper (fluxo real + acoplamentos)

Objetivo desta doc: descrever, com base no código, como o `image-scraper` funciona hoje e quais partes estão acopladas a coisas que não servem/não são compatíveis com a adaptação que queremos (buscar imagem por termo, ex.: “brahma”).

Escopo: somente análise do código existente e do fluxo de execução. Sem “adivinhar” comportamento fora do que está implementado.

## Visão geral (o que é)

- Projeto Node em ESM (`"type": "module"`) com execução via CLI.
- O modo principal atual é **batch em cima de JSON local**: lê `data/input/produtos.json`, decide quais itens precisam de imagem e processa em lote.
- Pipeline usa:
  - Crawlee (`PlaywrightCrawler`) para orquestrar concorrência
  - Playwright para navegação/extração quando usa provider de página
  - `fetch()` para baixar imagens e consultar DuckDuckGo
  - `image-size` para validação de dimensões
  - `sharp` para filtro visual (fundo branco e quantidade de objetos)

Fonte: [package.json](file:///c:/LOPES/www/connect-ecommerce/MICROSERVICES/image-scraper/package.json)

## Entrypoints e scripts

- `npm start` → `node src/index.js` ([index.js](file:///c:/LOPES/www/connect-ecommerce/MICROSERVICES/image-scraper/src/index.js))
- `npm run fresh` → limpa output/assets e roda em 100% (`--no-safe`) ([package.json](file:///c:/LOPES/www/connect-ecommerce/MICROSERVICES/image-scraper/package.json), [clean-assets.mjs](file:///c:/LOPES/www/connect-ecommerce/MICROSERVICES/image-scraper/scripts/clean-assets.mjs))

## Fluxo real (callgraph)

### 1) CLI → configurações → execução

Arquivo: [index.js](file:///c:/LOPES/www/connect-ecommerce/MICROSERVICES/image-scraper/src/index.js)

1. Carrega env: `import "dotenv/config"`
2. Lê flags de CLI (Commander):
   - `--target-type`, `--safe/--no-safe`, `--retry-not-found`
   - paths: `--input`, `--output`, `--meta`, `--not-found`, `--assets-dir`, `--assets-base-url`
3. Instancia:
   - `JsonFileClient` (I/O em disco) ([mockend-client.js](file:///c:/LOPES/www/connect-ecommerce/MICROSERVICES/image-scraper/src/mockend-client.js))
   - `SseHubPublisher` (opcional; depende de `SSE_HUB_URL`) ([sse-publisher.js](file:///c:/LOPES/www/connect-ecommerce/MICROSERVICES/image-scraper/src/sse-publisher.js))
   - `ImageScraper` (pipeline) ([scraper.js](file:///c:/LOPES/www/connect-ecommerce/MICROSERVICES/image-scraper/src/scraper.js))
4. Executa `await scraper.run()`

Observação relevante: o CLI faz `console.log(options)` no início (output ruidoso, mas é o comportamento atual).

### 2) ImageScraper.run() (pipeline principal)

Arquivo: [scraper.js](file:///c:/LOPES/www/connect-ecommerce/MICROSERVICES/image-scraper/src/scraper.js)

Sequência (resumo fiel ao código):

1. Carrega dados locais:
   - `produtos = await client.getCatalog("produtos")`
   - `metaData = await client.getMeta()`
2. Define `imageField` com base no `targetType` via `getTargetProfile()`:
   - `produto` → campo `image` / pasta `produtos`
   - `marca` → campo `logo` / pasta `marcas`
   - `categoria` → campo `image` / pasta `categorias`
   - `banner` → campo `image` / pasta `banners`
3. Filtra `targetProdutos` (quem vai ser processado):
   - seleciona quem está sem imagem OU com placeholder OU com “fonte ruim” em `meta` OU imagem `.gif`
4. Se `retryNotFound`:
   - lê `not-found.json` e restringe a execução aos ids que estão na fila
5. Se `safeMode`:
   - amostra ~10% do backlog (`slice(0, sampleSize)`)
6. Se não há itens para processar:
   - emite `run.noop` e retorna
7. Define perfis de validação:
   - `strictProfile` (aspect ratio, white bg, filtro visual, etc.)
   - `relaxedProfile` (varia via `RELAXED_*`)
   - `candidateProfiles` = `[strict]` ou `[strict, relaxed]` apenas em `retryNotFound` com `ENABLE_RELAXED_RETRY_PROFILE`
8. Cria `PlaywrightCrawler` e alimenta com `requests` geradas a partir de `targetProdutos`
9. Roda `await crawler.run()`
10. Persiste:
   - `updateNotFound(notFoundRows)`
   - se `changes > 0`: `updateJson(produtos)` + `updateMeta(meta)`
   - emite eventos de `run.*`

### 3) RequestHandler (processamento por item)

Arquivo: [scraper.js](file:///c:/LOPES/www/connect-ecommerce/MICROSERVICES/image-scraper/src/scraper.js)

Para cada item (dentro do `requestHandler`):

1. Monta queries de busca:
   - função `buildSearchQueries(baseQuery, retryNotFound, targetType)`
2. Coleta candidatos em DuckDuckGo usando 2 providers:
   - `providerDuckDuckGoApi({ query, ua })`:
     - faz `fetch` na página inicial para extrair `vqd`
     - chama o endpoint `duckduckgo.com/i.js?...` e retorna `results[]`
   - `providerDuckDuckGoPage({ query, page })`:
     - navega com Playwright para a página de imagens
     - extrai `src/currentSrc/data-src` de `img` e filtra URLs
3. Dedupe + ranking:
   - `mergeCandidates(current, incoming, maxPoolSize)` mantém melhor score por URL
   - `scoreCandidateSource({ url, hint, provider })` pondera:
     - hints de fundo branco
     - origem “confiável” vs “baixa qualidade”
     - bloqueio de “pack/kit/combo” (quando `targetProfile.shouldBlockPack`)
4. Validação de cada candidato (até `CANDIDATE_EVAL_LIMIT`):
   - baixa com `fetch(candUrl)`
   - valida `content-type` (tem que ser `image/*` e não `gif/icon`)
   - valida tamanho mínimo (`MIN_IMAGE_BYTES`)
   - valida dimensões com `image-size` (>= 300x300)
   - valida aspect ratio (`MIN_IMAGE_ASPECT_RATIO` / `MAX_IMAGE_ASPECT_RATIO`)
   - valida perfil (strict/relaxed) via `passesProfileCheck()`, que pode chamar:
     - `analyzeProductImage()` (sharp) quando `USE_VISUAL_FILTER=1`
5. Se aprovou:
   - decide extensão por `content-type`
   - salva em disco via `client.uploadAsset(fileName, buffer)`
   - atualiza:
     - `metaData[...]` com `sourceUrl`, `hash`, etc.
     - `updatedProdutos[...]` no campo `image`/`logo`
   - emite eventos `produto.image_found`, `produto.asset_uploaded`, `produto.updated`
6. Se não aprovou nenhum:
   - registra em `notFoundRows`
   - opcionalmente seta placeholder (`PLACEHOLDER_ON_NOT_FOUND=1`)
   - emite `produto.not_found`

## I/O e persistência (o que escreve / onde)

Arquivo: [mockend-client.js](file:///c:/LOPES/www/connect-ecommerce/MICROSERVICES/image-scraper/src/mockend-client.js)

- Tudo resolve por `process.cwd()`:
  - ao executar, o diretório atual precisa ser o root do microservice (ou paths precisam ser absolutos).
- Leitura:
  - `inputFile` obrigatório no modo batch (sem override).
  - JSON precisa ser array.
- Escrita:
  - `outputFile` (produtos enriquecidos)
  - `metaFile` (map de metadados)
  - `notFoundFile` (fila)
  - assets em `assetsDir` com subpasta e arquivo (cria diretórios recursivamente)

## Variáveis de ambiente (lista observada no código)

Arquivo: [.env.example](file:///c:/LOPES/www/connect-ecommerce/MICROSERVICES/image-scraper/.env.example)

### Paths e modo

- `TARGET_TYPE`
- `INPUT_JSON`, `OUTPUT_JSON`, `META_JSON`, `NOT_FOUND_JSON`
- `ASSETS_DIR`, `ASSETS_BASE_URL`
- `SSE_HUB_URL`
- `MODE` (observação: existe no `.env.example`, mas o código usa `--safe/--no-safe` e `options.safe`; não há leitura direta de `process.env.MODE` no `index.js`/`scraper.js`.)

### Concorrência e limites

- `MAX_CONCURRENCY`
- `CANDIDATE_POOL_SIZE`
- `CANDIDATE_EVAL_LIMIT`
- `MIN_IMAGE_BYTES`

### Perfil strict

- `MIN_IMAGE_ASPECT_RATIO`, `MAX_IMAGE_ASPECT_RATIO`
- `REQUIRE_WHITE_BG_HINT`
- `USE_VISUAL_FILTER`
- `VISUAL_MIN_WHITE_RATIO`, `VISUAL_WHITE_THRESHOLD`
- `VISUAL_MIN_OBJECT_COVERAGE`, `VISUAL_MAX_OBJECT_COVERAGE`
- `VISUAL_MAX_COMPONENTS`

### Perfil relaxed (fallback no retry)

- `ENABLE_RELAXED_RETRY_PROFILE`
- `RELAXED_REQUIRE_WHITE_BG_HINT`
- `RELAXED_MIN_IMAGE_ASPECT_RATIO`, `RELAXED_MAX_IMAGE_ASPECT_RATIO`
- `RELAXED_USE_VISUAL_FILTER`
- `RELAXED_VISUAL_MIN_WHITE_RATIO`, `RELAXED_VISUAL_WHITE_THRESHOLD`
- `RELAXED_VISUAL_MIN_OBJECT_COVERAGE`, `RELAXED_VISUAL_MAX_OBJECT_COVERAGE`
- `RELAXED_VISUAL_MAX_COMPONENTS`

### Placeholder (quando not-found)

- `PLACEHOLDER_ON_NOT_FOUND`
- `PLACEHOLDER_IMAGE_URL`

## Glossário rápido (para decidir o que fica/sai)

- **Crawlee / PlaywrightCrawler**: “motor” que cria uma fila de tarefas e roda várias em paralelo (concorrência). Aqui ele é o orquestrador do processamento por item.
- **Playwright**: browser automatizado (Chromium). Neste projeto ele é usado no provider que “raspa” a página de imagens do DuckDuckGo.
- **sharp (filtro visual)**: biblioteca nativa para abrir/redimensionar imagem e calcular métricas (fundo branco, cobertura de objeto, número de objetos).
- **Persistência em disco (filesystem)**: entrada e saída são arquivos; o scraper lê/escreve JSON e também grava imagens em pastas. O diretório atual (`cwd`) influencia onde tudo é lido/escrito.
- **SSE Hub**: endpoint externo para receber eventos do run via HTTP (`POST /publish`). É opcional e só funciona quando `SSE_HUB_URL`/`--sse-hub` está configurado.

## Acoplamentos “pesados” (o que pode não servir/ser compatível)

Baseado no que o código realmente usa:

1. **Playwright + Crawlee**
   - O pipeline não é “só fetch”: ele roda um `PlaywrightCrawler`.
   - Mesmo que um provider use somente `fetch` (DDG API), o crawler e o Playwright estão no caminho principal.
2. **Filtro visual com sharp**
   - `passesProfileCheck()` pode chamar `analyzeProductImage()` que depende de `sharp` e faz processamento de imagem.
3. **Persistência em disco como fonte de verdade**
   - Entrada/saída e assets são gravados no filesystem e dependem do `cwd`.
4. **DuckDuckGo (endpoint e scraping)**
   - Um provider depende de extrair `vqd` do HTML, depois chamar `duckduckgo.com/i.js`.
   - O outro depende de scraping de página com Playwright.
5. **SSE hub (SSE_HUB_URL)**
   - Só é usado se existir `SSE_HUB_URL` (ou `--sse-hub`). Se estiver vazio, o código não publica nada (o publisher fica “desligado”).

## Partes “reutilizáveis” (a partir do código)

Sem propor redesign, só apontando unidades existentes no código:

- Construção de queries: `buildSearchQueries()`
- Scoring e dedupe:
  - `scoreCandidateSource()`
  - `mergeCandidates()`
- Validações:
  - `passesProfileCheck()`
  - validações de bytes/content-type/dimensões/aspect ratio
- Download + persistência:
  - `JsonFileClient.uploadAsset()`

## Para a adaptação “buscar imagem por termo (brahma)”

O que o código atual exige para “rodar” algo:

- Um “item” precisa existir (hoje vem do JSON em lote).
- O pipeline por item está dentro do `requestHandler` do `PlaywrightCrawler`.
- A busca em si é por `query` (texto) e já aceita qualquer termo; “brahma” entra como `query`.

Conseqüência prática: para rodar “somente um termo”, o projeto hoje depende de:

- montar um catálogo com pelo menos 1 item (shape mínimo com `id`, `slug`, `name/title`)
- passar esse item pelo pipeline do crawler (mesmo que use provider API)

---

Se você quiser, eu continuo a etapa 2 (refinamento): você me diz quais partes “não servem/não são compatíveis” para o Connect (ex.: Playwright, sharp, filesystem, SSE), e eu reescrevo esta doc com uma seção “o que remover” baseada nesses critérios (sem inventar comportamento).






### MEU OBJETIVO

Essa ferramenta tem q te rum contrato de MCP, presciso gerar a configuração dela por um agente de IA, dessa forma vamos conseguir as imagens que falta no nosso catalago. 