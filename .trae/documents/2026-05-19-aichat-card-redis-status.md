# Plano — Card Redis no AIChat (Contexto)

## Summary
Adicionar um novo card na aba **Contexto** do AIChat para checar, via backend, se existe dado no **Redis (read model)** relacionado à página atual (MVP: rota de Produto). O resultado deve abrir no painel direito já existente (JSON TreeView).

## Current State Analysis
- A aba **Contexto** é renderizada por [ContextoView.tsx](file:///c:/LOPES/www/connect-ecommerce/components/ai/views/ContextoView.tsx).
- O painel direito do AIChat já exibe JSON em TreeView via `@uiw/react-json-view` (em [FloatingAiChat.tsx](file:///c:/LOPES/www/connect-ecommerce/components/ai/FloatingAiChat.tsx)).
- A rota de Produto (PDP) popula o store `ia-store` com:
  - `contratoRaw` (payload bruto retornado por `loadProdutoBySlug`)
  - `contratoView` (view model via `toProdutoDetailViewModel`)
  - Implementado em [produto-client.tsx](file:///c:/LOPES/www/connect-ecommerce/app/(shop)/produtos/[...slug]/produto-client.tsx).<mccoremem id="01KS0HDRSZD1WZ5WEEEF4MSX4P" />
- Existe endpoint server-side que consulta Redis diretamente (JSON.GET):
  - `GET /api/catalog/produtos/by-id/[idProduto]`
  - Arquivo: [route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/catalog/produtos/by-id/%5BidProduto%5D/route.ts)
  - Retornos: `200 { success: true, data: ... }` ou `404 { success: false, message: ... }`

## Goal / Success Criteria
- Na aba **Contexto**, exibir um novo card (mesmo visual dos outros) com título **Redis**.
- O card deve ter um botão (decisão do usuário): **Checar Redis**.
- Ao clicar:
  - Se conseguir extrair `id` do `contratoRaw`, chamar `GET /api/catalog/produtos/by-id/:id`.
  - Abrir o painel direito (JSON) com o resultado, incluindo status e payload.
  - Se não houver `id` no contrato, abrir JSON com erro “id não disponível”.
- Sem depender do DOM para dados; usar somente contrato + endpoint.

## Proposed Changes
### 1) ContextoView: novo card “Redis”
Arquivo: [ContextoView.tsx](file:///c:/LOPES/www/connect-ecommerce/components/ai/views/ContextoView.tsx)
- Adicionar card abaixo de “Dados Dinamicos”:
  - Título: `Redis`
  - Botão: `Checar Redis`
- Implementar helpers locais minimalistas:
  - `asRecord(value)` e `asNumber(value)` para extrair `id` de `contratoRaw` com segurança.
- Handler do botão:
  - Montar `payloadBase` com `{ page, pathname }`.
  - Se `id` inválido: `openJson(JSON.stringify({ ...payloadBase, redis: { ok: false, error: "id não disponível" } }, null, 2))`
  - Se `id` válido:
    - `fetch(/api/catalog/produtos/by-id/${id})`
    - `const body = await response.json().catch(() => null)`
    - `openJson(JSON.stringify({ ...payloadBase, redis: { status: response.status, ok: response.ok, body } }, null, 2))`
- UX (MVP):
  - Estado local `redisLoading` para desabilitar botão durante a requisição e trocar texto para “Consultando…”.
  - Em caso de erro de rede/exceção: abrir JSON com `{ ok: false, error: <mensagem> }`.

### 2) (Opcional) Documentação de reaproveitamento
Arquivo sugerido:
- Atualizar [ai-chat-contrato-contexto.md](file:///c:/LOPES/www/connect-ecommerce/IA/COMPS/ai-chat-contrato-contexto.md) com um bloco “Checagem Redis por rota” (mesmo padrão de PDP).

## Assumptions & Decisions
- Escopo MVP: apenas PDP (rota `/produtos/[...slug]`), pois é a única que já popula contrato e tem `id` disponível.
- A checagem será feita via endpoint existente `/api/catalog/produtos/by-id/:id` (não criar endpoint novo).
- A apresentação do retorno será via JSON no painel direito (TreeView), conforme pedido.

## Verification
- Rodar `npm run lint` e confirmar 0 erros (warnings podem existir).
- Smoke manual (usuário): abrir PDP, abrir AIChat → Contexto → clicar “Checar Redis” e validar que o painel mostra `status` + `body`.

