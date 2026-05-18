export type CatalogReadModel = 'redis' | 'none'

export function buildCatalogHeaders(input: { origin: 'lopes'; readModel: CatalogReadModel }): Record<string, string> {
  return {
    'x-catalog-origin': input.origin,
    'x-catalog-read-model': input.readModel,
  }
}

