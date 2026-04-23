import 'server-only'

import type { Brand, Categoria, CategoriaNode } from '@/liz_refator/adapters/produtos-types'

import type { ProdutoBrand, ProdutoCategory, ProdutoMock } from './models'
import {
  LopesCategoriaRaw,
  LopesProdutoRaw,
  normalizeText,
  readListFrom,
  safeString,
  slugify,
  toIntOrZero,
  toNumberOrNull,
  toNumberOrNullIfPresent,
} from './raw'

function detectSizeLabel(text: unknown): string {
  const t = normalizeText(text)
  const m = t.match(/(\d+(?:[.,]\d+)?)\s*(ml|l|g|kg)\b/)
  if (!m) return ''
  const raw = safeString(m[1]).replace(',', '.')
  const qty = Number(raw)
  if (!Number.isFinite(qty)) return ''
  const unit = safeString(m[2]).toLowerCase()
  const isInt = Number.isInteger(qty)
  const qStr = isInt ? String(qty) : String(qty).replace(/\.0+$/, '')
  if (unit === 'ml') return `${qStr}ml`
  if (unit === 'l') return `${qStr}L`
  if (unit === 'g') return `${qStr}g`
  if (unit === 'kg') return `${qStr}kg`
  return `${qStr}${unit}`
}

function detectUnitLabel(text: unknown, codVol: unknown): string {
  const t = normalizeText(text)
  if (t.includes('long neck')) return 'long neck'
  if (t.includes('growler')) return 'growler'
  if (t.includes('lata')) return 'lata'
  if (t.includes('frasco')) return 'frasco'
  if (t.includes('envelope')) return 'envelope'
  if (t.includes('caixa')) return 'caixa'
  const cv = normalizeText(codVol)
  return cv || 'un'
}

function resolveCategoryFromSnapshot(categoriasById: Map<number, Categoria>, rawId: number): ProdutoCategory {
  const fallbackName = 'sem categoria'
  const fallbackSlug = '/categoria/sem-categoria'

  const fallbackFor = (id: number): ProdutoCategory => ({
    id,
    name: fallbackName,
    slug: fallbackSlug,
    familia: [{ id, name: fallbackName, slug: fallbackSlug }],
  })

  if (!rawId) return fallbackFor(0)
  const found = categoriasById.get(rawId)
  if (!found) return fallbackFor(rawId)

  const familia: Array<{ id: number; name: string; slug: string }> = []
  const visited = new Set<number>()
  let current: Categoria | undefined = found
  while (current && !visited.has(current.id) && current.id !== 0) {
    visited.add(current.id)
    familia.push({ id: current.id, name: current.name, slug: current.slug })
    current = categoriasById.get(current.parentId)
  }
  familia.reverse()

  return {
    id: found.id,
    name: found.name,
    slug: found.slug,
    familia: familia.length ? familia : [{ id: found.id, name: found.name, slug: found.slug }],
  }
}

function resolveBrandFromSnapshot(brandsById: Map<number, Brand>, rawId: number | null): ProdutoBrand {
  const fallback = brandsById.get(0)
  const base: ProdutoBrand = fallback
    ? { id: fallback.id, name: fallback.name, slug: fallback.slug, image: fallback.image }
    : {
        id: 0,
        name: 'No Brand',
        slug: '/marca/no-brand',
        image: 'https://lopesecia.com.br/img/semImagem.png',
      }

  if (!rawId) return base
  const found = brandsById.get(rawId)
  if (!found) return base
  return { id: found.id, name: found.name, slug: found.slug, image: found.image }
}

export function buildBrandsById(brands: Brand[]): Map<number, Brand> {
  const byId = new Map<number, Brand>()
  for (const b of brands) {
    byId.set(toIntOrZero((b as unknown as { id?: unknown })?.id), b)
  }
  return byId
}

export function translateLopesProdutosToProdutosMock(
  input: unknown,
  lookups: {
    categoriasById: Map<number, Categoria>
    brandsById: Map<number, Brand>
    fallbackImage?: string
  }
): ProdutoMock[] {
  const items = readListFrom(input) as LopesProdutoRaw[]
  const fallbackImage = lookups.fallbackImage ?? 'https://lopesecia.com.br/img/semImagem.png'

  return items.map((it) => {
    const id = toIntOrZero(it?.codProd)
    const name = safeString(it?.descricaoEcomerce) || safeString(it?.descricaoErp) || `Produto ${id}`
    const baseSlug = slugify(name)
    const slug = `/produtos/${baseSlug}-${id}`

    const ean = safeString(it?.ean)
    const sku = ean && normalizeText(ean) !== 'null' ? `${ean}-${id}` : `${baseSlug}-${id}`

    const unitLabel = detectUnitLabel(name, it?.codVol)
    const sizeLabel = detectSizeLabel(name)
    const qtUnit = toNumberOrNullIfPresent(it?.qtUnit)
    const qtUnitCaixa = toNumberOrNullIfPresent(it?.qtUnitCaixa)

    const price = toNumberOrNull(it?.preco)
    const stock = toIntOrZero(it?.qtEstoque)

    const catIdRaw = toIntOrZero(it?.categoriaPrinciapal)
    const category = resolveCategoryFromSnapshot(lookups.categoriasById, catIdRaw)

    const image = safeString(it?.imagem) || fallbackImage
    const brand = resolveBrandFromSnapshot(lookups.brandsById, null)

    return {
      id,
      sku,
      name,
      slug,
      unitLabel,
      sizeLabel,
      qtUnit,
      qtUnitCaixa,
      price,
      compareAtPrice: null,
      badges: [],
      image,
      stock,
      inStock: stock > 0,
      category,
      brand,
    }
  })
}

export function translateLopesProdutoToProduto(
  input: unknown,
  lookups: {
    categoriasById: Map<number, Categoria>
    brandsById: Map<number, Brand>
    fallbackImage?: string
  }
): ProdutoMock | null {
  const list = readListFrom(input) as LopesProdutoRaw[]
  if (list.length > 0) {
    return translateLopesProdutosToProdutosMock(list, lookups)[0] ?? null
  }

  if (input && typeof input === 'object' && !Array.isArray(input)) {
    const obj = input as Record<string, unknown>
    const data = obj.data
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      return translateLopesProdutosToProdutosMock([data], lookups)[0] ?? null
    }
    if ((obj as unknown as LopesProdutoRaw)?.codProd !== undefined) {
      return translateLopesProdutosToProdutosMock([obj], lookups)[0] ?? null
    }
  }

  return null
}

function buildCategoriasTreeFromCategoriasInternal(categorias: Categoria[]): CategoriaNode[] {
  const byId = new Map<number, Categoria>()
  const childrenByParent = new Map<number, Categoria[]>()

  for (const c of categorias) {
    const id = toIntOrZero(c?.id)
    if (id === 0) continue
    byId.set(id, c)

    const parentId = toIntOrZero(c?.parentId)
    const list = childrenByParent.get(parentId) ?? []
    list.push(c)
    childrenByParent.set(parentId, list)
  }

  for (const [, list] of childrenByParent) {
    list.sort((a, b) => {
      const ao = toIntOrZero(a?.order)
      const bo = toIntOrZero(b?.order)
      if (ao !== bo) return ao - bo
      return toIntOrZero(a?.id) - toIntOrZero(b?.id)
    })
  }

  const buildNode = (category: Categoria): CategoriaNode => {
    const id = toIntOrZero(category?.id)
    const children = (childrenByParent.get(id) ?? []).map(buildNode)
    return { ...category, children }
  }

  const roots = childrenByParent.get(0) ?? []
  return roots.map(buildNode)
}

export function translateLopesCategoriasToCategorias(input: unknown): Categoria[] {
  const items = readListFrom(input) as LopesCategoriaRaw[]

  const categoryFallback: Categoria = {
    id: 0,
    name: 'sem categoria',
    slug: '/categoria/sem-categoria',
    parentId: 0,
    image: 'https://lopesecia.com.br/img/semImagem.png',
    order: 0,
  }

  const categoriesBody: Categoria[] = items
    .map((c) => {
      const id = toIntOrZero(c?.codigo)
      const parentId = toIntOrZero(c?.codPai)
      const name = safeString(c?.categoria) || `Categoria ${id}`
      const image = safeString(c?.imagem) || 'https://lopesecia.com.br/img/semImagem.png'
      const order = toIntOrZero(c?.sequencia) || id

      return { id, name, slug: '', parentId, image, order }
    })
    .filter((c) => toIntOrZero(c.id) !== 0)

  const byId = new Map<number, Categoria>()
  byId.set(0, categoryFallback)
  for (const c of categoriesBody) byId.set(toIntOrZero(c.id), c)

  for (const c of categoriesBody) {
    const visited = new Set<number>()
    const segments: string[] = []
    let current = toIntOrZero(c.id)

    while (current && !visited.has(current)) {
      visited.add(current)
      const found = byId.get(current)
      if (!found) break
      segments.push(slugify(found.name))
      current = toIntOrZero(found.parentId)
    }

    segments.reverse()
    const rest = segments.join('/')
    c.slug = `/categoria/${rest || 'sem-categoria'}`
  }

  const sorted = categoriesBody.sort((a, b) => {
    const ap = toIntOrZero(a.parentId)
    const bp = toIntOrZero(b.parentId)
    if (ap !== bp) return ap - bp

    const ao = toIntOrZero(a.order)
    const bo = toIntOrZero(b.order)
    if (ao !== bo) return ao - bo

    return toIntOrZero(a.id) - toIntOrZero(b.id)
  })

  return [categoryFallback, ...sorted]
}

export function buildCategoriasTreeFromCategorias(categorias: Categoria[]): CategoriaNode[] {
  return buildCategoriasTreeFromCategoriasInternal(categorias)
}

export function translateLopesCategoriasToCategoriasTree(input: unknown): CategoriaNode[] {
  const categorias = translateLopesCategoriasToCategorias(input)
  return buildCategoriasTreeFromCategoriasInternal(categorias)
}
