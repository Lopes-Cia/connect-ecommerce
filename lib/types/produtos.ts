export type Categoria = {
  id: number
  name: string
  slug: string
  parentId: number
  image: string
  order: number
}

export type CategoriaNode = Categoria & {
  children: CategoriaNode[]
}

export type Produto = {
  id: number
  sku: string
  name: string
  slug: string
  categoryId: number
  brand: string
  unitLabel: string
  sizeLabel: string
  price: number
  compareAtPrice: number | null
  badges: string[]
  image: string
  stock: number
  inStock: boolean
}

export type ProdutoV2 = Produto

export type Brand = {
  id: number
  name: string
  slug: string
  image: string
}

export type BrandByIdPayload = {
  brand: Brand
  products: {
    data: Produto[]
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export type ApiSuccess<T> = {
  success: true
  data: T
}

export type ApiFailure = {
  success: false
  message?: string
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure
