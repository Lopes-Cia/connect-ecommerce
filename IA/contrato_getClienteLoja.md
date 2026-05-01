# Contrato — getClienteLoja

Endpoint (ERP): `/Servidor/webservice/integration/getClienteLoja?idIntegradora=<env>&cgc=<cnpj>`

## Caso: cliente cadastrado (success=true)

Exemplo real salvo em: `liz_refator/integration/clienteExiste.json`

Shape:

- `success`: `true`
- `request`: metadados do request (url/method/headers/query) com `Authorization` redigido
- `data`:
  - `codCli` (number)
  - `limCred` (number)
  - `cliente` (string) — razão social
  - `fantasia` (string)
  - `cgc` (string) — CNPJ
  - `inscicao` (string)
  - `email` (string)
  - `telefone` (string)
  - `status` (string)
  - `idIntegradora` (number)
  - `idTabPreco` (number)
  - `customerId` (number)
  - `enderecos[]`:
    - `customerId` (number)
    - `codigoIbge` (number)
    - `rua` (string)
    - `bairro` (string)
    - `cep` (string)
    - `municipio` (string)
    - `uf` (string)
    - `principal` (string)

## Caso: cliente não cadastrado (success=false)

Exemplo de teste salvo em: `liz_refator/integration/clienteNaoEncontrado.json`

Shape:

- `success`: `false`
- `message`: `"Integration request failed"`
- `request`: metadados do request (url/method/headers/query) com `Authorization` redigido
- `data`: string `"Cliente nencontrado."`

## Observação (diferença entre “JSON do formulário” vs “JSON do back”)

O JSON do formulário (ex.: `cliente_teste_3.json`) é “dados digitados pelo cliente”.
O retorno do `getClienteLoja` é o “cadastro consolidado do ERP” e tem muitos campos que não existem no formulário.

Mapeamento prático:

- `responsavel` → `cliente`
- `cnpj` → `cgc`
- `whatsapp` → `telefone`
- Endereço do form (`rua`, `bairro`, `cep`, `municipio`, `uf`, etc.) → `enderecos[0]`

Campos que NÃO vêm do formulário:

- `codCli`, `limCred`, `idTabPreco`, `customerId`, `codigoIbge`, `principal`, `idIntegradora`
