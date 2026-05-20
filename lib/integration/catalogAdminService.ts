import 'server-only'

import { createHash } from 'node:crypto'

import type { Brand, Categoria } from '@/liz_refator/adapters/produtos-types'
import { translateLopesCategoriasToCategorias, translateLopesProdutosToProdutosMock } from '@/liz_refator/contracts/lopes/translate'
import { getBackListCategoria, getBackListProdutoLoja } from '@/lib/integration/lopesBackClient'
import { getCatalogKeyPrefix, getCatalogRedisClient } from '@/lib/integration/catalogRedis'

type SyncKind = 'categorias' | 'produtos' | 'brands'

export type CatalogSyncInput = {
  only?: SyncKind[]
  batchSize?: number
  scanCount?: number
  prune?: boolean
  skipIfUnchanged?: boolean
}

type PruneResult = { scanned: number; deleted: number }

function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items]
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

function buildFallbackBrands(): Brand[] {
  return [
    {
      id: 0,
      name: 'No Brand',
      slug: '/marca/no-brand',
      image: 'https://lopesecia.com.br/img/semImagem.png',
    },
  ]
}

function buildCategoriasById(categorias: Categoria[]): Map<number, Categoria> {
  const byId = new Map<number, Categoria>()
  for (const c of categorias) byId.set(Number(c.id) || 0, c)
  return byId
}

function buildBrandsById(brands: Brand[]): Map<number, Brand> {
  const byId = new Map<number, Brand>()
  for (const b of brands) byId.set(Number(b.id) || 0, b)
  return byId
}

function computeProdutosSnapshotSignature(produtos: unknown[]): string {
  const normalized = produtos
    .map((p) => {
      const obj = p && typeof p === 'object' && !Array.isArray(p) ? (p as Record<string, unknown>) : null
      const idRaw = obj?.id
      const id = typeof idRaw === 'number' ? idRaw : typeof idRaw === 'string' ? Number(idRaw) : NaN
      const priceRaw = obj?.price
      const price = typeof priceRaw === 'number' ? priceRaw : typeof priceRaw === 'string' ? Number(priceRaw) : NaN
      const stockRaw = obj?.stock
      const stock = typeof stockRaw === 'number' ? stockRaw : typeof stockRaw === 'string' ? Number(stockRaw) : NaN
      const imageRaw = obj?.image
      const image = typeof imageRaw === 'string' ? imageRaw.trim() : ''
      const priceCents = Number.isFinite(price) ? Math.max(0, Math.round(price * 100)) : 0
      const safeStock = Number.isFinite(stock) ? Math.max(0, Math.trunc(stock)) : 0
      return { id: Number.isFinite(id) ? id : 0, priceCents, safeStock, image }
    })
    .filter((p) => p.id > 0)

  normalized.sort((a, b) => a.id - b.id)

  const hash = createHash('sha256')
  hash.update(String(normalized.length))
  hash.update('|')
  for (const p of normalized) {
    hash.update(String(p.id))
    hash.update('|')
    hash.update(String(p.priceCents))
    hash.update('|')
    hash.update(String(p.safeStock))
    hash.update('|')
    hash.update(p.image)
    hash.update('\n')
  }
  return hash.digest('hex')
}

async function upsertJsonDocs(input: {
  type: 'category' | 'product' | 'brand'
  docs: unknown[]
  batchSize: number
}) {
  const client = await getCatalogRedisClient()
  const prefix = getCatalogKeyPrefix()

  let written = 0
  for (const chunk of chunkArray(input.docs, input.batchSize)) {
    const multi = client.multi()
    for (const doc of chunk) {
      const id = (doc as { id?: unknown } | null)?.id
      if (id === undefined || id === null) {
        throw new Error(`Documento sem id (type=${input.type})`)
      }
      const key = `${prefix}:${input.type}:${id}`
      multi.sendCommand(['JSON.SET', key, '$', JSON.stringify(doc)])
    }
    await multi.exec()
    written += chunk.length
  }

  return written
}

async function readExistingJsonDocsById(input: {
  type: 'category' | 'product' | 'brand'
  ids: Array<number | string>
  batchSize: number
}): Promise<Map<string, Record<string, unknown>>> {
  const client = await getCatalogRedisClient()
  const prefix = getCatalogKeyPrefix()

  const map = new Map<string, Record<string, unknown>>()
  const keyBase = `${prefix}:${input.type}:`
  const ids = input.ids.map((id) => String(id)).filter(Boolean)

  for (const chunk of chunkArray(ids, input.batchSize)) {
    const multi = client.multi()
    const keys = chunk.map((id) => `${keyBase}${id}`)
    for (const key of keys) multi.sendCommand(['JSON.GET', key])
    const results = await multi.exec()
    for (let i = 0; i < chunk.length; i += 1) {
      const raw = results?.[i]
      if (typeof raw !== 'string') continue
      try {
        const parsed = JSON.parse(raw) as unknown
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) continue
        map.set(chunk[i], parsed as Record<string, unknown>)
      } catch {}
    }
  }

  return map
}

function pickFirstNumber(values: unknown[]): number | null {
  for (const v of values) {
    const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
    if (Number.isFinite(n)) return n
  }
  return null
}

function pickFirstString(values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function slugify(value: string): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeBrandDoc(value: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!value) return null
  const id = pickBrandId(value) ?? 0
  const nome = pickBrandName(value) ?? ''
  const slug = pickFirstString([value.slug]) ?? `/marca/${slugify(nome) || 'no-brand'}`
  const image =
    typeof value.image === 'string' && value.image.trim() ? value.image : 'https://lopesecia.com.br/img/semImagem.png'
  return { id, nome, slug, image }
}

function pickBrandId(value: Record<string, unknown> | null): number | null {
  if (!value) return null
  return pickFirstNumber([value.id, value.brandId, value.codigo])
}

function pickBrandName(value: Record<string, unknown> | null): string | null {
  if (!value) return null
  return pickFirstString([value.name, value.nome, value.marca, value.brand])
}

function mergeBrandFromExisting(input: { next: Record<string, unknown>; existing: Record<string, unknown> | undefined }) {
  if (!input.existing) return input.next

  const nextBrand = asObject(input.next.brand)
  const existingBrand = asObject(input.existing.brand)

  const nextBrandId = pickBrandId(nextBrand)
  const existingBrandId = pickBrandId(existingBrand)

  const legacyExistingBrandId = pickFirstNumber([input.existing.brandId, input.existing.idMarca, input.existing.brand_id])
  const legacyExistingBrandName = pickFirstString([
    input.existing.marca,
    input.existing.brand,
    input.existing.brandName,
    input.existing.fabricante,
  ])

  if ((existingBrandId === null || existingBrandId === 0) && legacyExistingBrandId && legacyExistingBrandId > 0) {
    const name = legacyExistingBrandName || `Marca ${legacyExistingBrandId}`
    const legacyBrandObj = {
      id: legacyExistingBrandId,
      nome: name,
      slug: `/marca/${slugify(name) || 'no-brand'}`,
      image: 'https://lopesecia.com.br/img/semImagem.png',
    }
    if ((nextBrandId === null || nextBrandId === 0)) {
      return { ...input.next, brand: legacyBrandObj }
    }
  }

  if ((nextBrandId === null || nextBrandId === 0) && existingBrandId && existingBrandId > 0 && existingBrand) {
    return { ...input.next, brand: normalizeBrandDoc(existingBrand) ?? existingBrand }
  }

  const nextBrandName = pickBrandName(nextBrand)
  const existingBrandName = pickBrandName(existingBrand)
  if (nextBrand && !nextBrandName && existingBrandName) {
    return { ...input.next, brand: normalizeBrandDoc({ ...nextBrand, nome: existingBrandName }) ?? nextBrand }
  }

  if (nextBrand) {
    const normalized = normalizeBrandDoc(nextBrand)
    if (normalized) return { ...input.next, brand: normalized }
  }

  return input.next
}

function pickCategoryId(value: Record<string, unknown> | null): number | null {
  if (!value) return null
  return pickFirstNumber([value.id, value.categoryId, value.codigo])
}

function mergeCategoryFromExisting(input: { next: Record<string, unknown>; existing: Record<string, unknown> | undefined }) {
  if (!input.existing) return input.next
  const nextCategory = asObject(input.next.category)
  const existingCategory = asObject(input.existing.category)

  const nextCategoryId = pickCategoryId(nextCategory)
  const existingCategoryId = pickCategoryId(existingCategory)

  const legacyExistingCategoryId = pickFirstNumber([
    input.existing.categoryId,
    input.existing.categoriaPrincipal,
    input.existing.categoriaPrinciapal,
    input.existing.categoria,
  ])

  if ((existingCategoryId === null || existingCategoryId === 0) && legacyExistingCategoryId && legacyExistingCategoryId > 0) {
    const name = `Categoria ${legacyExistingCategoryId}`
    const legacyCategoryObj = {
      id: legacyExistingCategoryId,
      name,
      slug: `/categoria/${slugify(name) || 'sem-categoria'}`,
      familia: [{ id: legacyExistingCategoryId, name, slug: `/categoria/${slugify(name) || 'sem-categoria'}` }],
    }
    if ((nextCategoryId === null || nextCategoryId === 0)) {
      return { ...input.next, category: legacyCategoryObj }
    }
  }

  if ((nextCategoryId === null || nextCategoryId === 0) && existingCategoryId && existingCategoryId > 0 && existingCategory) {
    return { ...input.next, category: existingCategory }
  }

  return input.next
}

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim().length === 0
  return false
}

function mergePreservingExisting(input: { next: unknown; existing: unknown }): unknown {
  const nextObj = asObject(input.next)
  const existingObj = asObject(input.existing)
  if (nextObj && existingObj) {
    const out: Record<string, unknown> = {}
    const keys = new Set([...Object.keys(existingObj), ...Object.keys(nextObj)])
    for (const key of keys) {
      const nextVal = nextObj[key]
      const existingVal = existingObj[key]
      if (isEmptyValue(nextVal)) {
        out[key] = existingVal
        continue
      }
      if (asObject(nextVal) && asObject(existingVal)) {
        out[key] = mergePreservingExisting({ next: nextVal, existing: existingVal })
        continue
      }
      out[key] = nextVal !== undefined ? nextVal : existingVal
    }
    return out
  }

  if (input.next === undefined) return input.existing
  if (isEmptyValue(input.next)) return input.existing
  return input.next
}

function normalizeProductDoc(doc: Record<string, unknown>) {
  const brandObj = asObject(doc.brand)
  const brandId = pickBrandId(brandObj)
  if (brandId && brandId > 0) {
    delete doc.brandId
    delete doc.marca
    delete doc.brandName
  }
  return doc
}

function mergeProductFromExisting(input: { next: Record<string, unknown>; existing: Record<string, unknown> | undefined }) {
  if (!input.existing) return normalizeProductDoc(input.next)
  const merged = mergePreservingExisting({ next: input.next, existing: input.existing })
  const asRec = asObject(merged) ?? input.next
  const withBrand = mergeBrandFromExisting({ next: asRec, existing: input.existing })
  const withCategory = mergeCategoryFromExisting({ next: withBrand, existing: input.existing })
  return normalizeProductDoc(withCategory)
}

function mergeCategoryDocFromExisting(input: { next: Record<string, unknown>; existing: Record<string, unknown> | undefined }) {
  if (!input.existing) return input.next
  const merged = mergePreservingExisting({ next: input.next, existing: input.existing })
  return asObject(merged) ?? input.next
}

function idsFromDocs(docs: unknown[]): Set<number> {
  const ids = new Set<number>()
  for (const d of docs) {
    const id = (d as { id?: unknown } | null)?.id
    if (typeof id === 'number') ids.add(id)
  }
  return ids
}

async function pruneByPrefix(input: {
  scanPrefix: string
  keepIds: Set<number>
  batchSize: number
  scanCount: number
}): Promise<PruneResult> {
  const client = await getCatalogRedisClient()

  let scanned = 0
  let deleted = 0
  let deleteBatch: string[] = []

  const flush = async () => {
    if (!deleteBatch.length) return
    const multi = client.multi()
    for (const key of deleteBatch) multi.sendCommand(['UNLINK', key])
    await multi.exec()
    deleted += deleteBatch.length
    deleteBatch = []
  }

  for await (const chunk of client.scanIterator({
    MATCH: `${input.scanPrefix}*`,
    COUNT: input.scanCount,
  })) {
    const keys = Array.isArray(chunk) ? chunk : [chunk]
    for (const rawKey of keys) {
      const key = String(rawKey)
      scanned += 1
      const tail = key.slice(input.scanPrefix.length)
      const parsed = Number.parseInt(tail, 10)
      if (!Number.isFinite(parsed)) continue
      if (!input.keepIds.has(parsed)) {
        deleteBatch.push(key)
        if (deleteBatch.length >= input.batchSize) await flush()
      }
    }
  }

  await flush()
  return { scanned, deleted }
}

export async function syncCatalogToRedis(input: CatalogSyncInput) {
  const onlyKinds: SyncKind[] = input.only?.length ? input.only : ['categorias', 'produtos', 'brands']
  const batchSize = input.batchSize ?? 250
  const scanCount = input.scanCount ?? 2000
  const prune = input.prune ?? true
  const skipIfUnchanged = input.skipIfUnchanged ?? false

  if (batchSize < 1 || batchSize > 5000) throw new Error('batchSize fora do intervalo (1..5000)')
  if (scanCount < 1 || scanCount > 100000) throw new Error('scanCount fora do intervalo (1..100000)')

  const startedAt = Date.now()
  const prefix = getCatalogKeyPrefix()

  const result: {
    ok: true
    prefix: string
    fetched: Partial<Record<SyncKind, number>>
    written: Partial<Record<SyncKind, number>>
    pruned: Partial<Record<SyncKind, PruneResult>>
    ms: number
    notes: string[]
  } = { ok: true, prefix, fetched: {}, written: {}, pruned: {}, ms: 0, notes: [] }

  const needsCategoriasForProdutos = onlyKinds.includes('produtos')
  let categoriasForLookup: Categoria[] = []

  if (onlyKinds.includes('categorias') || needsCategoriasForProdutos) {
    const rawCats = await getBackListCategoria()
    const categorias = translateLopesCategoriasToCategorias(rawCats)
    categoriasForLookup = categorias
    result.fetched.categorias = Array.isArray(rawCats) ? rawCats.length : categorias.length - 1

    if (onlyKinds.includes('categorias')) {
      const existingCategories = await readExistingJsonDocsById({
        type: 'category',
        ids: categorias
          .map((c) => (c as { id?: unknown } | null)?.id)
          .filter((v): v is number | string => v !== null && v !== undefined),
        batchSize,
      })
      const categoriasMerged = categorias.map((c) => {
        if (!c || typeof c !== 'object' || Array.isArray(c)) return c
        const id = (c as { id?: unknown } | null)?.id
        const key = id === undefined || id === null ? '' : String(id)
        return mergeCategoryDocFromExisting({
          next: c as Record<string, unknown>,
          existing: key ? existingCategories.get(key) : undefined,
        })
      })

      result.written.categorias = await upsertJsonDocs({
        type: 'category',
        docs: categoriasMerged,
        batchSize,
      })
      if (prune) {
        result.pruned.categorias = await pruneByPrefix({
          scanPrefix: `${prefix}:category:`,
          keepIds: idsFromDocs(categoriasMerged),
          batchSize,
          scanCount,
        })
      }
    }
  }

  if (onlyKinds.includes('produtos')) {
    const rawProdutos = await getBackListProdutoLoja()
    const categoriasById = buildCategoriasById(categoriasForLookup)
    const brands = buildFallbackBrands()
    const brandsById = buildBrandsById(brands)
    const produtos = translateLopesProdutosToProdutosMock(rawProdutos, { categoriasById, brandsById }).map((p) => {
      const price = typeof (p as { price?: unknown }).price === 'number' ? (p as { price: number }).price : 0
      const stock = typeof (p as { stock?: unknown }).stock === 'number' ? (p as { stock: number }).stock : 0
      const hasBoth = price > 0 && stock > 0
      const priceCents = Number.isFinite(price) ? Math.max(0, Math.round(price * 100)) : 0
      const safeStock = Number.isFinite(stock) ? Math.max(0, Math.min(999_999_999, Math.trunc(stock))) : 0
      const rank = (hasBoth ? 1 : 0) * 1_000_000_000_000_000 + safeStock * 100_000_000 + priceCents
      return { ...p, rank }
    })

    let shouldWriteProdutos = true
    let produtosSignatureToPersist: { key: string; value: string } | null = null
    if (skipIfUnchanged) {
      const signature = computeProdutosSnapshotSignature(produtos)
      const client = await getCatalogRedisClient()
      const key = `${prefix}:meta:rawSignature:produtosLoja`
      const last = await client.get(key)
      if (last && last === signature) {
        shouldWriteProdutos = false
        result.written.produtos = 0
        if (prune) result.pruned.produtos = { scanned: 0, deleted: 0 }
        result.notes.push('produtos: RAW não mudou; sync pulado.')
      } else {
        produtosSignatureToPersist = { key, value: signature }
      }
    }

    if (!shouldWriteProdutos) {
      result.fetched.produtos = Array.isArray(rawProdutos) ? rawProdutos.length : produtos.length
    } else {
      const existingProducts = await readExistingJsonDocsById({
        type: 'product',
        ids: produtos.map((p) => (p as { id?: unknown } | null)?.id).filter((v): v is number | string => v !== null && v !== undefined),
        batchSize,
      })
      const produtosMerged = produtos.map((p) => {
        if (!p || typeof p !== 'object' || Array.isArray(p)) return p
        const id = (p as { id?: unknown } | null)?.id
        const key = id === undefined || id === null ? '' : String(id)
        const merged = mergeProductFromExisting({
          next: p as Record<string, unknown>,
          existing: key ? existingProducts.get(key) : undefined,
        })
        const mergedObj = merged && typeof merged === 'object' && !Array.isArray(merged) ? (merged as Record<string, unknown>) : null
        if (!mergedObj) return merged
        const brandObj = asObject(mergedObj.brand)
        if (!brandObj) return merged
        const normalized = normalizeBrandDoc(brandObj)
        if (!normalized) return merged
        const out = { ...mergedObj, brand: normalized }
        delete (out as Record<string, unknown>).brandId
        delete (out as Record<string, unknown>).marca
        return out
      })

      result.fetched.produtos = Array.isArray(rawProdutos) ? rawProdutos.length : produtos.length
      result.written.produtos = await upsertJsonDocs({
        type: 'product',
        docs: produtosMerged,
        batchSize,
      })
      if (prune) {
        result.pruned.produtos = await pruneByPrefix({
          scanPrefix: `${prefix}:product:`,
          keepIds: idsFromDocs(produtosMerged),
          batchSize,
          scanCount,
        })
      }

      if (produtosSignatureToPersist) {
        const client = await getCatalogRedisClient()
        await client.set(produtosSignatureToPersist.key, produtosSignatureToPersist.value)
      }
    }
  }

  if (onlyKinds.includes('brands')) {
    const brands = buildFallbackBrands()
    result.notes.push('brands: endpoint não existe ainda; gravado apenas fallback id=0.')
    result.fetched.brands = 0
    result.written.brands = await upsertJsonDocs({
      type: 'brand',
      docs: brands.map((b) => ({ id: b.id, nome: b.name, slug: b.slug, image: b.image })),
      batchSize,
    })
    if (prune) {
      result.pruned.brands = { scanned: 0, deleted: 0 }
    }
  }

  result.ms = Date.now() - startedAt
  return result
}

function buildCreateIndexCommand(prefix: string) {
  const keyPrefix = `${prefix}:product:`
  return [
    'FT.CREATE',
    'idx:catalog:product',
    'ON',
    'JSON',
    'PREFIX',
    '1',
    keyPrefix,
    'SCHEMA',
    '$.rank',
    'AS',
    'rank',
    'NUMERIC',
    'SORTABLE',
    '$.id',
    'AS',
    'id',
    'NUMERIC',
    'SORTABLE',
    '$.sku',
    'AS',
    'sku',
    'TAG',
    '$.name',
    'AS',
    'name',
    'TEXT',
    'SORTABLE',
    '$.slug',
    'AS',
    'slug',
    'TAG',
    '$.price',
    'AS',
    'price',
    'NUMERIC',
    'SORTABLE',
    '$.stock',
    'AS',
    'stock',
    'NUMERIC',
    'SORTABLE',
    '$.inStock',
    'AS',
    'inStock',
    'TAG',
    '$.category.id',
    'AS',
    'categoryId',
    'NUMERIC',
    'SORTABLE',
    '$.brand.id',
    'AS',
    'brandId',
    'NUMERIC',
    'SORTABLE',
    '$.badges[*]',
    'AS',
    'badges',
    'TAG',
  ]
}

function buildCreateCategoryIndexCommand(prefix: string) {
  const keyPrefix = `${prefix}:category:`
  return [
    'FT.CREATE',
    'idx:catalog:category',
    'ON',
    'JSON',
    'PREFIX',
    '1',
    keyPrefix,
    'SCHEMA',
    '$.id',
    'AS',
    'id',
    'NUMERIC',
    'SORTABLE',
    '$.parentId',
    'AS',
    'parentId',
    'NUMERIC',
    'SORTABLE',
    '$.order',
    'AS',
    'order',
    'NUMERIC',
    'SORTABLE',
    '$.name',
    'AS',
    'name',
    'TEXT',
    'SORTABLE',
    '$.slug',
    'AS',
    'slug',
    'TAG',
  ]
}

export async function ensureCatalogIndex(input?: { drop?: boolean }) {
  const client = await getCatalogRedisClient()
  const prefix = getCatalogKeyPrefix()
  const drop = Boolean(input?.drop)

  const indexes = await client.sendCommand(['FT._LIST'])
  const existing = Array.isArray(indexes) ? indexes.map(String) : []
  const hasProduct = existing.includes('idx:catalog:product')
  const hasCategory = existing.includes('idx:catalog:category')

  const product = { created: false, dropped: false }
  const category = { created: false, dropped: false }

  if (drop && hasProduct) {
    await client.sendCommand(['FT.DROPINDEX', 'idx:catalog:product', 'DD'])
    product.dropped = true
  }
  if (drop && hasCategory) {
    await client.sendCommand(['FT.DROPINDEX', 'idx:catalog:category', 'DD'])
    category.dropped = true
  }

  if (!hasProduct || drop) {
    const cmd = buildCreateIndexCommand(prefix)
    await client.sendCommand(cmd)
    product.created = true
  }

  if (!hasCategory || drop) {
    const cmd = buildCreateCategoryIndexCommand(prefix)
    await client.sendCommand(cmd)
    category.created = true
  }

  return {
    ok: true,
    created: product.created || category.created,
    dropped: product.dropped || category.dropped,
    product,
    category,
  }
}

export async function cleanCatalogNamespace(input?: { types?: Array<'category' | 'product' | 'brand'> }) {
  const client = await getCatalogRedisClient()
  const prefix = getCatalogKeyPrefix()
  const types = input?.types?.length ? input.types : (['category', 'product', 'brand'] as const)

  let scanned = 0
  let deleted = 0

  for (const type of types) {
    const match = `${prefix}:${type}:*`
    let batch: string[] = []
    const flush = async () => {
      if (!batch.length) return
      const multi = client.multi()
      for (const k of batch) multi.sendCommand(['UNLINK', k])
      await multi.exec()
      deleted += batch.length
      batch = []
    }

    for await (const chunk of client.scanIterator({ MATCH: match, COUNT: 2000 })) {
      const keys = Array.isArray(chunk) ? chunk : [chunk]
      for (const rawKey of keys) {
        scanned += 1
        batch.push(String(rawKey))
        if (batch.length >= 500) await flush()
      }
    }

    await flush()
  }

  return { ok: true, prefix, scanned, deleted, types }
}
