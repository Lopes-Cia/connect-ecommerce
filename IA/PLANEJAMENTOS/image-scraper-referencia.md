# Referência técnica — MICROSERVICES/image-scraper

## Contexto

Este documento descreve o microserviço `image-scraper` que foi copiado para dentro do Connect em:

- `MICROSERVICES/image-scraper`

Objetivo do uso no Connect: ser executado sob demanda (server-side) e gerar/capturar imagens (e metadados) para enriquecer catálogo, com saída de assets servíveis pelo site.

## Como rodar (atual)

- Projeto Node em modo ESM (`"type": "module"`).
- Entrada/saída padrão (modo JSON local):
  - `data/input/produtos.json` (entrada)
  - `data/output/produtos.json` (saída)
  - `data/output/image-meta.json` (metadados)
  - `data/output/not-found.json` (fila de não encontrados)
  - `data/assets/images/**` (arquivos baixados)

CLI:
- `node src/index.js` (equivale ao `npm start`)

Flags principais:
- `--target-type produto|categoria|marca|banner`
- `--safe` (default) / `--no-safe`
- `--retry-not-found`
- `--input`, `--output`, `--meta`, `--not-found`, `--assets-dir`, `--assets-base-url`
- `--sse-hub` (opcional)

Arquivos de entrada/saída e assets são resolvidos via `process.cwd()`; ou seja, o diretório de execução importa.

## Estrutura (visão geral)

**Entrypoint (CLI)**
- [index.js](file:///c:/LOPES/www/connect-ecommerce/MICROSERVICES/image-scraper/src/index.js)
  - Faz parse de CLI args, monta `JsonFileClient`, cria `ImageScraper` e executa `scraper.run()`.
  - Emite eventos em um hub SSE (se configurado) via `SseHubPublisher`.

**Cliente de dados (modo JSON local)**
- [JsonFileClient](file:///c:/LOPES/www/connect-ecommerce/MICROSERVICES/image-scraper/src/mockend-client.js)
  - Lê catálogo de `produtos` a partir do arquivo `inputFile`.
  - Persiste:
    - JSON de produtos enriquecidos (`outputFile`)
    - metadados (`metaFile`)
    - fila de não encontrados (`notFoundFile`)
    - assets em disco (`assetsDir`) e retorna URL no formato `assetsBaseUrl/<path>`

**Scraper (pipeline principal)**
- [ImageScraper](file:///c:/LOPES/www/connect-ecommerce/MICROSERVICES/image-scraper/src/scraper.js)
  - Carrega `produtos` + `meta` e decide quais itens precisam de imagem.
  - Modo `--safe` amostra ~10% do backlog.
  - Modo `--retry-not-found` processa somente ids de `not-found.json` (por `targetType`).
  - Usa `PlaywrightCrawler` (Crawlee) para paralelizar processamento.
  - Providers de candidatos (DuckDuckGo):
    - API (`/i.js` com `vqd`)
    - scraping da página de imagens
  - Faz scoring e dedupe de candidatos e aplica validações:
    - bloqueio por “pack/kit/combo” quando `targetType=produto`
    - validação de bytes mínimos e dimensões mínimas
    - validação por proporção (aspect ratio)
    - filtro visual com `sharp` (fundo claro predominante + limite de objetos)
  - Se aceito: baixa a imagem, salva em `data/assets/images/<assetFolder>/<slug>-<hash>.<ext>`,
    atualiza o campo (`image`/`logo`) no item e persiste JSON/meta.
  - Se falhar: registra no `not-found.json` e, se habilitado, seta placeholder no item.

**Filtro visual**
- [analyzeProductImage](file:///c:/LOPES/www/connect-ecommerce/MICROSERVICES/image-scraper/src/visual-filter.js)
  - Usa `sharp` para:
    - normalizar/decodificar
    - redimensionar para análise
    - estimar razão de fundo branco
    - estimar “objectCoverage”
    - contar componentes conectados (reduz packs/coleções)

**Publicador SSE (opcional)**
- [SseHubPublisher](file:///c:/LOPES/www/connect-ecommerce/MICROSERVICES/image-scraper/src/sse-publisher.js)
  - Se `--sse-hub` estiver setado, faz POST para `<baseUrl>/publish` com eventos do run.

## Target types e campos afetados

Em [getTargetProfile](file:///c:/LOPES/www/connect-ecommerce/MICROSERVICES/image-scraper/src/scraper.js) o scraper define:

- `produto`
  - campo: `image`
  - pasta: `produtos`
  - bloqueio de pack: ligado
- `categoria`
  - campo: `image`
  - pasta: `categorias`
  - bloqueio de pack: desligado
- `marca`
  - campo: `logo`
  - pasta: `marcas`
  - bloqueio de pack: desligado
- `banner`
  - campo: `image`
  - pasta: `banners`
  - bloqueio de pack: desligado

Observação: na cópia limpa, só garantimos `.gitkeep` em `produtos/` e `categorias/`; ao rodar para `marca`/`banner`, o código deve criar as pastas dinamicamente via `uploadAsset()`.

## Variáveis de ambiente relevantes (observadas no código)

Em [scraper.js](file:///c:/LOPES/www/connect-ecommerce/MICROSERVICES/image-scraper/src/scraper.js) o comportamento é ajustável por env, incluindo:

- Concorrência e limites:
  - `MAX_CONCURRENCY`
  - `CANDIDATE_POOL_SIZE`
  - `CANDIDATE_EVAL_LIMIT`
  - `MIN_IMAGE_BYTES`
- Perfil “strict”:
  - `MIN_IMAGE_ASPECT_RATIO`, `MAX_IMAGE_ASPECT_RATIO`
  - `REQUIRE_WHITE_BG_HINT`
  - `USE_VISUAL_FILTER`
  - `VISUAL_MIN_WHITE_RATIO`, `VISUAL_WHITE_THRESHOLD`
  - `VISUAL_MAX_OBJECT_COVERAGE`, `VISUAL_MIN_OBJECT_COVERAGE`
  - `VISUAL_MAX_COMPONENTS`
- Perfil “relaxed” (fallback em retry):
  - `ENABLE_RELAXED_RETRY_PROFILE`
  - `RELAXED_MIN_IMAGE_ASPECT_RATIO`, `RELAXED_MAX_IMAGE_ASPECT_RATIO`
  - `RELAXED_REQUIRE_WHITE_BG_HINT`
  - `RELAXED_USE_VISUAL_FILTER`
  - `RELAXED_VISUAL_MIN_WHITE_RATIO`, `RELAXED_VISUAL_WHITE_THRESHOLD`
  - `RELAXED_VISUAL_MAX_OBJECT_COVERAGE`, `RELAXED_VISUAL_MIN_OBJECT_COVERAGE`
  - `RELAXED_VISUAL_MAX_COMPONENTS`
- Placeholder:
  - `PLACEHOLDER_ON_NOT_FOUND`
  - `PLACEHOLDER_IMAGE_URL` (default `/assets/images/semImagem.png`)

## Pontos de integração com o Connect (MVP)

O que normalmente precisa ser ajustado/decidido antes de “plugar” no Connect:

- **Diretório de execução (cwd)**: como `JsonFileClient` resolve paths por `process.cwd()`, o runner no Connect deve executar com `cwd = MICROSERVICES/image-scraper`.
- **Input/Output do catálogo**: definir de onde vem `data/input/produtos.json` (export do Connect/Redis?) e onde queremos gravar `data/output/*.json`.
- **Assets servíveis no site**: a estratégia acordada é copiar o conteúdo de `data/assets/images/**` para `public/assets/images/**` do Connect.
- **Base URL**: garantir `--assets-base-url=/assets/images` para que o campo gravado no JSON aponte para o static do site.

## Riscos / cuidados

- Dependências pesadas (Playwright/Crawlee/Sharp) e downloads de browser do Playwright.
- Execução em ambiente server-side deve ter:
  - permissões de escrita em disco
  - timeout/lock para evitar rodar múltiplas vezes em paralelo
  - controle de habilitação (ex.: env flag) para não expor isso sem querer

## Próximas decisões (antes de modificar código)

- O Connect vai gerar `produtos.json` de entrada automaticamente? (ex.: export do Redis)
- Vamos manter o formato de produto do scraper igual ao catálogo do Connect, ou criar um “mapper”?
- Para `marca` e `categoria`, quais campos/shape são esperados no Connect (id, slug, nome, etc.)?

