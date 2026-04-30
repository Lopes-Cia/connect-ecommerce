# Contratos — Cadastro (server-to-server)

Este arquivo consolida os **contratos mínimos** (o que esperamos receber) dos endpoints envolvidos no fluxo de cadastro.

## 1) getClienteLoja

- Back: `/Servidor/webservice/integration/getClienteLoja`
- Request (query):
  - `cgc: string` (CNPJ)
- Interpretação:
  - Encontrou: `success: true` + `data` como objeto de cliente
  - Não encontrou: `success: false` + `data: "Cliente nencontrado."` (normalmente 404)

## 2) getProximoCustomerIdIntegrado

- Back: `/Servidor/webservice/integration/getProximoCustomerIdIntegrado`
- Request (query):
  - nenhum (o `idIntegradora` é injetado via `.env` no server)
- Response esperada:
  - `data: number` (inteiro > 0)

Exemplo (dev):

```json
{
  "success": true,
  "data": 7
}
```

## 3) insertClienteLoja

- Back: `/Servidor/webservice/integration/insertClienteLoja`
- Request (body JSON):
  - payload do cliente + endereços
  - `idIntegradora` é forçado pelo server via `.env` (não deve vir do client)
- Response esperada:
  - `data: boolean` (true quando inseriu)
