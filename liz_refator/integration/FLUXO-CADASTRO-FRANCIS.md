# Fluxo de Cadastro (referência Francis / newbread-ecommerce)

Este documento registra o fluxo “prático” do cadastro conforme a referência em `C:\LOPES\www\newbread-ecommerce` (somente leitura), para servir como **memória de contexto** ao construir o equivalente no `connect-ecommerce`.

## Ponto de entrada (browser → BFF)

1) `POST /api/auth/register`

## Sequência inicial dentro do `POST /api/auth/register` (server-to-server)

### 1) Boot/Auth da integração (token + config)

- `POST {AUTH_BASE_URL}/tokenService` (via `ensureAuthReady`) — `authService.ts`
- `GET {INTEGRATION_URL_API}/Servidor/webservice/integration/getIntegradora?id=<idIntegradora>` (ainda no `ensureAuthReady`) — `authService.ts`

### 2) Checagem de existência do cliente (getClienteLoja)

- `GET /Servidor/webservice/integration/getClienteLoja?idIntegradora=<id>&cgc=<cnpj>`
  - usado no `register route` e em `registrationService.ts`

### 3) Se `clienteLojaExists === true`: checa/valida operador e vínculo

- `GET {AUTH_BASE_URL}/getOperadorSistema?email=<email>` — `register route`
- `GET {AUTH_BASE_URL}/getVinculoUsuarioSite?idIntegradora=<id>&email=<email>&cnpj=<cnpj>` — `register route`

### 4) Se `clienteLojaExists === false`: cria cliente no ERP

- `GET /Servidor/webservice/integration/getProximoCustomerIdIntegrado?idIntegradora=<id>` — `registrationService.ts`
- `POST /Servidor/webservice/integration/insertClienteLoja` — `registrationService.ts`

### 5) Criação/vínculo do operador (se necessário)

- `POST {AUTH_BASE_URL}/insertOperadorSistema` — `register route`
- `POST {AUTH_BASE_URL}/insertVinculoUsuarioSite` — `register route`
- `GET {AUTH_BASE_URL}/getVinculoUsuarioSite...` (validação final) — `register route`

## Observações

- `newbread-ecommerce` é apenas referência e não deve ser editado.
- O objetivo é construir esse fluxo “um endpoint por vez” no `connect-ecommerce`.

