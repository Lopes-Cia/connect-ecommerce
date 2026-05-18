## Objetivo

Padronizar o formato de marca no catálogo Redis:

- Em `catalog:product:{id}` (produto), dentro de `brand`, remover a chave `name` e adotar o shape canônico:
  - `brand: { id: number, nome: string, slug: string, image: string }`
- Em `catalog:brand:{id}` (tabela auxiliar de marcas), garantir o mesmo shape e mesmas chaves do `product.brand`:
  - `{ id: number, nome: string, slug: string, image: string }`
- Disponibilizar um botão na UI (seção Redis do Assistente IA) para automatizar a migração/normalização em lote.

## Escopo

- Ajustar os pontos que escrevem `product.brand` para não persistirem `name` em novos writes.
- Ajustar o endpoint de upsert por nome para persistir marca no novo shape.
- Criar um endpoint DEV de migração que reescreve produtos e marcas existentes no Redis para o novo shape, com relatório.
- Adicionar um botão na UI para executar a migração e mostrar o resultado.

## Fora de escopo

- Alterar regras de negócio de extração de marca por IA.
- Refatorar tipos globais (`Produto`, `Brand`) fora do necessário para compilar.
- Alterar rotas públicas / UX fora do botão pedido.

## Shape canônico (contrato)

### Produto (Redis)

- Antes (exemplo legado):
  - `brand: { id, name, slug, image }` e/ou campos legados na raiz (`brandId`, `marca`)
- Depois (canônico):
  - `brand: { id, nome, slug, image }`
  - Remover `brandId` e `marca` da raiz quando houver `brand` objeto.

### Marca (Redis)

- Antes (exemplo legado):
  - `{ id, name, nome, slug, image, source?, ... }`
- Depois (canônico):
  - `{ id, nome, slug, image }`

## Migração (comportamento)

- Produtos:
  - Se `brand.name` existir e `brand.nome` estiver vazio/ausente, copiar o valor de `name` para `nome`.
  - Remover `brand.name`.
  - Manter apenas as chaves `id`, `nome`, `slug`, `image` dentro de `brand` (dropar extras).
  - Remover campos legados na raiz: `brandId`, `marca`.
- Marcas:
  - Se `name` existir e `nome` estiver vazio/ausente, copiar `name` para `nome`.
  - Remover `name`.
  - Reescrever o doc mantendo apenas `id`, `nome`, `slug`, `image`.
- Não inventar nomes:
  - Se não houver nenhum texto reaproveitável para `nome`, definir `nome` como string vazia e reportar no resultado.

## Segurança / Guardrails

- Endpoint de migração deve ser DEV-only (bloquear em produção).
- Retornar um relatório com contagens e exemplos de chaves alteradas para auditoria rápida.
- Mudanças mínimas e localizadas (sem “mexer em tudo”).

## Validação mínima

- Compilação/TypeScript: sem erros novos.
- Após migração:
  - Nenhum produto atualizado deve conter `brand.name`.
  - Nenhuma marca atualizada deve conter `name`.
  - Produtos/marcas devem conter `nome`, `slug`, `image`, `id`.
