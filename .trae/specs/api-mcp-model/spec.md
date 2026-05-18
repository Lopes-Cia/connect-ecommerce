# Spec

## Objetivo

Criar um modelo (copiável) que descreve uma API baseada em OpenAPI e fornece todas as informações mínimas para uma IA gerar um MCP Server funcional (Node/TypeScript ou Python), incluindo autenticação, base URL, mapeamento de endpoints → tools e contratos de erro.

## Contexto

Este repositório já possui um exemplo funcional de integração Back→Back (BFF Next Route Handlers → serviço externo) em [liz_refator](file:///c:/LOPES/www/connect-ecommerce/liz_refator).

Referências do exemplo:
- OpenAPI (Swagger) do serviço externo: [liz_refator/integration/README.md](file:///c:/LOPES/www/connect-ecommerce/liz_refator/integration/README.md#L36-L42)
- Padrão de request autenticado (Authorization com token bruto, sem Bearer): [client.ts](file:///c:/LOPES/www/connect-ecommerce/liz_refator/integration/client.ts#L59-L77) e [token.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/token.ts#L7-L10)
- Fluxo de obtenção/refresh do token (tokenService/refreshToken): [authWebserviceClient.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/authWebserviceClient.ts#L65-L173)
- Variáveis de ambiente relevantes (base URLs e ids): [config.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/config.ts#L58-L77)
- OpenAPI capturado (exemplos locais):
  - [api-docs.json](file:///c:/LOPES/www/connect-ecommerce/.trae/specs/apilopes-swagger/api-docs.json)
  - [api-docs-9004.json](file:///c:/LOPES/www/connect-ecommerce/.trae/specs/liz-refator-dev-raw-produtos/api-docs-9004.json)

## Premissas e restrições

- Público-alvo: outra IA (que vai gerar o MCP). Texto deve ser explícito, sem pressupor contexto.
- Segredos nunca entram no documento nem no código. Tudo que for token/chave deve ser referenciado como ENV (ex.: `API_TOKEN`).
- Se existir mais de uma forma de autenticação (ex.: header `Authorization` e header `token`), o modelo deve deixar claro quando cada uma se aplica.
- Se a API exige query params fixos (ex.: `idIntegradora`), isso deve ser listado como regra invariável de chamada.
- MCP deve preferir respostas estruturadas (JSON) para consumo por IA, e opcionalmente oferecer formato humano (markdown) quando fizer sentido.

## Decisões (com trade-offs)

- Implementação recomendada (padrão): Node/TypeScript, para alinhar com o stack do projeto (Next/TS) e com o guia [node_mcp_server.md](file:///c:/LOPES/www/connect-ecommerce/.trae/skills/mcp-builder/reference/node_mcp_server.md).
- Implementação alternativa: Python (FastMCP), seguindo [python_mcp_server.md](file:///c:/LOPES/www/connect-ecommerce/.trae/skills/mcp-builder/reference/python_mcp_server.md).
- Ferramentas (tools) não devem espelhar 100% dos endpoints automaticamente. Deve haver curadoria por domínio (tags/paths) para evitar explosão de surface area e reduzir risco operacional.

## Modelo (entrada canônica para gerar MCP)

Copie e preencha tudo abaixo. Este bloco é a “fonte única” que a IA deve usar para gerar o MCP.

### 1) Identidade do serviço

- service_id: `<id_curto_sem_espaco>` (ex.: `apilopes`)
- service_name: `<nome_legivel>` (ex.: `API Lopes`)
- owner_contact: `<time/canal>` (ex.: `#integracao-lopes`)
- environment: `production | staging | dev`

### 2) Fonte OpenAPI

- openapi_json_url: `<https://.../v3/api-docs | https://.../swagger.json>`
- openapi_requires_auth: `true|false`
- openapi_fetch_auth:
  - header_name: `<Authorization | X-API-Key | token | ...>`
  - header_value_format: `<Bearer {TOKEN} | {TOKEN} | ...>`
  - token_source: `<ENV_VAR_NAME | login_flow>`
- openapi_local_snapshot_path (opcional): `<caminho no repo para um .json versionado>`

### 3) Base URL / servers

- base_url_strategy:
  - use_servers_from_openapi: `true|false`
  - fixed_base_url (se não usar servers): `<https://...>`
  - path_normalization_rules:
    - `<regra 1>` (ex.: “evitar /Servidor/Servidor quando base já termina em /Servidor”)
    - `<regra 2>`

### 4) Autenticação (chamadas nos endpoints)

Preencha exatamente uma (ou mais, se a API tiver trilhas distintas).

#### 4.1) Auth por API Key fixa

- type: `api_key`
- send_via: `header | query`
- header_name: `<X-API-Key | Authorization | ...>`
- value_format: `<{API_KEY} | Bearer {API_KEY}>`
- env_var: `<ENV_VAR_NAME>`

#### 4.2) Auth por token obtido via login (2-step, OAuth, etc.)

- type: `login_token`
- send_via: `header`
- header_name: `<Authorization | ...>`
- value_format: `<Bearer {TOKEN} | {TOKEN}>`
- login_flow:
  - step_1:
    - endpoint: `<path>`
    - method: `<GET|POST>`
    - params: `<query/body shape>`
  - step_2:
    - endpoint: `<path>`
    - method: `<GET|POST>`
    - params: `<query/body shape>`
- refresh_flow (opcional):
  - endpoint: `<path>`
  - method: `<POST>`
  - params: `<shape>`
- cache_rules:
  - ttl_seconds: `<number>`
  - safety_window_seconds: `<number>` (refresh antecipado)

#### 4.3) Headers obrigatórios adicionais

- required_headers:
  - `<Header-Name-1>`: `<format/ENV>`
  - `<Header-Name-2>`: `<format/ENV>`

#### 4.4) Query params invariáveis

- required_query_params:
  - `<param1>`: `<ENV|literal>`
  - `<param2>`: `<ENV|literal>`

### 5) Seleção de endpoints → tools MCP

- selection_rule:
  - include_tags: `[ "<tag1>", "<tag2>" ]`
  - include_paths_prefix: `[ "/v1/users", "/webservice/integration/produtos" ]`
  - exclude_operations (opcional): `[ "<operationId1>", "<operationId2>" ]`
- tool_naming:
  - convention: `<service>_<domain>_<verb>_<noun>` (snake_case)
  - source_of_truth: `operationId` (preferencial) | `method+path`
  - examples:
    - `<example_tool_name>` → `<method> <path>`
- tool_annotations_defaults:
  - readOnlyHint: `true|false`
  - destructiveHint: `true|false`
  - idempotentHint: `true|false`
  - openWorldHint: `true|false`

### 6) Contratos de request/response

- request_mapping:
  - path_params: `sempre params explícitos`
  - query_params: `validar + passar apenas quando !== null/undefined`
  - body: `JSON.stringify(body ?? {})` (quando POST/PUT)
- response_mapping:
  - success: `content text + structuredContent (JSON)`
  - empty_response: `retornar {}`
  - pagination:
    - input_fields: `[ "limit", "offset" ]` (ou equivalente)
    - output_fields: `[ "total", "count", "offset", "has_more", "next_offset", "items" ]`
- error_mapping:
  - on_non_2xx: `propagar status + payload parseado`
  - normalize_message_field: `<message | error | detail | ...>`

### 7) Regras operacionais

- timeout_ms: `<number>`
- retry_policy:
  - retry_on_network_error: `true|false`
  - max_attempts: `<number>`
  - retry_on_status: `[429, 500, 502, 503]` (se aplicável)
- caching_policy:
  - default: `no-store | cache`
- rate_limit_notes: `<texto>`

### 8) Saída esperada (artefatos gerados pela IA)

- language: `typescript | python`
- deliverables:
  - `README.md` (como rodar + envs)
  - `src/index.ts` ou `server.py` (entrypoint)
  - `src/services/apiClient.*` (HTTP client + auth)
  - `src/tools/*.ts` (tools por domínio)
  - `src/schemas/*.ts` (zod) ou `models.py` (pydantic)

## Exemplo preenchido (liz_refator → MCP)

### Fonte OpenAPI

- openapi_json_url: `https://gp.lopesecia.com.br:9002/ApiLopes/v3/api-docs` ([README.md](file:///c:/LOPES/www/connect-ecommerce/liz_refator/integration/README.md#L36))
- openapi_local_snapshot_path: [api-docs.json](file:///c:/LOPES/www/connect-ecommerce/.trae/specs/apilopes-swagger/api-docs.json)

### Auth (chamadas nos endpoints)

- header_name: `Authorization`
- header_value_format: `{TOKEN}` (token bruto; remover “Bearer ” se vier prefixado) ([client.ts](file:///c:/LOPES/www/connect-ecommerce/liz_refator/integration/client.ts#L59-L77), [token.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/token.ts#L7-L10))
- token_obtainment:
  - endpoint: `{AUTH_BASE_URL}/tokenService` (POST com `{ produto, ean, idIntegradora, codCli }`) ([authWebserviceClient.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/authWebserviceClient.ts#L65-L93))
  - refresh: `{AUTH_BASE_URL}/refreshToken` (POST com `{ token, refreshToken, idIntegradora }` + header Authorization) ([authWebserviceClient.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/authWebserviceClient.ts#L95-L138))
- cache_rules:
  - safety_window: 10 min (refresh antecipado) ([authWebserviceClient.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/authWebserviceClient.ts#L8-L36))

### Env vars (fonte do token e base URLs)

- `BACK_AUTH_BASE_URL` ou `AUTH_BASE_URL` (base do tokenService/refreshToken)
- `INTEGRATION_URL_API_BACK` ou `INTEGRATION_URL_API` (base do upstream)
- `ID_INTEGRADORA`, `COD_CLI`, `PRODUTO`, `EAN`, `KEY` ([config.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/config.ts#L58-L77))

### Auth alternativo (server token)

- header_name: `token`
- header_value_format: `{GP_CLIENTE_INTEGRADO_TOKEN}`
- env_var: `GP_CLIENTE_INTEGRADO_TOKEN` ([rawClient.ts](file:///c:/LOPES/www/connect-ecommerce/liz_refator/integration/rawClient.ts#L97-L147))

### Normalização de URL (regra específica)

- Evitar duplicação de `/Servidor` quando base URL já termina com `/Servidor` e o path também começa com `/Servidor/...` ([client.ts](file:///c:/LOPES/www/connect-ecommerce/liz_refator/integration/client.ts#L10-L22))

### Mapa de rotas (integrationRoutes.ts)

Fonte canônica das rotas usadas pela camada `liz_refator`:
- [integrationRoutes.ts](file:///c:/LOPES/www/connect-ecommerce/liz_refator/integration/integrationRoutes.ts)

#### PRODUTOS_INTEGRATION_ROUTES (integração)

- Base: `integrationUrlApi` (env `INTEGRATION_URL_API_BACK | INTEGRATION_URL_API`) ([config.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/config.ts#L63-L77))
- Auth: header `Authorization: {TOKEN}` (token bruto; sem Bearer) ([client.ts](file:///c:/LOPES/www/connect-ecommerce/liz_refator/integration/client.ts#L59-L77))
- Método observado no repo (dev/raw): GET ([get-list-categoria/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/dev/liz-refator/raw/produtos/get-list-categoria/route.ts#L15-L35))
- Rotas:
  - `getListCategoria` → `/webservice/integration/getListCategoria`
  - `getCategoria` → `/webservice/integration/getCategoria`
  - `getProdutoLoja` → `/webservice/integration/getProdutoLoja`
  - `getListProdutoLoja` → `/webservice/integration/getListProdutoLoja`

#### CLIENTES_API_ROUTES (misto: webservice/api + integração)

Parte 1 (API de usuários/clientes em `authBaseUrl`):
- Base: `authBaseUrl` (env `BACK_AUTH_BASE_URL | AUTH_BASE_URL`) ([config.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/config.ts#L69-L77))
- Auth: header `Authorization: {TOKEN}` (tokenService)
- Método observado: POST com querystring ([enviar-token/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/dev/liz-refator/raw/usuarios/enviar-token/route.ts#L9-L23))
- Rotas:
  - `enviarToken` → `/webservice/api/enviarToken` (query: `email` e/ou `whatsapp`)
  - `verificarToken` → `/webservice/api/verificarTokenSistema` (query: `token` e `idIntegradora`)

Parte 2 (integração em `integrationUrlApi`):
- Base: `integrationUrlApi`
- Auth: header `Authorization: {TOKEN}` (tokenService)
- Método observado:
  - GET: `getClienteLoja`, `getIntegradora`, `getProximoCustomerIdIntegrado` ([get-cliente-loja/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/dev/liz-refator/raw/clientes/get-cliente-loja/route.ts#L9-L20))
  - POST: `insertClienteLoja` (body JSON; incluir `idIntegradora`) ([insert-cliente-loja/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/dev/liz-refator/raw/clientes/insert-cliente-loja/route.ts#L18-L45))
- Rotas:
  - `getClienteLoja` → `/Servidor/webservice/integration/getClienteLoja`
  - `getIntegradora` → `/Servidor/webservice/integration/getIntegradora`
  - `getProximoCustomerIdIntegrado` → `/Servidor/webservice/integration/getProximoCustomerIdIntegrado`
  - `insertClienteLoja` → `/Servidor/webservice/integration/insertClienteLoja`

#### PEDIDOS_INTEGRATION_ROUTES (integração, com server token em alguns fluxos)

- Base: `integrationUrlApi`
- Auth (observado em `insertDadoIntegration`): header `token: {GP_CLIENTE_INTEGRADO_TOKEN}` (env `GP_CLIENTE_INTEGRADO_TOKEN`) ([rawClient.ts](file:///c:/LOPES/www/connect-ecommerce/liz_refator/integration/rawClient.ts#L97-L147), [insert-dado-integration/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/dev/insert-dado-integration/route.ts#L70-L73))
- Rotas:
  - `insertDadoIntegration` → `/Servidor/webservice/integration/insertDadoIntegration` (POST)
  - `getListDadoIntegration` → `/Servidor/webservice/integration/getListDadoIntegration`
  - `getDadoIntegration` → `/Servidor/webservice/integration/getDadoIntegration`

#### AUTH_API_ROUTES (auth em authBaseUrl)

- Base: `authBaseUrl`
- Auth: header `Authorization: {TOKEN}` (tokenService)
- Método observado no repo (dev/raw): GET ([get-operador-sistema/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/dev/liz-refator/raw/auth/get-operador-sistema/route.ts#L9-L23))
- Rotas:
  - `postAutenticaAplicativo` → `/postAutenticaAplicativo`
  - `insertOperadorSistema` → `/insertOperadorSistema`
  - `getOperadorSistema` → `/getOperadorSistema`
  - `insertVinculoUsuarioSite` → `/insertVinculoUsuarioSite`
  - `getVinculoUsuarioSite` → `/getVinculoUsuarioSite`

## Riscos e limites

- Gerar tools para todos os endpoints do OpenAPI pode criar MCP muito grande, lento para carregar e difícil de manter.
- Autenticação com refresh exige controle de concorrência (lock) para evitar múltiplos refresh simultâneos; o exemplo usa `refreshPromise` ([authWebserviceClient.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/authWebserviceClient.ts#L10-L152)).
- Se a API retorna erros com shapes diferentes por endpoint, é necessário normalizar o campo de mensagem.

## Validação (como saber que deu certo)

- A IA consegue, apenas com as informações do “Modelo”, gerar um MCP que:
  - inicializa e lista tools
  - faz uma chamada real (read-only) em pelo menos 1 endpoint
  - trata autenticação e refresh sem vazar tokens em logs/outputs
  - retorna `structuredContent` com JSON parseado e status coerente em falhas
