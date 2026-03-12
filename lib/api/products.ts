import { apiClient } from './client'

export interface Product {
  id: string
  name: string
  description: string
  price: number
  imageUrl?: string
}

export interface ProductListResponse {
  products: Product[]
  total: number
}

export async function getProducts(params?: { page?: number; limit?: number }): Promise<ProductListResponse> {
  // TODO: Implement actual products listing API call
  const queryParams = new URLSearchParams({
    page: String(params?.page || 1),
    limit: String(params?.limit || 20),
  })
  
  return apiClient<ProductListResponse>(`/products?${queryParams}`)
}

export async function getProductById(id: string): Promise<Product> {
  // TODO: Implement actual product detail API call
  return apiClient<Product>(`/products/${id}`)
}
