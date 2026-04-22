# Tasks

- [x] Revisar documentos em `liz_refator/` buscando contradições e gaps
  - [x] Conferir se “Legenda (fluxo)” e seções por domínio apontam para o mesmo caminho real
  - [x] Conferir links e exemplos para evitar referências vazias/ambíguas
- [x] Produzir “Prova do fluxo” para `app/(shop)/categoria/[...slug]/page.tsx`
  - [x] Documentar o caminho Front → Back: page → store → `lib/api/produtos` → `apiClient` → endpoints
  - [x] Documentar o caminho Back → Back: route handlers envolvidos → `lib/integration/produtosService` → upstream (env)
  - [x] Documentar Back → Front: status/shape e como `ApiError` no client interpreta
- [x] Propor a implementação do piloto (sem codar ainda nesta etapa de spec)
  - [x] Selecionar rota piloto (preferência: `GET /api/produtos/categorias/by-slug/<...slug>`)
  - [x] Definir assinatura mínima da facade compatível em `liz_refator/integration`
  - [x] Definir invariantes e checklist de validação para a rota piloto

# Task Dependencies

- A proposta do piloto depende da “Prova do fluxo” concluída, para garantir contrato e comportamento equivalentes.
