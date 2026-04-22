import 'server-only'

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
      image: 'http://localhost:4000/assets/images/semImagem.png',
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
      result.written.categorias = await upsertJsonDocs({
        type: 'category',
        docs: categorias,
        batchSize,
      })
      if (prune) {
        result.pruned.categorias = await pruneByPrefix({
          scanPrefix: `${prefix}:category:`,
          keepIds: idsFromDocs(categorias),
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

    result.fetched.produtos = Array.isArray(rawProdutos) ? rawProdutos.length : produtos.length
    result.written.produtos = await upsertJsonDocs({
      type: 'product',
      docs: produtos,
      batchSize,
    })
    if (prune) {
      result.pruned.produtos = await pruneByPrefix({
        scanPrefix: `${prefix}:product:`,
        keepIds: idsFromDocs(produtos),
        batchSize,
        scanCount,
      })
    }
  }

  if (onlyKinds.includes('brands')) {
    const brands = buildFallbackBrands()
    result.notes.push('brands: endpoint não existe ainda; gravado apenas fallback id=0.')
    result.fetched.brands = 0
    result.written.brands = await upsertJsonDocs({
      type: 'brand',
      docs: brands,
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

export async function ensureCatalogIndex(input?: { drop?: boolean }) {
  const client = await getCatalogRedisClient()
  const prefix = getCatalogKeyPrefix()
  const drop = Boolean(input?.drop)

  const indexes = await client.sendCommand(['FT._LIST'])
  const existing = Array.isArray(indexes) ? indexes.map(String) : []
  const has = existing.includes('idx:catalog:product')

  if (drop && has) {
    await client.sendCommand(['FT.DROPINDEX', 'idx:catalog:product', 'DD'])
  }

  if (!has || drop) {
    const cmd = buildCreateIndexCommand(prefix)
    await client.sendCommand(cmd)
    return { ok: true, created: true, dropped: drop && has }
  }

  return { ok: true, created: false, dropped: false }
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
