# Tasks

- [x] Task 1: Mapear dados e pontos de reuso da PDP atual
  - [x] Confirmar quais dados existem no `ProdutoDetailViewModel` e quais entram como UI estática (rating/share)
  - [x] Definir fonte de dados para “Você também pode gostar” (preferência: coleções do home via store existente)

- [x] Task 2: Padronizar breadcrumb do produto
  - [x] Substituir breadcrumb manual por `components/ui/breadcrumb` no produto
  - [x] Manter rotas `/` e `/categorias` e exibir nome do produto no último nível

- [x] Task 3: Implementar tabs locais para conteúdo abaixo da dobra
  - [x] Criar componente local de tabs em `app/(shop)/produtos/_components/` (sem dependências externas)
  - [x] Mapear conteúdo existente para “Descrição” e “Informações adicionais”

- [x] Task 4: Refatorar layout do topo (above the fold)
  - [x] Reorganizar grid para “galeria à esquerda + infos/compra à direita”
  - [x] Ajustar espaçamentos/typography para ficar próximo da referência e consistente com tokens do projeto
  - [x] Preservar uso de `ImageViewer`, `ProductSummary`, `BrandBlock` e `ProductActivity`

- [x] Task 5: Adicionar seção “Você também pode gostar”
  - [x] Reutilizar `ProductCarousel` para renderizar recomendados
  - [x] Implementar estado vazio discreto quando lista estiver vazia/indisponível

- [x] Task 6: Validação mínima
  - [x] Verificar diagnósticos TypeScript nos arquivos alterados/criados

# Task Dependencies

- Task 4 depende de Tasks 2–3 (breadcrumb e tabs definidos antes do polimento final).
- Task 6 depende de Tasks 1–5.
