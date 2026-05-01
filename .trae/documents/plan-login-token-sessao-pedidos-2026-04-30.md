# Plano — Login por Token + Sessão Cliente (segura) + Pedido OrderLopes

## Resumo

Implementar o login do cliente usando os endpoints **enviarToken** e **verificarTokenSistema**, adicionando a opção **“Já tem token?”** no formulário e, após validar o token, persistir uma sessão de cliente **por 7 dias** via cookie **httpOnly assinado** (seguro). Em seguida, usar o `cnpjCliente` retornado por `verificarTokenSistema` para buscar `getClienteLoja` e preencher o `clientes-store` com `customerId` (como `meus_dados.id`) e demais dados do cliente. Finalmente, ajustar o envio do pedido `OrderLopes` para usar os dados reais do cliente ao montar o `pedido_mockup` e enviar via `insertDadoIntegration`.

Decisões confirmadas:
- Link **“Já tem token?”** apenas abre a etapa de validação do token no mesmo formulário.
- Sessão do cliente dura **7 dias** (cookie seguro).
- Segredo de assinatura do cookie: `GP_CLIENTE_INTEGRADO_TOKEN`.
- Entrega em pedidos: **criar envio OrderLopes** (usando `pedido_mockup` com `orderId` default já existente).

## Estado Atual (grounded)

### Login / Auth
- A UI de login chama:
  - `sendLoginToken()` → `POST /api/auth/send-token`
  - `verifyLoginToken()` → `POST /api/auth/verify-token`
  - Arquivos: [auth.ts](file:///c:/LOPES/www/connect-ecommerce/lib/api/auth.ts), [LoginForm (lopes)](file:///c:/LOPES/www/connect-ecommerce/app/(auth)/login_ori/_components/LoginForm.tsx), [LoginForm (default)](file:///c:/LOPES/www/connect-ecommerce/app/(auth)/login/_components/LoginForm.tsx)
- O backend atual:
  - `POST /api/auth/send-token` chama `AUTH_BASE_URL/enviarToken?...` e possui log de debug. [send-token route](file:///c:/LOPES/www/connect-ecommerce/app/api/auth/send-token/route.ts)
  - `POST /api/auth/verify-token` chama `AUTH_BASE_URL/verificarTokenSistema?token=...`, depois `getOperadorSistemaForId`, e grava cookie `session` com JSON puro. [verify-token route](file:///c:/LOPES/www/connect-ecommerce/app/api/auth/verify-token/route.ts)
- Sessão server-side hoje:
  - Cookie `session` armazena `JSON.stringify(session)` sem validação/assinatura. [session.ts](file:///c:/LOPES/www/connect-ecommerce/lib/auth/session.ts)
  - `GET /api/auth/me` devolve esse JSON para o client. [me route](file:///c:/LOPES/www/connect-ecommerce/app/api/auth/me/route.ts)
- A área `/cliente/*` é protegida apenas pelo cookie **forjável** `clientes_logged_in`. [middleware.ts](file:///c:/LOPES/www/connect-ecommerce/middleware.ts)
- O store `clientes-store` guarda `isLoggedIn` com base em `clientes_logged_in`, mas o `loginData` não persiste (fica em memória). [clientes-store.ts](file:///c:/LOPES/www/connect-ecommerce/stores/clientes-store.ts)

### Integração (contratos relevantes)
- Já existe o RAW client “profissional” para os endpoints do Auth webservice (com `Authorization` vindo do tokenService e `idIntegradora` injetado server-side):
  - `clientesRawEnviarToken()` e `clientesRawVerificarToken()` em [usuariosRaw.ts](file:///c:/LOPES/www/connect-ecommerce/liz_refator/integration/usuariosRaw.ts)
- Já existe rota DEV que retorna o contrato exatamente no shape desejado (success/request/data) para verificar token:
  - [dev usuarios/verificar-token](file:///c:/LOPES/www/connect-ecommerce/app/api/dev/liz-refator/raw/usuarios/verificar-token/route.ts)
- Já existe rota DEV `getClienteLoja` (injeta `idIntegradora` via env): [get-cliente-loja](file:///c:/LOPES/www/connect-ecommerce/app/api/dev/liz-refator/raw/clientes/get-cliente-loja/route.ts)

### Pedido OrderLopes
- Checkout usa `pedido_mockup` e envia para `POST /api/dev/insert-dado-integration`. [CheckoutForm.tsx](file:///c:/LOPES/www/connect-ecommerce/app/(shop)/checkout/_components/CheckoutForm.tsx#L74-L110)
- `pedido_mockup` tem `payload.cliente` fixo, não usa dados do cliente logado. [pedidos-store.ts](file:///c:/LOPES/www/connect-ecommerce/stores/pedidos-store.ts#L128-L170)
- `POST /api/dev/insert-dado-integration` aceita `idIntegradora` do client (precisa ser “hardening” para não permitir sobrescrever env). [insert-dado-integration route](file:///c:/LOPES/www/connect-ecommerce/app/api/dev/insert-dado-integration/route.ts)

## Objetivo / Critérios de Sucesso

1) No `/login`:
- Usuário consegue enviar token por email/WhatsApp.
- Existe link **“Já tem token?”** abaixo do texto “Não tem uma conta? Registre-se” que abre a etapa “Validar token”.
- Validando token:
  - Backend chama `verificarTokenSistema` e obtém `cnpjCliente`.
  - Backend busca `getClienteLoja(cgc=cnpjCliente)` e obtém `customerId` e dados do cliente.
  - `clientes-store` passa a ter `loginData.meus_dados.id = customerId` e `enderecos` preenchidos.
  - Usuário é redirecionado para `/cliente/painel`.
2) Sessão:
- Acesso a `/cliente/*` funciona por 7 dias sem precisar relogar, e o guard não é forjável por `document.cookie`.
- Cookie de sessão é **assinado** com `GP_CLIENTE_INTEGRADO_TOKEN` e validado no server/middleware.
3) Pedido:
- Ao enviar `OrderLopes` via checkout, `pedido_mockup.payload.cliente` é preenchido com dados do cliente real logado (CPFCNPJ, email, fone, endereço etc).
- O `orderId` default existente em `pedidos-store.ts` continua como default (sem inventar outro).

## Mudanças Propostas (arquivos e como)

### 1) Refatorar endpoints /api/auth para usar contratos “RAW” e capturar cnpjCliente

**Modificar:** [send-token route](file:///c:/LOPES/www/connect-ecommerce/app/api/auth/send-token/route.ts)
- Remover logs de debug.
- Trocar a implementação para usar `clientesRawEnviarToken()` (de `liz_refator/integration/usuariosRaw.ts`).
- Responder no contrato:
  - `success: true`
  - `request` (com `Authorization: "<redacted>"`)
  - `data` (string/unknown retornado pelo backend)

**Modificar:** [verify-token route](file:///c:/LOPES/www/connect-ecommerce/app/api/auth/verify-token/route.ts)
- Trocar a implementação para:
  1) Chamar `clientesRawVerificarToken({ token })` e obter `data.cnpjCliente`.
  2) Chamar `integrationRawGetJsonAuth(CLIENTES_API_ROUTES.getClienteLoja, { cgc: cnpjCliente })` para obter dados do cliente.
  3) Montar “contrato interno de cliente” para o frontend:
     - `meus_dados.id = customerId`
     - `meus_dados.email`, `meus_dados.nome`, `meus_dados.cnpj` etc
     - `enderecos = enderecos` retornado
  4) Criar sessão (cookie) assinada com:
     - `token` (token validado)
     - `cnpjCliente`
     - `customerId`
     - `email`/`nome` derivados do `getClienteLoja`
     - `expiresAt` (7 dias)
  5) Responder para o frontend com:
     - `success: true`
     - `data: { verification, clienteLoja, clienteSession }` (sem segredos)
     - opcionalmente `request` redigido para debug (no mesmo padrão RAW)

Observação importante:
- O `verify-token` atual usa `getOperadorSistemaForId`. Pelo novo fluxo, o “cliente” vem de `cnpjCliente + getClienteLoja`. A sessão passa a representar o **cliente** (não o “operador”).

### 2) Tornar a sessão “profissional”: cookie assinado e validado

**Modificar:** [session.ts](file:///c:/LOPES/www/connect-ecommerce/lib/auth/session.ts)
- Trocar o formato do cookie `session` de JSON puro para:
  - `base64url(payloadJson).base64url(hmacSha256(payloadJson, secret))`
- Secret: `process.env.GP_CLIENTE_INTEGRADO_TOKEN` (obrigatório).
- Validar:
  - assinatura (HMAC)
  - schema mínimo
  - expiração (`exp` no payload)
- Ajustar `Session` para suportar dados de cliente:
  - `cliente: { cnpj: string; customerId: number; email?: string; nome?: string }`
  - manter campos existentes se ainda usados em algum ponto

**Modificar:** [me route](file:///c:/LOPES/www/connect-ecommerce/app/api/auth/me/route.ts)
- Continuar retornando `success: true` e os dados da sessão, mas agora vindo da sessão assinada.

**Modificar:** [logout route](file:///c:/LOPES/www/connect-ecommerce/app/api/auth/logout/route.ts)
- Garantir que limpa o cookie `session` corretamente (mesmo formato novo).

### 3) Trocar guard /cliente/* para sessão segura (middleware)

**Modificar:** [middleware.ts](file:///c:/LOPES/www/connect-ecommerce/middleware.ts)
- Remover dependência do cookie `clientes_logged_in`.
- Validar a presença e integridade do cookie `session`.
  - Como middleware roda em Edge, usar WebCrypto (`crypto.subtle`) para verificar HMAC com `GP_CLIENTE_INTEGRADO_TOKEN`.
- Se sessão inválida/ausente → redirect `/login`.

### 4) Frontend: ajustar login forms para “Já tem token?” e hidratação real do clientes-store

**Modificar:** [LoginForm (lopes)](file:///c:/LOPES/www/connect-ecommerce/app/(auth)/login_ori/_components/LoginForm.tsx)
**Modificar:** [LoginForm (default)](file:///c:/LOPES/www/connect-ecommerce/app/(auth)/login/_components/LoginForm.tsx)
- Inserir link/botão abaixo do parágrafo “Não tem uma conta? Registre-se”:
  - Texto: “Já tem token?”
  - Ação: `setStep("verify")` (sem envio de token)
- Remover `loginData` mock do `onVerifyToken`.
- Após `verifyLoginToken`:
  - Chamar `refreshSession()` (AuthContext) para manter estado global sincronizado.
  - Montar `loginData` com base no retorno do `verify-token` (ou via `GET /api/auth/me`), incluindo:
    - `meus_dados.id` = `customerId`
    - `meus_dados.email`, `meus_dados.nome`, `meus_dados.cnpj`
    - `enderecos`
  - Chamar `setLoggedIn({ isLoggedIn: true, loginData })`
  - `router.push("/cliente/painel")`

**Modificar:** [AuthContext.tsx](file:///c:/LOPES/www/connect-ecommerce/contexts/AuthContext.tsx)
- Após `getCurrentSession()` (GET /api/auth/me), sincronizar também o `clientes-store`:
  - se `session` existe e contém `cliente.customerId` → setLoggedIn(true) + preencher loginData mínimo
  - se não existe → reset/logout do clientes-store

**Modificar:** [ClienteLayout](file:///c:/LOPES/www/connect-ecommerce/app/(shop)/cliente/layout.tsx)
- Evitar “modal/redirect prematuro” enquanto a sessão ainda está carregando:
  - usar `useAuth().isLoading` para só disparar o modal quando a sessão foi avaliada.

**Modificar:** [clientes-store.ts](file:///c:/LOPES/www/connect-ecommerce/stores/clientes-store.ts)
- Remover a dependência de `clientes_logged_in` como fonte de verdade (cookie fraco).
- Ajustar `INITIAL.isLoggedIn` para `false` e deixar o AuthContext ser a fonte de hidratação.
- Manter `logout()` limpando o state e, opcionalmente, chamar `POST /api/auth/logout` (via AuthContext ou direto no botão sair).

### 5) Pedido OrderLopes: preencher payload com cliente logado e hardening do endpoint

**Modificar:** [pedidos-store.ts](file:///c:/LOPES/www/connect-ecommerce/stores/pedidos-store.ts#L128-L236)
- Alterar `buildPedidoMockupFromCarrinho` para aceitar `loginData` e sobrescrever:
  - `payload.cliente.CPFCNPJ` = `meus_dados.cnpj` (ou `meus_dados.CPFCNPJ`)
  - `payload.cliente.email` = `meus_dados.email`
  - `payload.cliente.nome`/`fantasia` = `meus_dados.nome`/`fantasia`
  - `payload.cliente.fone` = `meus_dados.telefone`/`whatsapp`
  - Endereço: usar o primeiro de `enderecos[0]` (rua/numero/bairro/cep/municipio/uf)
- Manter o `orderId` default já existente como fallback.

**Modificar:** [CheckoutForm.tsx](file:///c:/LOPES/www/connect-ecommerce/app/(shop)/checkout/_components/CheckoutForm.tsx)
- Trocar `buildPedidoMockupFromCarrinho(items)` para `buildPedidoMockupFromCarrinho(items, loginData)`.
- Remover `console.log(pedido)`.

**Modificar:** [insert-dado-integration route](file:///c:/LOPES/www/connect-ecommerce/app/api/dev/insert-dado-integration/route.ts)
- Ignorar `idIntegradora` vindo do client e usar sempre o valor do `.env` (ex.: `IDINTEGRADORA`/`BACK_IDINTEGRADORA`) para evitar sobrescrita via request.

## Assunções (travadas pelo contexto)
- `GP_CLIENTE_INTEGRADO_TOKEN` está presente no `.env` e pode ser usado como segredo de assinatura.
- `verificarTokenSistema` sempre retorna `cnpjCliente` quando `success: true` (conforme exemplos fornecidos).
- `getClienteLoja` retorna `customerId` e isso é o `clienteId` esperado pelos endpoints do checkout/pedidos.

## Verificação (manual + diagnósticos)

1) **Diagnósticos TS**
- Checar erros de TypeScript após as mudanças (sem build/lint).

2) **Navegador — login**
- Acessar `/login`.
- Preencher email e enviar token (confirmar sucesso).
- Usar “Já tem token?” para abrir etapa de token sem envio.
- Testar token inválido → mensagem de erro e sem sessão.
- Testar token válido → redirect para `/cliente/painel`.

3) **Navegador — persistência**
- Recarregar `/cliente/painel` e navegar para `/cliente/meus-pedidos` sem relogar.
- Abrir nova aba e acessar `/cliente/painel` (deve funcionar pela sessão 7 dias).

4) **Navegador — pedido OrderLopes**
- Ir em `/checkout` e confirmar envio para `insertDadoIntegration (GP)`.
- Validar que o payload enviado contém `CPFCNPJ`/email/telefone/endereços do cliente logado (não o mock fixo).

