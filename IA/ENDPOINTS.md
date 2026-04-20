# Endpoints do Projeto

Este documento lista os endpoints usados/expostos no projeto, com base nos clientes HTTP em `lib/api` e nas rotas do Next.js em `app/api`.

## Base URL

- Base: `/api`
- Cliente: `apiClient(endpoint)` concatena `'/api' + endpoint` ([client.ts](file:///c:/LOPES/www/connect-ecommerce/lib/api/client.ts#L1-L55))

## Variáveis de ambiente (.env)

Leitura e normalização em [config.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/config.ts#L1-L74).

| Chave | Exemplo | Uso |
|---|---|---|
| `AUTH_BASE_URL` | `https://gp.lopesecia.com.br:9002/ApiLopes/webservice/api` | Base para webservices de autenticação e para `tokenService` |
| `INTEGRATION_URL_API` | `https://gp.lopesecia.com.br:9004` | Base para webservices de integração (`/Servidor/webservice/...`) |
| `PRODUTO` | `"CONNECT"` | Campo `produto` ao gerar token no `tokenService` |
| `EAN` | `7890000002998` | Campo `ean` ao gerar token no `tokenService` |
| `IDINTEGRADORA` | `8` | Lido como `idIntegradora` (também aceita `ID_INTEGRADORA`) |
| `CODCLI` | `1219` | Lido como `codCli` (também aceita `COD_CLI`) |
| `KEY` | `ODtDT05ORUNUOzEyMTk=` | `chaveAtivacao` no cadastro (`postAutenteicaAplicativo`) |

Observações:
- URLs são normalizadas para remover `/` no final.
- Strings com aspas (ex.: `"CONNECT"`) são desaspadas.

## Auth

| Método | Path | Body | Retorno | Implementação |
|---|---|---|---|---|
| POST | `/api/auth/register` | `{ responsavel, cnpj, email, whatsapp }` | `{ success, data }` | [route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/auth/register/route.ts#L8-L94) |
| POST | `/api/auth/send-token` | `{ email?, whatsapp? }` (um dos dois) | `{ success, data }` | [route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/auth/send-token/route.ts#L8-L89) |
| POST | `/api/auth/verify-token` | `{ token }` | `{ success, data: { verification, operador } }` | [route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/auth/verify-token/route.ts#L9-L141) |
| POST | `/api/auth/logout` | — | `{ success }` | [route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/auth/logout/route.ts#L1-L25) |
| GET | `/api/auth/me` | — | `{ success, data: session }` ou `401` | [route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/auth/me/route.ts#L1-L38) |

Clientes (consumo no front):
- [registerUser](file:///c:/LOPES/www/connect-ecommerce/lib/api/auth.ts#L12-L19)
- [sendLoginToken](file:///c:/LOPES/www/connect-ecommerce/lib/api/auth.ts#L21-L28)
- [verifyLoginToken](file:///c:/LOPES/www/connect-ecommerce/lib/api/auth.ts#L30-L40)
- [logout](file:///c:/LOPES/www/connect-ecommerce/lib/api/auth.ts#L42-L46)
- [getCurrentSession](file:///c:/LOPES/www/connect-ecommerce/lib/api/auth.ts#L48-L52)

### Sessão (cookie)

- Cookie: `session`
- Formato: JSON em claro (httpOnly) com shape `Session`:
  - `{ userId: string; email: string; token: string; name?: string }` ([session.ts](file:///c:/LOPES/www/connect-ecommerce/lib/auth/session.ts#L1-L42))
- Escrita: no `POST /api/auth/verify-token`, após validar token e obter operador ([verify-token route](file:///c:/LOPES/www/connect-ecommerce/app/api/auth/verify-token/route.ts#L114-L119))
- Proteção: middleware redireciona `/dashboard/*` para `/login` se não houver cookie `session` ([middleware.ts](file:///c:/LOPES/www/connect-ecommerce/middleware.ts#L1-L18))

### Endpoints externos de autenticação (AUTH_BASE_URL)

Chamados pelo backend (`app/api/auth/*`) com `Authorization: <token-cru>` obtido via `tokenService`.

| Método | URL (relativa a AUTH_BASE_URL) | Query/Body | Header | Observações |
|---|---|---|---|---|
| POST | `/tokenService` | Body: `{ produto, ean, idIntegradora, codCli }` | `Content-Type: application/json` | Geração do token do integrador ([authService.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/authService.ts#L79-L107)) |
| POST | `/tokenService` | Body: `{ refreshToken }` | `Content-Type: application/json` | Refresh do token ([authService.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/authService.ts#L109-L140)) |
| POST | `/postAutenteicaAplicativo` | Body: `{ chaveAtivacao, responsavel, cnpj, email, whatsapp }` | `Content-Type: application/json`, `Authorization` | Cadastro ([register route](file:///c:/LOPES/www/connect-ecommerce/app/api/auth/register/route.ts#L37-L60)) |
| POST | `/enviarToken` | Query: `email=...` ou `whatsapp=...` | `Authorization` | Envia token de login ([send-token route](file:///c:/LOPES/www/connect-ecommerce/app/api/auth/send-token/route.ts#L33-L55)) |
| POST | `/verificarTokenSistema` | Query: `token=...` | `Authorization` | Valida token de login ([verify-token route](file:///c:/LOPES/www/connect-ecommerce/app/api/auth/verify-token/route.ts#L56-L68)) |
| GET | `/getOperadorSistemaForId` | Query: `id=...` | `Authorization` | Carrega operador autenticado ([verify-token route](file:///c:/LOPES/www/connect-ecommerce/app/api/auth/verify-token/route.ts#L85-L97)) |

Formato do header:
- `Authorization` recebe o token “cru” (se vier com prefixo `Bearer `, ele é removido) ([token.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/token.ts#L1-L11))

Response esperada de `/tokenService` (mínimo validado pelo app):
- `{ hashToken: string; dtExpira: string; refreshToken?: string; ... }` ([integration.ts](file:///c:/LOPES/www/connect-ecommerce/lib/types/integration.ts#L1-L6))

## Produtos

| Método | Path | Query | Retorno | Implementação |
|---|---|---|---|---|
| GET | `/api/products` | `idIntegradora?: number` | `{ success, data, total }` | [route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/products/route.ts#L1-L48) |
| GET | `/api/products/:codProd` | `idIntegradora?: number` | `{ success, data }` | [route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/products/%5BcodProd%5D/route.ts#L1-L65) |

Clientes (consumo no front):
- [getProducts](file:///c:/LOPES/www/connect-ecommerce/lib/api/products.ts#L15-L28)
- [getProductById](file:///c:/LOPES/www/connect-ecommerce/lib/api/products.ts#L30-L47)

### Endpoints externos de integração (INTEGRATION_URL_API)

Chamados server-to-server via `businessGet`, sempre com `Authorization: <token-cru>` obtido pelo `tokenService`.

| Método | URL (relativa a INTEGRATION_URL_API) | Query | Header | Onde é usado |
|---|---|---|---|---|
| GET | `/Servidor/webservice/integration/getIntegradora` | `id=<idIntegradora>` | `Authorization` | Boot da integração (carrega config) ([authService.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/authService.ts#L142-L165)) |
| GET | `/Servidor/webservice/integration/getListProdutoLoja` | `idIntegradora=<id>` | `Authorization` | Lista produtos ([productsService.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/productsService.ts#L66-L74)) |
| GET | `/Servidor/webservice/integration/getProdutoLoja` | `idIntegradora=<id>&codProd=<codProd>` | `Authorization` | Detalhe de produto ([productsService.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/productsService.ts#L76-L88)) |

Payloads esperados (tolerantes):
- Lista pode vir como array direto ou dentro de `data|produtos|products|lista|itens` ([productsService.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/productsService.ts#L22-L42))
- Item pode vir como objeto direto ou dentro de `data|produto|product|item` ([productsService.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/productsService.ts#L44-L64))

Shape do `Product` (campos principais):
- Tipagem em [product.ts](file:///c:/LOPES/www/connect-ecommerce/lib/types/product.ts#L13-L54) (ex.: `codProd`, `idIntegradora`, `descricaoEcomerce`, `preco`, `qtEstoque`, `imagem`, `imagens`, `categoria`, `departamento`, etc.)

## Guia para mock do back-end (contrato)

Para mockar o back-end sem depender dos serviços externos, implemente endpoints que reproduzam:
- Os endpoints internos do app (tabelas acima), mantendo `success`, `message` e códigos HTTP iguais.
- Os endpoints externos (AUTH_BASE_URL e INTEGRATION_URL_API) com os mesmos paths/queries/bodies e exigência de `Authorization`.

Pontos críticos de autenticação/token:
- Existem dois “tokens” no projeto:
  - Token do integrador (usado server-to-server em `Authorization` para `INTEGRATION_URL_API` e `AUTH_BASE_URL`).
  - Token da sessão do usuário (campo `token` dentro do cookie `session`, setado no `verify-token`).
- `Authorization` do integrador é enviado sem prefixo `Bearer`.
