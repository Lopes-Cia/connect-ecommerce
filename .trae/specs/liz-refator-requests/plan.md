# Plano — Refatoração isolada das requisições no servidor

## Objetivo

Refatorar com segurança como o projeto executa requisições **no servidor** (Route Handlers do Next.js e camada `lib/integration/**`), de forma **incremental e isolada**, usando uma nova pasta na raiz: `liz_refator/`.

Antes de iniciar a refatoração, produzir documentação clara do fluxo:

- Front → Back (browser/client → BFF `/api/*`)
- Back → Back (BFF → serviços externos)
- Back → Front (respostas/erros do BFF para o client)

## Premissas e restrições

- Alterações devem ser isoladas em `liz_refator/` e adotadas gradualmente (migração por rota).
- Não introduzir “fallback” que mascare erro. Se for necessário algum comportamento de compatibilidade, precisa ser explicitado e aprovado antes.
- Não reorganizar `.env` nem alterar a forma manual do arquivo.
- Validação mínima: manter foco em diagnósticos/TypeScript (sem rodar build/lint/test completo, a menos que solicitado).

## Estado atual (mapa rápido)

- Front chama o BFF via `fetch("/api" + endpoint)` por [apiClient](file:///c:/LOPES/www/connect-ecommerce/lib/api/client.ts).
- Route Handlers vivem em `app/api/**/route.ts` e delegam para `lib/integration/**`.
- Back → Back usa `fetchWithRetry` + `readResponseData` + `HttpError` em [network.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/network.ts) e wrappers em [httpClient.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/httpClient.ts).
- Auth server-side tem duas trilhas: “business” (bundle completo) e “auth webservice” (token separado) via [authWebserviceClient.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/authWebserviceClient.ts).

## Invariantes (não pode mudar durante a migração)

- **Contrato Back → Front**
  - Preservar `status` HTTP e o shape de resposta já esperado pelo client para cada rota.
  - Erros devem ser consistentes e não podem vazar dados sensíveis do upstream.
- **Retry**
  - Manter a semântica atual: retry apenas quando `fetch(...)` lançar erro de rede (não por `5xx/429`) e com backoff.
  - Nunca aplicar retry automático para `POST/PUT/DELETE` sem uma regra explícita e idempotente.
- **Cache**
  - Manter `cache: 'no-store'` nas chamadas server-side, equivalente ao comportamento atual em [fetchWithRetry](file:///c:/LOPES/www/connect-ecommerce/lib/integration/network.ts#L79-L114).
- **Auth/Refresh**
  - Token de integração (tokenService) é cacheado em memória, validado por `dtExpira` e regenerado quando necessário.
  - Cache em memória é otimização, não garantia (ambiente serverless).
- **Runtime**
  - `liz_refator/integration` deve ser Node-only e sempre `server-only`.
- **Timeout**
  - Introduzir timeout apenas após a rota piloto, como melhoria controlada (sem alterar contratos na etapa inicial).

## Estratégia de refatoração isolada (proposta)

1) Criar uma camada nova em `liz_refator/integration/` com:

- `transport/fetchJson` (responsável por `fetch`, parse e erro padronizado)
- `transport/retryPolicy` (regras explícitas de retry)
- `errors/HttpError` (shape único)
- `integration/auth` (injeção de Authorization e refresh, isolando o comportamento atual)
- `integration/url` (montagem de URLs e normalização em um único lugar)

2) Primeira iteração: implementar essa camada como **facade compatível**, reaproveitando (delegando) o que já existe em `lib/integration/**` para reduzir risco.

3) Migração por rota:

- Escolher 1 rota “read-only” e com baixo acoplamento (ex.: catálogo GET) para migrar para `liz_refator/`.
- Validar comportamento (status/shape) e diagnósticos TypeScript.
- Repetir para próximos grupos (catálogo → clientes → carrinho → checkout → pedidos).

4) Segunda iteração: com migração em andamento, mover lógica hoje “espalhada” (ex.: parse + erro + refresh) para a nova camada e reduzir dependência do legado.

## Simplificações (para reduzir risco e superfície)

- Na 1ª iteração, evitar fragmentar demais a camada nova. Preferir iniciar com poucos módulos e extrair `auth/url` apenas quando 2+ rotas precisarem.
- A facade compatível deve delegar explicitamente para utilitários existentes (ex.: `fetchWithRetry`, `readResponseData`, `HttpError`, `businessRequest`) para reduzir drift de comportamento.

## Documentação (entregáveis)

Criar em `liz_refator/`:

- `FLUXO-REQUISICOES.md`
  - Diagrama textual e exemplos de payload
  - Front → Back: `apiClient` / stores → `/api/*`
  - Back → Back: `Route Handler` → `lib/integration/*` (hoje) e → `liz_refator/*` (alvo)
  - Back → Front: padrões de status, shape `{ success, data, message }`, erros `HttpError` vs erros inesperados
- `MAPA-DE-ROTAS.md`
  - Inventário por domínio (auth, clientes, carrinho, checkout, pedidos, produtos, lopes, dev)
  - Para cada domínio: rota → service/client chamado → envs relevantes
- `ESTRATEGIA-MIGRACAO.md`
  - Regras de adoção (como migrar uma rota)
  - Checklist de validação mínima (status/shape/erros/diagnósticos TS)

## Passos de execução (após aprovação do plano)

1) Escrever os 3 documentos em `liz_refator/` com referências aos arquivos reais do projeto.
2) Criar `liz_refator/integration/` com a primeira versão (facade compatível).
3) Migrar 1 rota piloto para usar a nova camada, sem alterar comportamento.
4) Rodar diagnósticos TypeScript e corrigir eventuais erros.
5) Documentar “como migrar a próxima rota” com um padrão replicável.

## Checklist por rota migrada

- **Contrato**: status e shape preservados; `success/data/message` conforme comportamento atual.
- **Erros**: upstream (`HttpError`) vs inesperado (`500`) diferenciados e sem vazamento de payload sensível.
- **Retry/cache**: semântica igual ao legado; `no-store`.
- **Auth**: comportamento de refresh em `401/403` preservado; concorrência não quebra.
- **Runtime**: `server-only`; sem dependências incompatíveis com a rota.
- **Observabilidade mínima**: logs com `url/status/tentativa` e, se aplicável, `correlation-id`.
- **Diagnósticos**: sem erros TypeScript/diagnósticos relevantes.

## Critérios de aceite

- Documentação em `liz_refator/` explica claramente os três fluxos (Front→Back, Back→Back, Back→Front).
- Existe uma camada nova, isolada, que permite migrar rota a rota.
- Pelo menos 1 rota está migrada e funcionando com o mesmo contrato (shape/status).
- Projeto permanece sem erros de TypeScript/diagnósticos relevantes após a migração piloto.
