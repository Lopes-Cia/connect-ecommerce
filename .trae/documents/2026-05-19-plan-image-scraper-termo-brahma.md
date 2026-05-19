# Plano — Análise do image-scraper + modo “termo (brahma)”

## Resumo

Objetivo: entender com precisão o que o `MICROSERVICES/image-scraper` faz hoje (batch, defaults e “pré-definições”) e preparar uma adaptação minimalista para rodar um teste por termo (`brahma`) sem depender de `data/input/produtos.json`.

Resultado esperado do MVP: rodar o scraper para um único termo e:

- baixar 0/1 imagem para `MICROSERVICES/image-scraper/data/assets/images/produtos/**`
- gravar `data/output/*.json` (como o fluxo atual faz)
- imprimir um resumo no stdout (path salvo + sourceUrl quando existir)

## Estado atual (análise)

### Natureza do tool: batch (lote)

- O tool é um CLI Node (ESM) executado via `node src/index.js` ([index.js](file:///c:/LOPES/www/connect-ecommerce/MICROSERVICES/image-scraper/src/index.js)).
- Ele processa um catálogo em lote a partir de um JSON local:
  - entrada: `data/input/produtos.json`
  - saída: `data/output/produtos.json` + `data/output/image-meta.json` + `data/output/not-found.json`
  - assets: `data/assets/images/**`
  - descrito em [README.md](file:///c:/LOPES/www/connect-ecommerce/MICROSERVICES/image-scraper/README.md)
- O batch “seleciona alvos” filtrando produtos sem imagem (ou com placeholder / fontes ruins) e então processa em paralelo com `PlaywrightCrawler` (Crawlee) ([scraper.js](file:///c:/LOPES/www/connect-ecommerce/MICROSERVICES/image-scraper/src/scraper.js)).

### Pré-definições / defaults existentes

- Defaults via `.env.example` ([.env.example](file:///c:/LOPES/www/connect-ecommerce/MICROSERVICES/image-scraper/.env.example)):
  - `TARGET_TYPE=produto`
  - paths padrão de input/output/meta/not-found/assets
  - `MAX_CONCURRENCY`, limites de bytes, aspect ratio, filtros visuais
  - placeholder on not-found
- Defaults via CLI ([index.js](file:///c:/LOPES/www/connect-ecommerce/MICROSERVICES/image-scraper/src/index.js)):
  - `--safe` vem habilitado por padrão (amostra ~10% do backlog)
  - `--no-safe` processa 100%
  - `--retry-not-found` reprova itens da fila e usa fallback (perfil “relaxed”) se habilitado por env
- O `JsonFileClient` resolve paths por `process.cwd()` e exige que o arquivo `inputFile` exista e seja um array ([mockend-client.js](file:///c:/LOPES/www/connect-ecommerce/MICROSERVICES/image-scraper/src/mockend-client.js)).

### Como a busca funciona (alto nível)

- Para cada item, monta queries (produto/categoria/marca/banner) e coleta candidatos de DuckDuckGo por:
  - API (`/i.js` com `vqd`)
  - scraping da página
- Aplica dedupe + score por fonte, bloqueio de “pack/kit/combo”, validação de bytes/dimensões/aspect ratio e (opcional) filtro visual via `sharp` ([visual-filter.js](file:///c:/LOPES/www/connect-ecommerce/MICROSERVICES/image-scraper/src/visual-filter.js)).

## Mudança proposta (MVP): “modo termo” sem input JSON

### Decisão (dada pelo usuário)

- Rodar o teste para o termo `brahma` sem entrar nos fluxos por `target-type` e sem depender de setup batch.

Interpretação MVP: criar um modo de execução “single item” que reaproveita o pipeline existente, mas injeta um catálogo de 1 item (produto) em memória.

### Design minimalista

- Adicionar flag no CLI:
  - `--term <texto>` (ex.: `--term brahma`)
- Quando `--term` existir:
  - Forçar `targetType = "produto"` (evita variações de `categoria/marca/banner`)
  - Ignorar a necessidade de `data/input/produtos.json`
  - Gerar um item “fake” com shape mínimo esperado pelo scraper:
    - `id` (string ou number), `slug`, `name` (ou `title`), `brand/marca` (opcional), e `image` vazio
  - Continuar gravando output/meta/not-found/asset do mesmo jeito do batch (para não criar um caminho novo de persistência)
  - Imprimir um resumo no final (path do asset salvo e a sourceUrl, se houver)

### Alterações por arquivo (proposto)

1) `MICROSERVICES/image-scraper/src/index.js`
- Adicionar opção `--term <texto>` no Commander.
- Quando `--term` for informado:
  - montar `catalogOverride` com 1 item (produto) usando `term` como nome e `slug` simples:
    - `slug = term.trim().toLowerCase().replace(/\s+/g, "-")`
  - capturar eventos via `emit` (já existente) para montar “resumo”:
    - usar `produto.asset_uploaded` (path) e `produto.updated` (campo gravado)
- Imprimir resumo no final mesmo em caso “not-found”.

2) `MICROSERVICES/image-scraper/src/mockend-client.js`
- Estender `JsonFileClient` para aceitar opcionalmente `catalogOverride`:
  - se `catalogOverride` existir, `getCatalog("produtos")` retorna esse array e não exige `inputFile`.
- Manter comportamento atual quando `catalogOverride` não existir (compat legado).

3) (Opcional, se precisar) `MICROSERVICES/image-scraper/README.md`
- Documentar o novo modo:
  - exemplo de execução com `--term brahma`

## Critérios de aceite

- Rodar `node src/index.js --term brahma --no-safe` (com `cwd` no microservice) não exige `data/input/produtos.json`.
- Se encontrar imagem válida:
  - grava asset em `data/assets/images/produtos/<slug>-<hash>.<ext>`
  - atualiza `data/output/produtos.json` com `image=/assets/images/produtos/...`
  - grava `data/output/image-meta.json` com `sourceUrl`
  - imprime resumo no stdout (inclui `relativePath` e `sourceUrl`)
- Se não encontrar:
  - grava/atualiza `data/output/not-found.json`
  - (mantém comportamento atual do placeholder, se habilitado por env)
  - imprime resumo indicando not-found

## Verificação (após aprovação do plano)

- Validar apenas sintaxe/lint do Connect (conforme regra do workspace).
- Execução manual do microservice (fora do `npm run dev` do Connect), para confirmar o modo `--term brahma` funciona e grava os arquivos esperados.

## Fora de escopo (por enquanto)

- Integração com Connect/FloatingAiChat (rota, runner, copy para `public/`).
- Escolha “oficial” da fonte do catálogo (Redis/Lopes) e import de volta para Redis.

