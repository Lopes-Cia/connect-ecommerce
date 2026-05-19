# AIChat — Contexto via contrato (MVP)

## Objetivo
O card **Contexto → Dados Dinamicos → Ver JSON** deve exibir os dados do “contrato” (payload bruto) e também o view model calculado na rota atual.

## Checagem Redis (read model)
No card **Contexto → Redis**, usar o `id` do `contratoRaw` para consultar o endpoint:
- `GET /api/catalog/produtos/by-id/:id`

E abrir o retorno no painel JSON do AIChat (TreeView), incluindo `status`/`ok` e o `body`.

## Fonte única
- Store: `stores/ia-store.ts`
  - `contratoRaw: unknown | null`
  - `contratoView: unknown | null`
  - `setContratoData({ raw, view })`

## Como uma rota alimenta o contrato
Em cada rota (Client Component), após obter os dados (API/store), chamar:

- `setContratoData({ raw: <payload bruto>, view: <view model> })`

E no `cleanup` do `useEffect`, limpar:

- `setContratoData({ raw: null, view: null })`

## Implementado agora
- Produto: `app/(shop)/produtos/[...slug]/produto-client.tsx`
  - `raw` = retorno de `loadProdutoBySlug`
  - `view` = `toProdutoDetailViewModel(raw, ...)`

## Próximas rotas (padrão a reaproveitar)
- Categoria: usar o retorno bruto da busca de produtos/categoria como `raw` e, se existir, o view model correspondente como `view`.
- Home: usar o payload bruto do catálogo/home como `raw` e o view model/coleções como `view`.
