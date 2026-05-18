# Relatório — Situação geral do projeto (connect-ecommerce)

## Objetivo
[Definir objetivo do relatório: ex. status para tomada de decisão e priorização de correções.]

## Escopo (o que está incluído / excluído)
- Incluído: front (Next.js), rotas BFF (`/api`), integrações (Redis/ERP), fluxo de categorias e PLP.
- Excluído: custos, métricas de negócio e SLAs externos (não avaliados neste snapshot).

## Snapshot técnico (alto nível)
- Stack: Next.js (App Router) + React + TypeScript + Tailwind + shadcn/ui.
- Integrações: Redis Stack (RedisJSON + RediSearch) para catálogo e integração externa (“Lopes/GP”) via HTTP.
- Deploy/CI: GitHub Actions com lint/build e deploy via SSH/PM2.

## Mapa de rotas e módulos (resumo)
- Loja: `/`, `/categorias`, `/categoria/[...slug]`, `/produtos/[...slug]`, `/cart`, `/checkout`.
- Auth: `/login`, `/register` + endpoints em `/api/auth/*`.
- BFF: `/api/catalog/*`, `/api/catalog/produtos/*`, `/api/lopes/*`, `/api/produtos/*`, `/api/checkout/*`, `/api/pedidos/*`.

## Saúde do projeto (pontos fortes e alertas)
### Pontos fortes
- TypeScript em modo estrito, lint/build no pipeline de deploy.
- Camada de retry/backoff em integrações HTTP.

### Alertas / riscos
- Duplicidade de superfícies de API (ex.: `/api/catalog/products` vs `/api/catalog/produtos/*`).
- Catálogo Redis com operações baseadas em SCAN em alguns fluxos (risco de latência conforme volume).
- Cobertura de testes automatizados aparentemente ausente (risco de regressão em correções críticas).

## Incidente/bug em foco: “Categorias não está funcionando”
### Sintoma (a confirmar)
[Descrever o sintoma observado: lista vazia, erro 500, categoria abre sem produtos, slug não resolve, etc.]

### Fluxo esperado (referência de implementação)
- Listagem de categorias: UI chama `loadCategoriasTree()` → `getCategoriasTree()` → endpoint definido por `produtosBasePath()`:
  - [categorias/page.tsx](file:///c:/LOPES/www/connect-ecommerce/app/(shop)/categorias/page.tsx)
  - [produtos-store.ts](file:///c:/LOPES/www/connect-ecommerce/stores/produtos-store.ts)
  - [produtos.ts](file:///c:/LOPES/www/connect-ecommerce/lib/api/produtos.ts)

### Hipóteses mais prováveis (por evidência no código)
1) Inconsistência de fonte: categorias vêm de uma fonte (env) mas a PLP sempre busca produtos no Redis (`/api/catalog/products`), o que quebra quando o Redis não está populado/saudável:
   - [categoria/[...slug]/page.tsx](file:///c:/LOPES/www/connect-ecommerce/app/(shop)/categoria/[...slug]/page.tsx)
2) Misconfig de env: ausência/erro em `NEXT_PUBLIC_FONTE` / `NEXT_PUBLIC_CATALOGO_FONTE` faz cair no default `/produtos` e depender de token/integração externa:
   - [layout.tsx](file:///c:/LOPES/www/connect-ecommerce/app/layout.tsx)
   - [produtos.ts](file:///c:/LOPES/www/connect-ecommerce/lib/api/produtos.ts)
3) “source” passado para `loadCategoriasTree` não troca a fonte de verdade (param existe, mas a store não usa para escolher endpoint):
   - [produtos-store.ts](file:///c:/LOPES/www/connect-ecommerce/stores/produtos-store.ts)
4) Redis sem chaves/índice/módulos exigidos (RediSearch/RedisJSON), resultando em vazio/erro:
   - [catalogService.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/catalogService.ts)
   - [catalogRedis.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/catalogRedis.ts)

### Rotas a validar (conforme fonte)
- Integração: `GET /api/produtos/categorias`
  - [produtos/categorias/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/produtos/categorias/route.ts)
- Lopes (mockup): `GET /api/lopes/produtos/categorias`
  - [lopes/produtos/categorias/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/lopes/produtos/categorias/route.ts)
- Redis (catálogo): `GET /api/catalog/produtos/categorias`
  - [catalog/produtos/categorias/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/catalog/produtos/categorias/route.ts)

## Recomendações priorizadas (para correção segura)
### P0 — desbloqueio rápido (diagnóstico determinístico)
- Confirmar fonte efetiva (`data-fonte` no HTML) e envs `NEXT_PUBLIC_FONTE`, `NEXT_PUBLIC_CATALOGO_FONTE`.
- Validar saúde do Redis (módulos e índices) quando `redis` for esperado.
- Registrar (sem segredos) erros de API e status code retornado por `/api/*/categorias`.

### P1 — correção estrutural
- Unificar a escolha da fonte entre “resolver categoria” e “carregar produtos”, evitando mistura de fontes no mesmo fluxo.
- Reduzir duplicidade de rotas e definir um contrato canônico para catálogo (produtos/categorias/marcas).

## Pendências para fechar este relatório
- [ ] Público-alvo e objetivo do relatório (execução/gestão/tech).
- [ ] Sintoma exato e evidência (print do erro, response, log do servidor).
- [ ] Fonte esperada (redis vs integração vs lopes) no ambiente afetado.
