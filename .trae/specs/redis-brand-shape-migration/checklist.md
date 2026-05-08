## Checklist de aceite

- [ ] `product.brand` no Redis usa `{ id, nome, slug, image }` e não contém `name`
- [ ] Docs `catalog:brand:{id}` no Redis usam `{ id, nome, slug, image }` e não contêm `name`
- [ ] Upsert por nome cria/atualiza marcas no novo shape
- [ ] Sync não reintroduz `brand.name` em produtos nem `name` em marcas
- [ ] Botão na seção Redis executa migração e exibe relatório (contagens + exemplos)
- [ ] Sem erros novos de TypeScript/compilação

## Checklist de segurança (migração)

- [ ] Endpoint de migração bloqueado em produção (DEV-only)
- [ ] Migração não apaga dados fora do escopo (apenas normaliza `brand` e docs `brand:*`)
- [ ] Relatório lista quantos docs foram alterados e quantos ficaram com `nome` vazio
