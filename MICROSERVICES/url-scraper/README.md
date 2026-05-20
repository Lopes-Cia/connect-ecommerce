# url-scraper

## Objetivo

Fazer o download de todo material gráfico disponível publicamente em:

- https://www.catalogoambev.com.br/site

## Próximos passos (skills)

Antes de implementar, procurar e instalar skills especializadas no ambiente do projeto.

Sugestão de comandos:

```bash
npx skills find scraper
npx skills find web scraping
npx skills find playwright
```

Depois, instalar as skills escolhidas (sem `-g` para ficar no projeto):

```bash
npx skills add <owner/repo@skill>
```

## Como rodar (MVP)

```bash
cd MICROSERVICES/url-scraper
npm install
```

### 1) Gerar `home.json` (lista de marcas)

```bash
npm start -- build-home-json --url "https://www.catalogoambev.com.br/site" --out "data/output/home.json"
```

### 2) Enriquecer o `home.json` (teste com um item)

```bash
npm start -- enrich-home-json --home "data/output/home.json" --index 2
```
