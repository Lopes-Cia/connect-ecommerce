Esse projeto esta usando uma logica para requisicoes no back-end , horrivel quero refatorar

1 tarefa que tenho , é uma analize de todos arquivos envolvidos , e esse analize tem que servir de um mapa para a refatoracao, insira na chave mapa

## MAPA

### 1) Camada de consumo no Front-end (browser -> `/api`)

- `lib/api/client.ts`
  - Cliente HTTP genérico do front para chamar rotas internas (`/api/*`).
  - Define `ApiError`, parse de JSON e tratamento básico de erro.
- `lib/api/auth.ts`
  - Encapsula chamadas de autenticação para:
  - `POST /api/auth/register`
  - `POST /api/auth/send-token`
  - `POST /api/auth/verify-token`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
- `lib/api/products.ts`
  - Encapsula chamadas de produto:
  - `GET /api/products`
  - `GET /api/products/[codProd]`
- `contexts/AuthContext.tsx`
  - Fluxo de sessão via `getCurrentSession()` e `logout()`.
- `app/(auth)/login/_components/LoginForm.tsx`
  - Chama `sendLoginToken()` e `verifyLoginToken()`.
- `app/(auth)/register/_components/RegisterForm.tsx`
  - Chama `registerUser()`.
- `app/(shop)/page.tsx` e `app/(shop)/products/page.tsx`
  - Chamam `getProducts()`.

### 2) Camada de API interna Next.js (`app/api/*`)

- `app/api/auth/send-token/route.ts`
  - Valida payload de entrada.
  - Monta URL externa de auth (`enviarToken`).
  - Usa `ensureAuthReady()` + `fetchWithRetry()`.
- `app/api/auth/verify-token/route.ts`
  - Valida token recebido.
  - Chama serviços externos `verificarTokenSistema` e `getOperadorSistemaForId`.
  - Persiste sessão com `setSession()`.
- `app/api/auth/register/route.ts`
  - Cadastra usuário externo (`postAutenteicaAplicativo`).
  - Usa `getActivationKey()`.
- `app/api/auth/me/route.ts`
  - Lê sessão com `getSession()`.
- `app/api/auth/logout/route.ts`
  - Limpa sessão com `clearSession()`.
- `app/api/products/route.ts`
  - Lista produtos integrados via `getIntegratedProducts()`.
- `app/api/products/[codProd]/route.ts`
  - Detalhe de produto via `getIntegratedProductByCode()`.

### 3) Núcleo HTTP de integração externa (server-only)

- `lib/integration/httpClient.ts`
  - Wrapper principal para chamadas de negócio externas.
  - Funções:
  - `businessRequest()`
  - `businessGet()`
  - Responsabilidades:
  - Montar URL (`path + query`)
  - Injetar header `Authorization`
  - Serializar body JSON
  - Retentar em 401/403 após refresh de token
- `lib/integration/network.ts`
  - Infra HTTP base:
  - `fetchWithRetry()`
  - `readResponseData()`
  - `HttpError`
  - Retry com backoff exponencial.
- `lib/integration/authService.ts`
  - Orquestra ciclo de autenticação da integração:
  - Boot inicial (`requestTokenByProduct`, `requestIntegrationConfig`)
  - Refresh de token
  - Locks (`bootPromise`, `refreshPromise`)
  - Exposição principal: `ensureAuthReady()`
- `lib/integration/productsService.ts`
  - Casos de uso de produto:
  - `getIntegratedProducts()`
  - `getIntegratedProductByCode()`
  - Usa `businessGet()` e parseia payload externo.
- `lib/integration/config.ts`
  - Leitura e cache das variáveis de ambiente para integração.
  - Fonte dessas variáveis no projeto: `.env` (não versionar valores sensíveis).
  - Variáveis lidas (chaves): `AUTH_BASE_URL`, `INTEGRATION_URL_API`, `PRODUTO`, `EAN`, `ID_INTEGRADORA/IDINTEGRADORA`, `COD_CLI/CODCLI`, `KEY`.
- `lib/integration/state.ts`
  - Estado global em memória do servidor para token/config.
- `lib/integration/token.ts`
  - Normalização de token (`Bearer`).
- `lib/integration/logger.ts`
  - Log estruturado do fluxo de integração.
- `lib/auth/externalApi.ts`
  - Ponte de config para auth externo:
  - `getAuthWebserviceBaseUrl()`
  - `getActivationKey()`

### 4) Tipos que sustentam o fluxo

- `lib/types/integration.ts`
  - Contratos de `TokenResponse`, `AuthStateBundle`, etc.
- `lib/types/auth.ts`
  - Contratos de payload/response de autenticação.
- `lib/types/product.ts`
  - Contratos de produto usados na API e UI.

### 5) Fluxos ponta-a-ponta atuais

- Fluxo de login por token:
  - `LoginForm.tsx` -> `lib/api/auth.ts` -> `POST /api/auth/send-token` -> serviço externo.
  - `LoginForm.tsx` -> `lib/api/auth.ts` -> `POST /api/auth/verify-token` -> serviços externos -> `setSession()`.
- Fluxo de cadastro:
  - `RegisterForm.tsx` -> `lib/api/auth.ts` -> `POST /api/auth/register` -> serviço externo.
- Fluxo de catálogo:
  - `page.tsx`/`products/page.tsx` -> `lib/api/products.ts` -> `/api/products` -> `productsService` -> `businessGet()` -> serviço externo.

### 6) Pontos críticos para refatoração HTTP

- Duplicação de lógica de resposta/erro nas rotas `app/api/*`.
- Construção manual de URLs e headers em várias rotas.
- Parse de payload externo espalhado e inconsistente por endpoint.
- Acoplamento de regras de autenticação HTTP com casos de uso de domínio.
- Estado de autenticação em `globalThis` (risco em cenários multi-instância/serverless).
- Ausência de contrato único para erros (cada rota monta shape próprio).

### 7) Mapa de refatoração (ordem sugerida)

- Fase A: padronizar contrato HTTP interno.
  - Criar utilitário único de resposta de sucesso/erro para `app/api/*`.
- Fase B: centralizar cliente externo.
  - Consolidar montagem de URL, headers, retry e parse em um único gateway.
- Fase C: separar autenticação de transporte.
  - Isolar `token lifecycle` em módulo próprio e injetar no gateway HTTP.
- Fase D: padronizar serviços de domínio.
  - `productsService` e `auth routes` consumindo interfaces, não detalhes de `fetch`.
- Fase E: cobertura mínima de testes.
  - Testes de contrato das rotas e testes de unidade do gateway/retry/parse.

### 8) Arquivos-alvo prioritários para começar

- `lib/integration/httpClient.ts`
- `lib/integration/network.ts`
- `lib/integration/authService.ts`
- `app/api/auth/send-token/route.ts`
- `app/api/auth/verify-token/route.ts`
- `app/api/auth/register/route.ts`
- `app/api/products/route.ts`
- `app/api/products/[codProd]/route.ts`




## minha visao


eu quero criar um serviço para consumir a API, me sujere um bom lugar para salvar ele e um bom nome

essas varias camadas , interna externa , é confuso e nem necessario

vamos começar fazendo apenas pelo token , euq quero que o serviço gere o token de autenticação, tenha os  recursos ja disponiveis no mapa 

quero testar a geração do token, diretamente no front, criando um botao no menu do header, TEST API, que gere o token e mostre o resultado em console.log("token", RESPONSE)