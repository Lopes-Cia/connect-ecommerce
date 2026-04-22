# liz_refator/integration

Esta pasta é a camada nova para centralizar as chamadas **Back → Back** (Next Route Handlers → serviços externos).

## Objetivo

- Isolar a refatoração das requisições server-side sem espalhar mudanças pelo projeto.
- Preservar invariantes do legado no piloto (retry de rede, parse, `HttpError`).
- Criar pontos claros de substituição do legado.

## Arquivos principais

- [client.ts](file:///c:/LOPES/www/connect-ecommerce/liz_refator/integration/client.ts)
  - `integrationGetJson`: GET sem autenticação
  - `integrationGetJsonAuth`: GET com `Authorization` (tokenService)
- [produtos.ts](file:///c:/LOPES/www/connect-ecommerce/liz_refator/integration/produtos.ts)
  - Funções do domínio “produtos” usadas pelos handlers `/api/produtos/*`












## Usuários

Vamos renomear “Clientes” para “Usuários”, para evitar confusão.

Usuários têm função de login e não devem ser confundidos com o auth/token do backend (tokenService).

Swagger: `https://gp.lopesecia.com.br:9002/ApiLopes/v3/api-docs`

Login em 2 passos:

- `/webservice/api/enviarToken` (POST) — envia uma chave de acesso ao usuário (query: `email`/`whatsapp`)
- `/webservice/api/verificarTokenSistema` (POST) — valida a chave informada (query: `token`, `idIntegradora` opcional)

RAW (dev):

- `/api/dev/liz-refator/raw/usuarios/enviar-token`
- `/api/dev/liz-refator/raw/usuarios/verificar-token`
