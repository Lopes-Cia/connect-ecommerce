export type CategoriaFamiliaItem = { id: number; name: string; slug: string }

export type ProdutoCategory = {
  id: number
  name: string
  slug: string
  familia: CategoriaFamiliaItem[]
}

export type ProdutoBrand = {
  id: number
  name: string
  slug: string
  image: string
}

export type ProdutoMock = {
  id: number
  sku: string
  name: string
  slug: string
  unitLabel: string
  sizeLabel: string
  qtUnit: number | null
  qtPalete: number | null
  price: number | null
  compareAtPrice: number | null
  badges: string[]
  image: string
  stock: number
  inStock: boolean
  category: ProdutoCategory
  brand: ProdutoBrand
}
