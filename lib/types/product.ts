export interface VarianteBean {
  [key: string]: unknown
}

export interface StockAvailables {
  [key: string]: unknown
}

export interface VinculoCatMercadoLivreBean {
  [key: string]: unknown
}

export interface ProdutoBean {
  codProd: number
  idIntegradora: number
  indiceEstoque: number
  qtUnit: number
  qtUnitCaixa: number
  codLocalOrig: number
  recalculaPrecoUnidade: boolean
  recalculaEstoqueUnidade: boolean
  descricaoErp: string
  descricaoEcomerce: string
  ean: string
  eanCaixa: string
  codVol: string
  productId: string
  codFilial: string
  skuId: string
  preco: number
  qtEstoque: number
  imagem: string
  categoriaPrinciapal: number
  dtUltAlter: string
  imagens: string[]
  categorias: VinculoCatMercadoLivreBean[]
  fatorConversao?: number
  idVariante?: number
  qtVariants?: number
  refId?: string
  wharehouseId?: string
  multEstoque?: string
  departamento?: string
  categoria?: string
  url?: string
  status?: string
  proximoValida?: string
  mult_unid_ecommerc?: number
  variants?: VarianteBean[]
  stocks?: StockAvailables[]
}

export type Product = ProdutoBean
export type ProductListResponse = Product[]
