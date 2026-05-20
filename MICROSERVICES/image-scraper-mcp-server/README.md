# image-scraper-mcp-server

MCP server (stdio) para expor o microservice `MICROSERVICES/image-scraper` como tool MCP.

## Gating (segurança)

Para executar a tool, `IMAGE_SCRAPER_MCP_ENABLED` precisa estar setado para `"1"`.

## Setup

Pré-requisito: Node.js >= 18.

Instalar dependências do scraper legado:

- `cd ../image-scraper`
- `npm install`

Instalar dependências do MCP server:

- `cd ../image-scraper-mcp-server`
- `npm install`
- `npm run build`

## Rodar (stdio)

Windows PowerShell:

- `$env:IMAGE_SCRAPER_MCP_ENABLED="1"`
- `npm start`

Windows CMD:

- `set IMAGE_SCRAPER_MCP_ENABLED=1`
- `npm start`

Alternativa direta (sem script):

- `node dist/index.js`

## Configurar em um cliente MCP (stdio)

Snippet genérico (ajuste o formato conforme o seu cliente MCP):

```json
{
  "mcpServers": {
    "image-scraper": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "C:\\\\LOPES\\\\www\\\\connect-ecommerce\\\\MICROSERVICES\\\\image-scraper-mcp-server",
      "env": {
        "IMAGE_SCRAPER_MCP_ENABLED": "1"
      }
    }
  }
}
```

## Tool

- `image_scraper_term_download`

## Exemplo de chamada (inputs/outputs)

Input:

```json
{
  "name": "brahma",
  "queries": [
    "brahma lata 350ml fundo branco",
    "cerveja brahma lata isolada fundo branco"
  ],
  "count": 3,
  "quality": { "minBytes": 20000, "minWidth": 500, "minHeight": 500 },
  "outDir": "C:\\\\LOPES\\\\www\\\\connect-ecommerce\\\\MICROSERVICES\\\\image-scraper\\\\data\\\\assets\\\\images\\\\terms"
}
```

Notas:
- `outDir` (se informado) precisa ser absoluto. Se omitido, usa o default do microservice legado (`MICROSERVICES/image-scraper/data/assets/images/terms`).
- `queries` aceita de 1 a 10 strings.

Output (exemplo):

```json
{
  "ok": true,
  "name": "brahma",
  "countRequested": 3,
  "countSaved": 3,
  "queries": [
    "brahma lata 350ml fundo branco",
    "cerveja brahma lata isolada fundo branco"
  ],
  "providers": ["duckduckgo"],
  "items": [
    {
      "ok": true,
      "url": "https://example.com/img.jpg",
      "savedPath": "C:\\\\...\\\\terms\\\\brahma\\\\1.jpg",
      "bytes": 123456,
      "contentType": "image/jpeg",
      "width": 1200,
      "height": 1200,
      "status": 200
    }
  ]
}
```
