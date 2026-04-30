# Fluxo de Registro de Usuário

**Contexto:** Sincronização entre ERP (Integração) e Sistema de Autenticação.
**Regra Global:** Requisições `POST` retornam string `true` em caso de sucesso.

## 1. Fase de Integração (ERP)
Base URL: `INTEGRATION_URL_API`

### Passo 1.1: Verificação de Existência
`GET /Servidor/webservice/integration/getClienteLoja?idIntegradora={id}&cgc={cnpj}`
- **200 OK:** Cliente existe. Pular para Fase 2.
- **404 Not Found:** Seguir para Passo 1.2.

### Passo 1.2: Coleta de Dados Mandatórios
1. **Limite:** `GET /Servidor/webservice/integration/getIntegradora?id={id}` -> Obter `limiteCredito`.
2. **ID Integração:** `GET /Servidor/webservice/integration/getProximoCustomerIdIntegrado?idIntegradora={id}` -> Obter o valor numerico cru que é enviado.

### Passo 1.3: Cadastro de Cliente
`POST /Servidor/webservice/integration/insertClienteLoja`
**Body:**
`{"limCred":{limCred},"cliente":"{nome}","fantasia":"{fantasia}","cgc":"{cnpj}","inscicao":"{ie}","email":"{email}","telefone":"{tel}","status":"PEN","idIntegradora":{id},"idTabPreco":1,"customerId":{customerId},"enderecos":[{"customerId":{customerId},"codigoIbge":{ibge},"rua":"{rua}","numero":"{num}","complemento":"{comp}","bairro":"{bairro}","cep":"{cep}","municipio":"{mun}","uf":"{uf}","principal":"Sim"}]}`

---

## 2. Fase de Autenticação (Auth)
Base URL: `AUTH_BASE_URL`

### Passo 2.1: Criar Operador
`POST /insertOperadorSistema`
**Body:**
`{"status":1,"qt":1,"idFilial":1,"grupo":"Usuário","nivel":"Junior","nome":"{nome}","telefone":"{tel}","email":"{email}"}`

### Passo 2.2: Recuperar ID de Usuário
`GET /getOperadorSistema?email={email}`
- **Ação:** Capturar `id` do objeto retornado.

### Passo 2.3: Vincular Usuário ao Site
`POST /insertVinculoUsuarioSite`
**Body:**
`{"idUsuario":{idUsuario},"idIntegradora":{id},"cnpj":"{cnpj}"}`

### Passo 2.4: Validar Vínculo
`GET /getVinculoUsuarioSite?idIntegradora={id}&email={email}&cnpj={cnpj}`
- **Sucesso:** Se retornar objeto com dados do vínculo.

---

## 3. Finalização (Frontend)
1. Exibir notificação de sucesso.
2. Redirect: `/login`.