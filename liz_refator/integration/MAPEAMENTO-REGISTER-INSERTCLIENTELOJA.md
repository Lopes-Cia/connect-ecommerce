# Mapeamento — /register → payload `insertClienteLoja`

Objetivo: separar o que vem do **formulário do cliente** vs o que é **calculado/default** para montar o payload do endpoint:

- `POST /Servidor/webservice/integration/insertClienteLoja`

## 1) Campos vindos do formulário (/register)

| Form (/register) | Payload `insertClienteLoja` | Normalização |
|---|---|---|
| `responsavel` | `cliente` | `.trim()` |
| `fantasia` | `fantasia` | `.trim()` |
| `cnpj` | `cgc` | `onlyDigits(...)` |
| `inscicao` | `inscicao` | `.trim()` |
| `email` | `email` | `.trim()` |
| `whatsapp` | `telefone` | `onlyDigits(...)` |
| `cep` | `enderecos[0].cep` | `onlyDigits(...)` |
| `rua` | `enderecos[0].rua` | `.trim()` |
| `numero` | `enderecos[0].numero` | `.trim()` ou `null` quando vazio |
| `complemento` | `enderecos[0].complemento` | `.trim()` ou `null` quando vazio |
| `bairro` | `enderecos[0].bairro` | `.trim()` |
| `municipio` | `enderecos[0].municipio` | `.trim()` |
| `uf` | `enderecos[0].uf` | `.trim()` |

## 2) Campos calculados/default (não vêm do formulário)

| Campo no payload | Origem | Regra |
|---|---|---|
| `status` | default | `"PEN"` |
| `principal` | default | `"Sim"` |
| `codigoIbge` | default | `0` (placeholder) |
| `idTabPreco` | default | `1` |
| `limCred` | integração | vem de `integrationConfig.limiteCredito` quando disponível; senão `0` |
| `customerId` | back | vem de `getProximoCustomerIdIntegrado` |
| `enderecos[0].customerId` | back | igual ao `customerId` |

## 3) Campos vindos do ambiente (.env) — nunca do client

| Campo | Origem | Regra |
|---|---|---|
| `idIntegradora` | `.env` (server) | não aceitar via query/body do client; o server força o valor |

## 4) Arquivos de simulação (para contrato)

- `clienteExiste.json`: exemplo real de retorno do `getClienteLoja` (cliente já cadastrado)
- `clienteNovo.json`: template do body do `insertClienteLoja` (cliente novo; placeholders para completar)

