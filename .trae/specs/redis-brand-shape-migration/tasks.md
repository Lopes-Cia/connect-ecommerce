## Tarefas

1. Padronizar escrita de marca em produto (UI Redis)
   - Atualizar `components/ai/sections/RedisSection.tsx` para gravar `brand.nome` no lugar de `brand.name`.
   - Manter leitura tolerante a legado (`brand.name` ainda pode existir em docs antigos).

2. Padronizar doc de marca no upsert
   - Atualizar `app/api/dev/catalog/brand/upsert-by-name/route.ts` para persistir `{ id, nome, slug, image }`.
   - Ajustar parse de nome existente para considerar `nome` e legado.

3. Criar endpoint DEV de migração/normalização
   - Novo route handler em `app/api/dev/catalog/migrate/brand-shape/route.ts`:
     - Scan de `catalog:product:*` e `catalog:brand:*`.
     - `JSON.GET` → normalizar → `JSON.SET`.
     - Retornar relatório (contagens e exemplos).

4. Adicionar botão “Padronizar marcas”
   - Atualizar `components/ai/sections/RedisSection.tsx`:
     - Botão chama `POST /api/dev/catalog/migrate/brand-shape`.
     - Exibir resultado em `opsResult` ou em um bloco dedicado.

5. Ajustar sync (não reintroduzir `name`)
   - Atualizar `lib/integration/catalogAdminService.ts` para garantir que writes no Redis usem o shape canônico:
     - Produtos: normalizar `doc.brand` antes do `JSON.SET`.
     - Brands: normalizar docs de brand antes do `JSON.SET`.

6. Validação
   - Rodar checagem de diagnósticos TypeScript.
   - Teste manual rápido via UI:
     - Executar botão de migração e verificar que `brand.name` sumiu.
     - Criar/atualizar marca via upsert e verificar shape.
