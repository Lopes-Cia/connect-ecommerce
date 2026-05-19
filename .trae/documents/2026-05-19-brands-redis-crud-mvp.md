# Plano — Brands (Redis) no AIChat (MVP)

## Resumo

Implementar a tela **Recursos > Brands** no AIChat com layout:
- **Centro:** tabela (shadcn) listando as brands do **Redis**
- **Direita:** painel de edição/criação (por enquanto: **placeholder**)

Escopo deste MVP (decisão do chat): **“vamos fazer a lista inicialmente”** — sem Create/Update/Delete ainda.

## Estado atual (repo)

- Menu do AIChat já suporta submenu colapsável e já existe o item **Brands** dentro de **Recursos**:
  - [FloatingAiChat.tsx](file:///c:/LOPES/www/connect-ecommerce/components/ai/FloatingAiChat.tsx)
- View de recursos atualmente só renderiza placeholder para `brands`, via prop `activeSubTab`:
  - [RecursosView.tsx](file:///c:/LOPES/www/connect-ecommerce/components/ai/views/RecursosView.tsx)
- Existe endpoint pronto para listar brands do Redis (read model):
  - `GET /api/catalog/produtos/brands`
  - Implementação: [brands/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/catalog/produtos/brands/route.ts)
  - Internamente usa `listCatalogBrands()` (SCAN + JSON.GET por prefixo `catalog:brand:`) e `ensureCatalogSynced()`.
- O sync atual grava **apenas fallback** para brands (`id=0`) e observa que “endpoint não existe ainda”, ou seja, o Redis pode ter brands criadas manualmente/por outras rotas:
  - [catalogAdminService.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/catalogAdminService.ts#L476-L488)
- Observação importante de compatibilidade: documentos de brand no Redis aparecem como `{ id, nome, slug, image }` (campo `nome`), enquanto alguns pontos do frontend usam `name`. Para a tabela, vamos renderizar `nome ?? name` para não quebrar legado.

## Objetivo e critérios de sucesso

- Abrir AIChat > **Recursos** > **Brands** e visualizar uma tabela com as brands que existem no Redis.
- UI minimalista (MVP), sem navegação externa, sem paginação, sem filtros.
- Painel à direita existe (estrutura) mas fica como **“Em construção”** (edição/CRUD entra depois).

## Mudanças propostas (arquivos)

### 1) UI — tabela no centro + painel à direita

Atualizar [RecursosView.tsx](file:///c:/LOPES/www/connect-ecommerce/components/ai/views/RecursosView.tsx):

- Quando `activeSubTab === "brands"`:
  - Renderizar layout em 2 colunas:
    - **Centro (flex-1):** card com tabela shadcn (`components/ui/table.tsx`)
    - **Direita (w-80 / w-[360px]):** card “Edição” com placeholder “Em construção”
- Carregar dados via `fetch("/api/catalog/produtos/brands")`
  - Loading: exibir “Carregando…”
  - Erro: exibir mensagem simples e manter tabela vazia
- Modelagem no client (sem criar types globais):
  - `id` (number)
  - `nome` (string) — fallback `name`
  - `slug` (string)
  - `image` (string)
- Colunas da tabela (MVP):
  - `id`
  - `nome` (renderizar `nome ?? name ?? "-"`)
  - `slug`
  - `image` (mostrar texto truncado; sem `<img>` por enquanto)

### 2) API — nenhuma alteração neste MVP

- Reutilizar `GET /api/catalog/produtos/brands` existente para alimentar a tabela.
- CRUD (POST/PUT/DELETE) e endpoints `/api/dev/redis/...` ficam para o próximo passo, quando você pedir.

## Compatibilidade / fallback

- Tabela usa `nome ?? name` para suportar o shape atual do Redis e o shape tipado do app.
- Se o endpoint retornar `success: false` ou falhar: renderizar lista vazia + texto de erro.

## Verificação

- Rodar `npm run lint` (padrão do projeto).
- Teste manual:
  - Abrir AIChat > Recursos > Brands
  - Confirmar que lista renderiza e não quebra quando não há brands além do fallback.

