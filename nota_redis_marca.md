# Nota — Redis (Marcas)

## Objetivo

Centralizar o contexto e as referências para o fluxo de **atualização/normalização de marcas no Redis** (catálogo), seguindo o mesmo padrão do bloco “Update Redis Data”.

## Contexto atual (resumo)

- Overwrite por produto (flags) é salvo em Redis: `catalog:product_overwrite:{idProduto}`
  - API: [app/api/catalog/produtos/overwrite/by-id/[idProduto]/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/catalog/produtos/overwrite/by-id/%5BidProduto%5D/route.ts)
- Quando `brand=ON`, o RAW (`/api/lopes/produtos/*`) sobrescreve `produto.brand` usando o Redis (`catalog:product:{idProduto}`):
  - [app/api/lopes/produtos/by-id/[idProduto]/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/lopes/produtos/by-id/%5BidProduto%5D/route.ts)
  - [app/api/lopes/produtos/by-slug/[slug]/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/lopes/produtos/by-slug/%5Bslug%5D/route.ts)

## Padrão “Update Redis Data” (referência)

- UI (bloco DEV dentro do painel): [components/ai/views/ContextoView.tsx](file:///c:/LOPES/www/connect-ecommerce/components/ai/views/ContextoView.tsx)
- Endpoint (exemplo já existente): [app/api/dev/redis/catalog/produto/stock/route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/dev/redis/catalog/produto/stock/route.ts)

## Modelo de dados (Marcas)

- Tipos usados no lado “RAW”: [liz_refator/contracts/lopes/models.ts](file:///c:/LOPES/www/connect-ecommerce/liz_refator/contracts/lopes/models.ts)
- Sync/admin que escreve `catalog:brand:{id}` e normaliza shape: [lib/integration/catalogAdminService.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/catalogAdminService.ts)

## O que precisamos decidir/definir

1) Qual chave vai ser alterada?
- `catalog:brand:{idBrand}` (entidade marca)
- ou `catalog:product:{idProduto}.brand` (marca dentro do produto)
- ou ambos

2) Qual é o “shape canônico” da marca no Redis?
- Ex.: `{ id, nome|name, slug, image }`

3) Qual será o endpoint DEV (padrão “Update Redis Data”)?
- Sugestão: `/api/dev/redis/catalog/brand/upsert` (ou algo equivalente)

4) Quais operações precisam existir?
- Atualizar 1 marca por id
- Migrar/normalizar (varrer marcas e padronizar)
- (opcional) Atualizar marcas dentro dos produtos

## Checklist de validação (manual)

- Atualizar uma marca no Redis e confirmar via `JSON.GET` na chave esperada
- Confirmar que o produto RAW com `overwrite.brand=ON` passa a refletir a marca do Redis
- Confirmar fallback: se Redis falhar, RAW continua funcionando

## Referências do contexto (cole aqui)

- [ ] Problema atual / exemplos reais
- [ ] Prints ou JSONs de exemplo (marca no Redis, produto no Redis, produto no RAW)
- [ ] IDs de exemplo (idProduto / idBrand)
- [ ] Regra de precedência (quando sobrescreve / quando não)





qdo a gente ativar o uso de marca pelo redis ,  a primeira questao é saber se o produto tem uma marca no redis

no redis tem catalog temos a brand ja, vc pode verificar pelo fluxo desse [text](components/ai/views/RecursosView.tsx)

vamo ja atualizar esses dados 
vamos prescisa de uma ferramenta que adiciona edita e apaga  brand no redis 