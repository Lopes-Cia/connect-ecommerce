# Fluxo de Cadastro — decisão inicial por CNPJ (cgc)

No fluxo de cadastro (server-to-server), a primeira decisão é saber se o **CNPJ (cgc)** já está cadastrado no back.

## Endpoint (RAW)

- `getClienteLoja`
  - Back: `/Servidor/webservice/integration/getClienteLoja`
  - Parâmetros: `cgc` (CNPJ)
  - `idIntegradora`: vem do `.env` no server (não deve vir do client/query)

No projeto, o teste server-to-server é feito via rota dev:

- `GET /api/dev/liz-refator/raw/clientes/get-cliente-loja?cgc=<cnpj>`

## Interpretação do resultado

### Caso 1 — CNPJ já cadastrado

Condição:

- `success: true`
- `data`: objeto de cliente (ex.: contém `codCli`, `cliente`, `fantasia`, `enderecos`, etc.)

Decisão:

- Prosseguir no branch “cliente existe” (validar operador/vínculo, etc.).

### Caso 2 — CNPJ não cadastrado

Condição:

- `success: false`
- `data`: `"Cliente nencontrado."` (normalmente status 404 no back)

Decisão:

- Prosseguir no branch “cliente não existe” (criar cliente no ERP: `getProximoCustomerIdIntegrado` → `insertClienteLoja`).

## Casos testados (dev)

- `25231575000146` → **encontrou cliente** (retornou objeto do cliente)
- `30873832000183` → **não encontrou** (`"Cliente nencontrado."`)

