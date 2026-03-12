export interface Product {
  id: string
  name: string
  description: string
  price: number
  imageUrl?: string
  category?: string
  stock?: number
}

export interface ProductListResponse {
  products: Product[]
  total: number
  page: number
  limit: number
}

export interface ProductCategory {
  id: string
  name: string
  slug: string
}
