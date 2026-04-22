# Spec — Dev (RAW) Produtos (liz_refator)

## Objetivo

Adicionar no ambiente de teste **/dev** um conjunto de botões para executar **chamadas RAW** (diretas) ao backend de integração de **produtos**, exibindo:

- **Back Request** (URL final + método + headers relevantes + query/body quando existir)
- **Back Result** (payload retornado pelo backend, ou erro normalizado)

“RAW” aqui significa **não passar pela camada BFF do app (rotas `app/api/...` de produção), nem por store/cache**, e sim executar a chamada diretamente no backend alvo (ex.: `gp:9004/Servidor/...`) a partir de uma rota dev.

## Escopo

### Entradas (botões)

Incluir botões RAW para os endpoints de produtos equivalentes aos que já existem no legado em `LOPES_BACK_ROUTES`:

- `getListCategoria`
- `getCategoria`
- `getProdutoLoja`
- `getListProdutoLoja`

E manter os botões já existentes de **tokenService** (generate e raw generate).

### Saídas (UI)

Na página `/dev`:

- Lista de botões (um por chamada RAW)
- Exibição consistente de:
  - `payload.request` quando existir
  - `payload.data` quando existir; senão `payload` inteiro

## Regras / Restrições

- Não importar direto de `lib/**` dentro da nova camada. Quando necessário, criar “espelhos”/adapters dentro de `liz_refator/**` e importar por eles.
- Não reintroduzir refresh do token: somente geração, e chamadas RAW de produtos.
- Não adicionar “botões genéricos” soltos; os botões devem corresponder às chamadas RAW de produtos.

## Design técnico (alto nível)

1) Criar novas rotas dev específicas para produtos RAW (ex.: `app/api/dev/liz-refator/raw/produtos/.../route.ts`), cada uma:

- Monta URL final para o backend de integração (base + path + query)
- Executa `fetch`/`fetchWithRetry`
- (Opcional) Inclui `Authorization` quando exigido pelo backend
- Retorna JSON no formato:

```json
{
  "request": { "url": "...", "method": "...", "headers": { "Accept": "...", "Authorization": "..." }, "query": { ... } },
  "data": { ... }
}
```

2) Na UI (`app/(shop)/dev/page.tsx`), adicionar ações que chamam essas rotas dev e renderizam `Back Request` e `Back Result`.

## Swagger (fonte de verdade)

Usar o OpenAPI do backend “Servidor” para confirmar:

- paths exatos
- parâmetros aceitos (query/body)
- necessidade de `Authorization`

Fonte: `https://gp.lopesecia.com.br:9004/Servidor/v3/api-docs`

Artefato local (para consulta via ferramenta): salvar uma cópia do JSON dentro do spec e consultar via `swagger_query.py`.

## Critérios de aceite

- `/dev` exibe botões RAW de produtos (4 chamadas) + botões de tokenService já existentes.
- Ao clicar em qualquer botão RAW de produtos, o resultado mostra `Back Request` completo (incluindo URL final) e `Back Result`.
- Nenhum arquivo novo na camada `liz_refator/**` importa diretamente de `lib/**` (somente via adapters dentro de `liz_refator/**`).
- Sem erros de TypeScript (diagnósticos limpos).

