import { apiClient } from '@/lib/api/client'
import { CATALOG_API_ROUTES } from '@/lib/api/catalogRoutes'

export type CatalogProductsResponse<TItem = unknown> = {
  total: number
  page: number
  pageSize: number
  items: TItem[]
}

export type CatalogProductsQuery = {
  q?: string
  categoryId?: number
  brandId?: number
  inStock?: boolean
  priceMin?: number
  priceMax?: number
  sort?: string
  page?: number
  pageSize?: number
}

function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const usp = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue
    usp.set(key, String(value))
  }
  const qs = usp.toString()
  return qs ? `?${qs}` : ''
}

export async function getCatalogHealth(): Promise<unknown> {
  return apiClient(CATALOG_API_ROUTES.health, { cache: 'no-store' })
}

export async function getCatalogProducts<TItem = unknown>(
  query: CatalogProductsQuery
): Promise<CatalogProductsResponse<TItem>> {
  const url =
    CATALOG_API_ROUTES.products +
    buildQueryString({
      q: query.q,
      categoryId: query.categoryId,
      brandId: query.brandId,
      inStock: query.inStock,
      priceMin: query.priceMin,
      priceMax: query.priceMax,
      sort: query.sort,
      page: query.page,
      pageSize: query.pageSize,
    })

  return apiClient<CatalogProductsResponse<TItem>>(url, { cache: 'no-store' })
}

export async function getCatalogCategories<TCategory = unknown>(): Promise<TCategory[]> {
  return apiClient<TCategory[]>(CATALOG_API_ROUTES.categories, { cache: 'no-store' })
}

export async function getCatalogBrands<TBrand = unknown>(): Promise<TBrand[]> {
  return apiClient<TBrand[]>(CATALOG_API_ROUTES.brands, { cache: 'no-store' })
}
