# Tasks — Dev (RAW) Produtos (liz_refator)

## Descoberta (Swagger)

1. Baixar `https://gp.lopesecia.com.br:9004/Servidor/v3/api-docs` para `./.trae/specs/liz-refator-dev-raw-produtos/api-docs-9004.json`.
2. Consultar via `swagger_query.py`:
   - listar tags e buscar por `webservice/integration`
   - detalhar os 4 endpoints alvo (método, parâmetros, auth)

## Backend (rotas dev RAW)

3. Criar rotas dev RAW de produtos (4 endpoints) retornando `{ request, data }`:
   - `getListCategoria`
   - `getCategoria`
   - `getProdutoLoja`
   - `getListProdutoLoja`
4. Padronizar montagem de URL e serialização de query.
5. Implementar opção com `Authorization` quando necessário (seguindo o padrão do tokenService já existente).

## Front (/dev)

6. Adicionar botões no `/dev` para chamar as 4 rotas RAW de produtos.
7. Garantir que `Back Request` e `Back Result` apareçam para essas rotas (usando `payload.request` e `payload.data`).

## Higiene / Segurança

8. Garantir que nada em `liz_refator/**` importe `lib/**` diretamente (usar adapters “espelho” quando necessário).
9. Verificar diagnósticos TypeScript.

