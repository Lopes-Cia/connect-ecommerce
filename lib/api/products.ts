import { apiClient } from './client'
import type { Product, ProductListResponse } from '@/lib/types/product'

interface ProductListApiResponse {
  success: boolean
  data: ProductListResponse
  total: number
}

interface ProductDetailApiResponse {
  success: boolean
  data: Product
}

export async function getProducts(params?: {
  idIntegradora?: number
}): Promise<ProductListResponse> {
  const queryParams = new URLSearchParams()

  if (params?.idIntegradora !== undefined) {
    queryParams.set('idIntegradora', String(params.idIntegradora))
  }

  const query = queryParams.toString()
  const endpoint = query ? `/products?${query}` : '/products'
  const response = await apiClient<ProductListApiResponse>(endpoint)
  return response.data
}

export async function getProductById(
  codProd: string | number,
  params?: { idIntegradora?: number }
): Promise<Product> {
  const queryParams = new URLSearchParams()

  if (params?.idIntegradora !== undefined) {
    queryParams.set('idIntegradora', String(params.idIntegradora))
  }

  const query = queryParams.toString()
  const endpoint = query
    ? `/products/${codProd}?${query}`
    : `/products/${codProd}`

  const response = await apiClient<ProductDetailApiResponse>(endpoint)
  return response.data
}
