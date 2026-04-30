# Contrato — insertClienteLoja (ERP)

Endpoint (ERP): `POST /Servidor/webservice/integration/insertClienteLoja`

Regra global do fluxo: requisições `POST` retornam string `true` em caso de sucesso.

## Body (campos e origem)

### Campos vindos do JSON do formulário (cliente_teste_*.json)

- `cliente` ← `responsavel` (campo do formulário usado no gerador atual)
- `fantasia` ← `fantasia`
- `cgc` ← `cnpj`
- `inscicao` ← `inscicao`
- `email` ← `email`
- `telefone` ← `whatsapp`
- `enderecos[0].rua` ← `rua`
- `enderecos[0].numero` ← `numero`
- `enderecos[0].complemento` ← `complemento`
- `enderecos[0].bairro` ← `bairro`
- `enderecos[0].cep` ← `cep`
- `enderecos[0].municipio` ← `municipio`
- `enderecos[0].uf` ← `uf`

### Campos vindos de env / chamadas anteriores / defaults

- `idIntegradora` ← `.env` (server-side)
- `limCred` ← `GET /Servidor/webservice/integration/getIntegradora?id={id}` (`limiteCredito`)
- No retorno do `getIntegradora`, o valor vem em `data.filialWinthor.limiteCredito` (exemplo: `liz_refator/integration/integradoraLimCred.json`).
- `customerId` ← `GET /Servidor/webservice/integration/getProximoCustomerIdIntegrado?idIntegradora={id}`
- `enderecos[0].customerId` ← mesmo `customerId`
- `enderecos[0].codigoIbge` ← `0` (regra atual)
- `status` ← `"PEN"` (default)
- `idTabPreco` ← `1` (default)
- `enderecos[0].principal` ← `"Sim"` (default)

## Observação

O JSON do formulário é “dados digitados pelo cliente”. O payload do ERP inclui campos gerados/derivados (env, `customerId`, `limCred`, defaults).
