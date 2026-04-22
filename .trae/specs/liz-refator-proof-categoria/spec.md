# Revisão e Prova de Fluxo (Categoria) — Spec

## Why

Os documentos de fluxo e mapa de rotas precisam estar consistentes, completos e não ambíguos, para permitir uma refatoração segura e isolada das requisições server-side. A página de categoria (`/categoria/[...slug]`) é um caso real que atravessa todo o caminho Front → Back → Back → Front e serve como prova.

## What Changes

- Revisar cuidadosamente a documentação existente em `liz_refator/` para:
  - remover contradições
  - fechar gaps de informação
  - evitar trechos “compactados demais” que dificultem o entendimento
- Criar uma “prova” do fluxo usando um caso real:
  - Página: [categoria/[...slug]/page.tsx](file:///c:/LOPES/www/connect-ecommerce/app/(shop)/categoria/%5B...slug%5D/page.tsx)
  - Endpoints envolvidos, stores e camadas intermediárias
- Propor (sem implementar ainda nesta fase) como fica a implementação do piloto server-side usando a nova camada `liz_refator/server-requests`, mantendo invariantes.

**Artefatos resultantes (onde encontrar)**
- Revisão e links corrigidos: [MAPA-DE-ROTAS.md](file:///c:/LOPES/www/connect-ecommerce/liz_refator/MAPA-DE-ROTAS.md) e [FLUXO-REQUISICOES.md](file:///c:/LOPES/www/connect-ecommerce/liz_refator/FLUXO-REQUISICOES.md)
- Prova do fluxo (trace verificável): seção “Prova do fluxo — Categoria” em [FLUXO-REQUISICOES.md](file:///c:/LOPES/www/connect-ecommerce/liz_refator/FLUXO-REQUISICOES.md)
- Proposta do piloto (detalhada, sem codar): [ESTRATEGIA-MIGRACAO.md](file:///c:/LOPES/www/connect-ecommerce/liz_refator/ESTRATEGIA-MIGRACAO.md) e [server-requests/README.md](file:///c:/LOPES/www/connect-ecommerce/liz_refator/server-requests/README.md)

**BREAKING**
- Nenhuma mudança breaking planejada: manter contratos e comportamento existentes.

## Impact

- Affected specs: documentação de arquitetura e fluxo de chamadas; estratégia de migração por rota.
- Affected code (na fase de implementação, após aprovação):
  - Documentos em `liz_refator/` (ajustes de texto e links)
  - Camada nova em `liz_refator/server-requests/` (facade compatível)
  - 1 rota piloto (preferencialmente `GET /api/produtos/categorias/by-slug/<...slug>`), caso aprovado

## ADDED Requirements

### Requirement: Revisão de consistência documental
O sistema SHALL manter uma documentação em `liz_refator/` sem contradições internas e com exemplos rastreáveis até o código.

#### Scenario: Detecção de contradição
- **WHEN** duas seções descreverem o mesmo comportamento com resultados diferentes (ex.: endpoints diferentes para a mesma ação)
- **THEN** a documentação deve ser corrigida para refletir o comportamento real do código, com links diretos para os arquivos relevantes.

#### Scenario: Gap de informação
- **WHEN** um leitor não conseguir seguir o caminho do front até a rota `/api/...` e até o service/upstream
- **THEN** a documentação deve incluir as camadas intermediárias (store/wrapper/handler/service) e o(s) endpoint(s) exato(s).

### Requirement: Prova do fluxo para página de categoria
O sistema SHALL documentar o fluxo completo da página de categoria, com um “trace” verificável.

#### Scenario: Front → Back
- **WHEN** a página montar `slugPath` e chamar `loadCategoriaBySlug` e `loadProdutosByCategoria`
- **THEN** o documento deve listar:
  - store/função chamada
  - wrapper em `lib/api/*`
  - endpoint `/api/...` resultante (incluindo parâmetros)

#### Scenario: Back → Back
- **WHEN** o handler do BFF receber a requisição
- **THEN** o documento deve listar:
  - arquivo `app/api/**/route.ts`
  - service em `lib/integration/**` chamado
  - configuração/env relevante (ex.: `INTEGRATION_URL_API`, `NEXT_PUBLIC_FONTE`)

#### Scenario: Back → Front
- **WHEN** ocorrer erro upstream (`HttpError`) ou erro inesperado
- **THEN** o documento deve explicar como o status e o payload retornam ao client e como o client interpreta (`ApiError`).

### Requirement: Proposta de implementação do piloto (facade compatível)
O sistema SHALL definir, em documentação, como será feita a refatoração isolada da rota piloto usando `liz_refator/server-requests`, sem alterar contrato.

#### Scenario: Migração por rota
- **WHEN** a rota piloto for migrada
- **THEN** a chamada HTTP deve manter:
  - retry apenas em falha de rede (equivalente ao legado)
  - `cache: 'no-store'`
  - mapeamento de erro equivalente (status + payload)

## MODIFIED Requirements

### Requirement: Mapa de rotas com fluxo
O documento `liz_refator/MAPA-DE-ROTAS.md` SHALL incluir, para o domínio de produtos, não apenas endpoints, mas também o caminho de chamada (page/store/lib/api/route/service) em nível suficiente para “seguir o fio”.

## REMOVED Requirements

Nenhum requisito removido.
