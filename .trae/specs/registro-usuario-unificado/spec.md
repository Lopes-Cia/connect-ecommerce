# Spec — Registro de Usuário (ERP + Auth) e Validação de Vínculo

## Contexto

Hoje já existe um fluxo DEV/RAW validado no navegador para **Fase 1 (ERP)** em `/dev/clientes`:
- `getClienteLoja` (existe vs não existe)
- `getProximoCustomerIdIntegrado` (customerId cru)
- `getIntegradora` (limCred em `data.filialWinthor.limiteCredito`)
- `insertClienteLoja` (POST retorna `true`/`"true"` como sucesso)

O próximo passo é adicionar a **Fase 2 (Auth)** seguindo o mesmo processo (uma chamada por vez via UI DEV), corrigir/completar a documentação do fluxo e, por fim, **agrupar tudo em uma chamada única** de registro que será usada pelo `/register`.

## Objetivo

1) Implementar **Fase 2 (Auth)** no mesmo padrão DEV/RAW (UI → `/api/dev/**` → server-to-server).
2) Atualizar o documento externo `c:\LOPES\FILES\fluxo_registro_usuario.md` para refletir:
   - O body correto do passo 2.1 (com o que realmente for exigido pelo backend).
   - A validação de vínculo no início e no fim do fluxo.
   - A indicação correta da variável de `.env` usada na base do Auth (conforme o arquivo apontar).
3) Criar uma rota **única** (server) que orquestra o fluxo completo:
   - Valida vínculo no início.
   - Garante cliente no ERP (se necessário).
   - Cria operador/usuário no Auth, vincula ao site e valida vínculo no fim.
4) Integrar a rota única na página `/register`, mantendo o comportamento atual e só trocando a chamada/endpoint.

## Não-objetivos

- Alterar tokens/tema/estilo visual do site além do mínimo necessário para os cards DEV.
- Rodar build/lint/testes avançados (validação mínima via erros de TypeScript e teste manual via navegador).
- Implementar “fallbacks” silenciosos (qualquer comportamento de contorno deve ser discutido antes).

## Premissas e Restrições

- Testes devem ser feitos **no navegador** e **passo a passo**, sem pular etapas.
- Não alterar o resultado esperado do seu fluxo: replicar o processo que já funcionou, mudando um ponto por vez.
- `idIntegradora` deve ser sempre injetado server-side via `.env` e não pode ser sobrescrito pela UI.
- Nunca retornar `Authorization` real no JSON para o browser (redigir como `"<redacted>"`).
- Alguns retornos do backend são “mal projetados” e devem ser aceitos como contrato (ex.: `codCli` pode vir `0` e estar ok).

## Variáveis de Ambiente

- ERP: `INTEGRATION_URL_API_BACK` (ou mock via `INTEGRATION_URL_API_MOCK` quando `NEXT_PUBLIC_FONTE=mock`)
- Auth:
  - Base principal: `AUTH_BASE_URL`
  - Base alternativa citada no `.env`: `BACK_AUTH_BASE_URL` (usar a variável indicada pelo documento; quando ambas existirem, preferir a indicada).
- TokenService: usa `produto`, `ean`, `idIntegradora`, `codCli` e retorna `hashToken` usado como `Authorization`.
- Chave de ativação: `KEY` (quando exigido por endpoints do Auth).

## Design (Alto Nível)

### A) Padrão DEV/RAW para Auth

- Criar rotas DEV para os endpoints do Auth:
  - `GET /getVinculoUsuarioSite` (validação de vínculo)
  - `POST /insertOperadorSistema`
  - `GET /getOperadorSistema`
  - `POST /insertVinculoUsuarioSite`
- Criar UI DEV (nova página ou nova seção) com cards para executar cada etapa, mostrando:
  - End-point (path)
  - JSON Request (query/body)
  - JSON Response

### B) Validação de vínculo no início e no fim

- No fluxo agregado (rota única):
  1) **Início:** chamar `getVinculoUsuarioSite`. Se já existir, retornar sucesso imediatamente (não repetir criação/vínculo).
  2) **Fim:** após `insertVinculoUsuarioSite`, chamar `getVinculoUsuarioSite` novamente e validar que retornou objeto de vínculo.

### C) Rota única de registro

Criar/ajustar endpoint server-side para orquestrar:
1) Início: `getVinculoUsuarioSite` (se já existe, retorna sucesso com `alreadyLinked: true`).
2) ERP:
   - `getClienteLoja` (se não existe, buscar `customerId` + `limCred` e chamar `insertClienteLoja`).
3) Auth:
   - `insertOperadorSistema`
   - `getOperadorSistema` (obter idUsuario)
   - `insertVinculoUsuarioSite`
   - `getVinculoUsuarioSite` (fim)
4) Responder com payload resumido (sem segredos) para o frontend.

### D) Integração no /register

- Reaproveitar o JSON do formulário (responsável, cnpj, email, whatsapp e demais campos).
- Substituir a chamada atual para usar a rota única (mantendo UX e mensagens).

## Contratos (a confirmar via resposta real no navegador)

- `insertOperadorSistema`: confirmar body obrigatório e shape de retorno.
- `getOperadorSistema`: confirmar onde está o `id` (provável `data[0].id` ou `data.id`).
- `insertVinculoUsuarioSite`: confirmar se retorna `true`/`"true"`.
- `getVinculoUsuarioSite`: confirmar contrato de “existe” vs “não existe” (status/shape).

## Validação (manual, no navegador)

1) Abrir a página DEV do Auth e rodar `getVinculoUsuarioSite` antes de qualquer coisa.
2) Se não existir vínculo:
   - rodar `insertOperadorSistema` → capturar JSON Response
   - rodar `getOperadorSistema` → capturar `idUsuario`
   - rodar `insertVinculoUsuarioSite` → capturar retorno
   - rodar `getVinculoUsuarioSite` novamente → confirmar vínculo criado
3) Executar a rota única de registro com um cliente novo e confirmar:
   - no fim `getVinculoUsuarioSite` retorna vínculo
   - `getClienteLoja` retorna cliente (se foi criado)

