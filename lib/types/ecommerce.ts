export type HomeBanner = {
  id: string | number
  image: string
  link: string
}

export type HomeSection<T> = {
  slug: string
  data: T[]
}

export type HomeCollections = {
  home?: {
    banners_1?: HomeBanner[]
    categorias_destaque?: unknown[]
    produtos_maisvendidos?: HomeSection<unknown>
    produtos_promocao?: HomeSection<unknown>
  }
  [key: string]: unknown
}

