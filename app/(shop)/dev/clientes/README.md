# Dev — Clientes (padrão de card)

Esta página é um “motor de testes” para endpoints do back relacionados a **clientes**.

O padrão é um card por endpoint, sempre com 3 blocos:

1) **End-point**: path do back (ex.: `/webservice/api/enviarToken`)
2) **JSON Request**: inputs + preview do JSON que será enviado (query/body conforme o handler)
3) **JSON Response**: preview do retorno da última execução

## Fonte dos endpoints

Os endpoints do back devem vir de constantes tipadas em:

- [integrationRoutes.ts](file:///c:/LOPES/www/connect-ecommerce/liz_refator/integration/integrationRoutes.ts)
  - `CLIENTES_API_ROUTES.enviarToken`
  - `CLIENTES_API_ROUTES.verificarToken`

## Onde fica a implementação

- UI/página: [clientes/page.tsx](file:///c:/LOPES/www/connect-ecommerce/app/(shop)/dev/clientes/page.tsx)

## Como adicionar um novo card

1) Garanta que existe uma chave nova em `CLIENTES_API_ROUTES` (somente o path do back).
2) Na página `clientes/page.tsx`:
   - Crie/estenda o estado de parâmetros necessários (ex.: `useState`).
   - Gere a URL do handler “raw dev” com `buildQueryString(...)`.
   - Monte o objeto do card dentro do array `cards`:
     - `endpoint`: use o path do `CLIENTES_API_ROUTES`
     - `request`: objeto serializável que representa os parâmetros atuais
     - `requestUi`: inputs que editam esse request (fica dentro do bloco “JSON Request”)
     - `response`: guarde o último payload retornado para esse card
     - `onRun`: chama `callApi(url, init)` e salva a resposta no estado

## Regras práticas

- Inputs ficam dentro do bloco **JSON Request** do próprio card.
- O preview do JSON sempre mostra exatamente o que será enviado no request.
- O bloco **JSON Response** mostra o payload retornado da última execução daquele endpoint.

