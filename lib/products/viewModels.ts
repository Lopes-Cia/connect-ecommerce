import type { Product } from '@/lib/types/product'
import { formatCurrency } from '@/lib/formatting'
import { computeMaxQuantity, computePaleteValue } from '@/lib/produtos/paletePricing'

export type ProductCardType =
  | 'standard'
  | 'discount'
  | 'highlighted'
  | 'highlighted-discount'
  | 'coming-soon'

export interface ProductCardViewModel {
  id: string
  name: string
  category: string
  price: number
  discountPrice?: number
  image_url: string
  slug?: string
  cardType?: ProductCardType
  qtUnit?: number | null
  qtPalete?: number | null
  stock?: number | null
  paleteValue?: number | null
  maxQuantity?: number | null
}

export interface ProductSpecViewModel {
  label: string
  value: string
}

export interface ProductDetailViewModel {
  id: string
  name: string
  category: string
  shop?: string
  price: number
  oldPrice?: number
  images: string[]
  specs: ProductSpecViewModel[]
  shortDescription: string
  ingredients: string
  legalNotice: string
  fullDescription: string
  technicalSpecs: ProductSpecViewModel[]
  inStock: boolean
}

const FALLBACK_IMAGE = '/placeholder.svg'

function normalizeText(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

function sanitizeUrl(value: string): string {
  let sanitized = value.trim()

  if (!sanitized) {
    return ''
  }

  if (sanitized.startsWith('(') && sanitized.endsWith(')')) {
    sanitized = sanitized.slice(1, -1).trim()
  }

  sanitized = sanitized.replace(/^[<"'\[\s]+/, '').replace(/[>"'\]\s]+$/, '')
  sanitized = sanitized.replace(/[),.;]+$/g, '')

  return sanitized.trim()
}

function toImageUrl(value: unknown): string {
  const normalized = typeof value === 'string' ? sanitizeUrl(value) : normalizeText(value)

  if (!normalized) {
    return FALLBACK_IMAGE
  }

  if (normalized.startsWith('/')) {
    return normalized
  }

  if (normalized.startsWith('//')) {
    return `https:${normalized}`
  }

  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return normalized
  }

  return FALLBACK_IMAGE
}

function toName(product: Product): string {
  return normalizeText(product.descricaoEcomerce) || normalizeText(product.descricaoErp) || `Produto ${product.codProd}`
}

function toCategory(product: Product): string {
  return normalizeText(product.categoria) || normalizeText(product.departamento) || 'Sem categoria'
}



function toStockStatus(product: Product): string {
  return (product.qtEstoque ?? 0) > 0 ? 'Em estoque' : 'Indisponivel'
}

function toPackageInfo(product: Product): string {
  const quantityPerBox = product.qtPalete ?? 0
  const unit = normalizeText(product.codVol) || 'UN'

  if (quantityPerBox <= 0) {
    return '-'
  }

  return quantityPerBox === 1
    ? `Caixa com 1 ${unit}`
    : `Caixa com ${quantityPerBox} ${unit}`
}

export function toProductCardViewModel(product: Product): ProductCardViewModel {
  const price = Number.isFinite(product.preco) ? product.preco : 0
  const qtPalete = Number.isFinite(product.qtPalete) && product.qtPalete > 0 ? product.qtPalete : null
  const stock = Number.isFinite(product.qtEstoque) ? product.qtEstoque : 0
  const maxQuantity = computeMaxQuantity(stock, qtPalete)
  const inStock = maxQuantity > 0

  return {
    id: String(product.codProd),
    name: toName(product),
    category: toCategory(product),
    price,
    image_url: toImageUrl(product.imagem),
    cardType: inStock ? 'standard' : 'coming-soon',
    qtUnit: Number.isFinite(product.qtUnit) && product.qtUnit > 0 ? product.qtUnit : null,
    qtPalete,
    stock,
    paleteValue: computePaleteValue(price, qtPalete),
    maxQuantity,
  }
}

export function toProductDetailViewModel(product: Product): ProductDetailViewModel {
  const images = [
    ...new Set(
      [product.imagem, ...(Array.isArray(product.imagens) ? product.imagens : [])]
        .map((image) => toImageUrl(image))
        .filter(Boolean)
    ),
  ]

  const normalizedImages = images.length > 0 ? images : [FALLBACK_IMAGE]
  const name = toName(product)

  return {
    id: String(product.codProd),
    name,
    category: toCategory(product),
    shop: normalizeText(product.departamento) || normalizeText(product.categoria),
    price: Number.isFinite(product.preco) ? product.preco : 0,
    images: normalizedImages,
    specs: [
      { label: 'Categoria', value: toCategory(product) },
      { label: 'Disponibilidade', value: toStockStatus(product) },
      { label: 'Unidade de venda', value: normalizeText(product.codVol) || '-' },
      { label: 'Embalagem', value: toPackageInfo(product) },
      { label: 'EAN', value: normalizeText(product.ean) || '-' },
      { label: 'SKU', value: normalizeText(product.skuId) || '-' },
    ],
    shortDescription: normalizeText(product.descricaoEcomerce) || normalizeText(product.descricaoErp) || name,
    ingredients: 'Informacao indisponivel pelo integrador para este produto.',
    legalNotice:
      'As informacoes apresentadas sao de responsabilidade do integrador. Consulte sempre a embalagem antes do consumo.',
    fullDescription: normalizeText(product.descricaoErp) || normalizeText(product.descricaoEcomerce) || name,
    technicalSpecs: [
      { label: 'Descricao comercial', value: normalizeText(product.descricaoEcomerce) || name },
      { label: 'Descricao do produto', value: normalizeText(product.descricaoErp) || name },
      { label: 'Categoria', value: toCategory(product) },
      { label: 'Codigo do produto', value: String(product.codProd) },
      { label: 'SKU', value: normalizeText(product.skuId) || '-' },
      { label: 'EAN unidade', value: normalizeText(product.ean) || '-' },
      { label: 'EAN caixa', value: normalizeText(product.eanCaixa) || '-' },
      { label: 'Unidade de venda', value: normalizeText(product.codVol) || '-' },
      { label: 'Quantidade por unidade', value: String(product.qtUnit ?? 1) },
      { label: 'Quantidade por caixa', value: String(product.qtPalete ?? 0) },
      { label: 'Preco unitario', value: formatCurrency(Number.isFinite(product.preco) ? product.preco : 0) },
      { label: 'Disponibilidade', value: toStockStatus(product) },
      { label: 'Estoque disponivel', value: String(product.qtEstoque ?? 0) },
    ],
    inStock: (product.qtEstoque ?? 0) > 0,
  }
}
