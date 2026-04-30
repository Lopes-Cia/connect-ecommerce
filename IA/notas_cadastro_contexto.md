# Notas — Contexto de Cadastro

Este arquivo existe para registrar as informações que você vai enviar nesta conversa, sem depender de memória do assistente.

## Entradas

- Projeto usa Next.js.
- Existe um projeto de referência (Francis) em `C:\LOPES\www\newbread-ecommerce` (somente leitura).
- O fluxo de registro/cadastro está documentado em:
  - `IA/diagrama_registro_def.excalidraw`
  - `IA/fluxo_registro_usuario.md`
- A página de testes do fluxo/endereços de cliente é `app/(shop)/dev/clientes/page.tsx`.
- A página de testes do fluxo de autenticação/vínculo (Auth) é `app/(shop)/dev/registro/page.tsx`.
- Padrão geral de testes DEV/RAW documentado em `IA/padrao_dev_testes_endpoints.md`.
- O teste em DEV simula o fluxo **após** o cliente já ter enviado os dados do formulário de cadastro.
- Quando o cliente preenche o formulário, os valores viram um objeto (payload) que pode ser representado como JSON; este JSON é a base do `body` enviado no POST do cadastro.
- Foi criado um primeiro JSON de teste (dados preenchidos do formulário) em `liz_refator/integration/cliente_teste_1.json` para servir como base e permitir criar variações depois.
- Foi criado um segundo JSON de teste em `liz_refator/integration/cliente_teste_2.json` (nova pessoa/CNPJ) para evitar conflito quando um cliente de teste já tiver sido cadastrado.
- Processo de teste no próprio sistema (sem terminal): abrir `http://localhost:3000/dev/clientes` → no card `getClienteLoja` conferir `cgc` (vem do cliente default) → clicar `Executar` → ler o `JSON Response` para decidir se o cliente existe.
- Teste executado (cliente_teste_2 / cnpj 11222333000181): `getClienteLoja` retornou cliente não encontrado (interpretação: não cadastrado no ERP).
- Foi criado um terceiro JSON de teste em `liz_refator/integration/cliente_teste_3.json` para repetir o fluxo com outro CNPJ quando um teste anterior ficar “sujo”.
- Foi criado um quarto JSON de teste em `liz_refator/integration/cliente_teste_4.json` para repetir o fluxo quando um cliente anterior já tiver sido cadastrado.
- Regra prática para os JSONs de teste: `cnpj`, `whatsapp` e `cep` sempre como string só com números.
- Exemplos de resposta do `getClienteLoja` para amarrar contratos:
  - Caso cadastrado: `liz_refator/integration/clienteExiste.json` (success=true, `data` com `codCli`, `limCred`, `enderecos[]`, etc.)
  - Caso não cadastrado: `liz_refator/integration/clienteNaoEncontrado.json` (success=false, `data` como string "Cliente nencontrado.")
- Exemplo de resposta do `getProximoCustomerIdIntegrado` (customerId cru): `liz_refator/integration/proximoCustomerIdIntegrado.json` (success=true, `data` number).
- Exemplo de resposta do `getIntegradora` (limCred): `liz_refator/integration/integradoraLimCred.json` (success=true, `data.filialWinthor.limiteCredito`).
- Contrato/parse do retorno do `getClienteLoja` foi consolidado em `liz_refator/contracts/lopes/clientes.ts` (`parseGetClienteLojaResponse` / `parseClienteLojaData`).
- Os endpoints `/enviarToken` e `/verificarTokenSistema` serão usados mais pra frente, mas no momento não entram no foco do “Fluxo cliente novo” (ERP).
- Base URLs do fluxo vêm do `.env`:
  - `INTEGRATION_URL_API` (Fase de Integração / ERP)
  - `AUTH_BASE_URL` (Fase de Autenticação / Auth; quando configurado, `BACK_AUTH_BASE_URL` pode ser usado como base do Auth)
- Regra do fluxo cliente novo (ERP) para `insertClienteLoja`: `enderecos[0].codigoIbge = 0` (por enquanto).
- Defaults do payload estão OK: `status="PEN"`, `idTabPreco=1`, `enderecos[0].principal="Sim"`.
- Para o `insertClienteLoja` no DEV: usar 2 ações separadas — botão "Gerar payload" e botão "EXECUTAR insertClienteLoja".
