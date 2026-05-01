# Padrão — Dev/Testes de Endpoints (RAW)

Este documento descreve o padrão usado no projeto para testar endpoints do back via páginas de DEV, sem ficar procurando em múltiplos arquivos.

## Objetivo

- Ter uma UI simples para disparar chamadas **server-to-server** (via handlers `app/api/dev/**`) e visualizar:
  - End-point (path do back)
  - JSON Request (inputs + preview do payload)
  - JSON Response (último retorno)

## Arquitetura (camadas)

1) **UI (Client Component)**
   - Exemplo: `app/(shop)/dev/clientes/page.tsx`
   - Faz `fetch()` apenas para endpoints locais do Next (`/api/dev/...`).

2) **Handler DEV (Next Route Handler)**
   - Exemplo: `app/api/dev/liz-refator/raw/**/route.ts`
   - Executa a chamada **server-to-server** para o back (integração/auth) e retorna JSON para a UI.

3) **Client de integração**
   - Exemplo: `liz_refator/integration/rawClient.ts`
   - Centraliza:
     - Montagem de URL
     - Injeção de `idIntegradora` via `.env` (quando aplicável)
     - Uso de `Authorization` no server

## Onde ficam as rotas (paths do back)

- Constantes tipadas: `liz_refator/integration/integrationRoutes.ts`
  - `CLIENTES_API_ROUTES.*`
  - `PRODUTOS_INTEGRATION_ROUTES.*`

Regra prática: **a constante guarda apenas o path do back** (não é URL completa).

## Contrato de resposta do DEV (padrão)

### Sucesso (padrão)

```json
{
  "success": true,
  "request": {
    "url": "https://.../Servidor/webservice/...",
    "method": "GET|POST",
    "headers": { "Accept": "application/json", "Authorization": "<redacted>" },
    "query": { }
  },
  "data": "..."
}
```

### Erro (padrão)

```json
{
  "success": false,
  "message": "Integration request failed",
  "request": { "...": "..." },
  "data": { "...": "..." }
}
```

## Regras importantes

- `idIntegradora`:
  - Deve vir **somente do `.env`** no server.
  - Nunca expor input de `idIntegradora` na UI.
  - Query do client não pode sobrescrever valor do env.

- Segurança:
  - Nunca retornar `Authorization` real no JSON para o browser.
  - Padrão do projeto: redigir com `"<redacted>"` antes de responder.

- POST retornando `"true"`:
  - Alguns endpoints de POST podem retornar string `"true"` como sucesso.
  - O contrato deve aceitar `true` e `"true"` (idem para `false`).

## Padrão do Card na UI (3 blocos)

Cada card possui:

1) **End-point**
   - Mostra o path do back (ex.: `/Servidor/webservice/integration/getClienteLoja`).

2) **JSON Request**
   - Inputs para editar o request (query/body).
   - Preview do JSON que será enviado (o “contrato” do request daquela ação).

3) **JSON Response**
   - Preview do último payload retornado pelo handler.

## Como adicionar um novo endpoint (checklist rápido)

1) Adicionar o path no `integrationRoutes.ts` (`CLIENTES_API_ROUTES` ou `PRODUTOS_INTEGRATION_ROUTES`).
2) Criar o handler dev em `app/api/dev/liz-refator/raw/<dominio>/<acao>/route.ts`.
3) No handler:
   - Validar query/body mínimo
   - Forçar `idIntegradora` via env (quando aplicável)
   - Retornar `{success, request(redigido), data}`
4) Adicionar o card na UI (`app/(shop)/dev/<dominio>/page.tsx`).
5) Se o retorno do back variar (ex.: `"true"`), ajustar/registrar contrato de parsing.

## Referências locais

- Página DEV (clientes): `app/(shop)/dev/clientes/page.tsx`
- README da página DEV (clientes): `app/(shop)/dev/clientes/README.md`

