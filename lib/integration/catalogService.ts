import 'server-only'

import { getCatalogKeyPrefix, getCatalogRedisClient } from '@/lib/integration/catalogRedis'

export type CatalogProductSortField = 'id' | 'name' | 'price' | 'stock' | 'rank'
export type CatalogProductSortDir = 'asc' | 'desc'

export interface CatalogProductsQueryInput {
  q?: string
  categoryId?: number
  brandId?: number
  inStock?: boolean
  priceMin?: number
  priceMax?: number
  sort?: { field: CatalogProductSortField; dir: CatalogProductSortDir }
  page: number
  pageSize: number
}

export interface CatalogProductsQueryResult<TItem = unknown> {
  total: number
  page: number
  pageSize: number
  items: TItem[]
}

const INDEX_NAME = 'idx:catalog:product'

function logCatalogSource(event: string, meta?: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'production') return
  if (meta) console.log('[DATA-SOURCE]', 'redis', event, meta)
  else console.log('[DATA-SOURCE]', 'redis', event)
}

function escapeQueryText(value: string | undefined): string {
  const v = String(value ?? '').trim()
  if (!v) return ''
  return v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function buildSearchQuery(input: {
  q?: string
  brandId?: number
  categoryId?: number
  inStock?: boolean
  priceMin?: number
  priceMax?: number
}): string {
  const parts: string[] = []

  const qText = escapeQueryText(input.q)
  if (qText) parts.push(`(@name:"${qText}")`)

  if (typeof input.brandId === 'number') parts.push(`@brandId:[${input.brandId} ${input.brandId}]`)
  if (typeof input.categoryId === 'number')
    parts.push(`@categoryId:[${input.categoryId} ${input.categoryId}]`)

  if (typeof input.inStock === 'boolean') {
    parts.push(`@inStock:{${input.inStock ? 'true' : 'false'}}`)
  }

  const min = typeof input.priceMin === 'number' ? input.priceMin : '-inf'
  const max = typeof input.priceMax === 'number' ? input.priceMax : '+inf'
  if (min !== '-inf' || max !== '+inf') parts.push(`@price:[${min} ${max}]`)

  if (!parts.length) return '*'
  return parts.join(' ')
}

type FtDoc = { key: string; fields: Record<string, unknown> }

function parseFtSearchResponse(raw: unknown): { total: number; docs: FtDoc[] } {
  if (!Array.isArray(raw) || raw.length < 1) return { total: 0, docs: [] }
  const total = Number(raw[0]) || 0

  const docs: FtDoc[] = []
  for (let i = 1; i < raw.length; i += 2) {
    const key = String(raw[i])
    const payload = raw[i + 1]
    const fieldsArray = Array.isArray(payload) ? payload : []
    const fields: Record<string, unknown> = {}
    for (let j = 0; j < fieldsArray.length; j += 2) {
      fields[String(fieldsArray[j])] = fieldsArray[j + 1]
    }
    docs.push({ key, fields })
  }

  return { total, docs }
}

function normalizeModuleName(value: unknown): string {
  return String(value ?? '').trim().toLowerCase()
}

async function listRedisModules(client: Awaited<ReturnType<typeof getCatalogRedisClient>>) {
  const raw = await client.sendCommand(['MODULE', 'LIST'])
  if (!Array.isArray(raw)) return []

  const modules: Record<string, unknown>[] = []
  for (const entry of raw) {
    if (!Array.isArray(entry)) continue
    const obj: Record<string, unknown> = {}
    for (let i = 0; i < entry.length; i += 2) {
      obj[String(entry[i])] = entry[i + 1]
    }
    modules.push(obj)
  }
  return modules
}

function detectModules(modules: Record<string, unknown>[]) {
  const names = new Set(modules.map((m) => normalizeModuleName(m.name)))
  const hasRedisJson = names.has('rejson') || names.has('redisjson') || names.has('json')
  const hasRediSearch = names.has('search') || names.has('redisearch')
  return { hasRedisJson, hasRediSearch, moduleNames: Array.from(names).filter(Boolean).sort() }
}

export async function catalogHealthcheck() {
  logCatalogSource('catalog.health')
  const client = await getCatalogRedisClient()
  const prefix = getCatalogKeyPrefix()

  const ping = await client.ping()
  const modules = await listRedisModules(client)
  const detected = detectModules(modules)

  const tmpKey = `${prefix}:__health:${Date.now()}`
  await client.sendCommand(['JSON.SET', tmpKey, '$', JSON.stringify({ ok: true })])
  const jsonGet: unknown = await client.sendCommand(['JSON.GET', tmpKey])
  await client.sendCommand(['UNLINK', tmpKey])

  const indexes: unknown = await client.sendCommand(['FT._LIST'])

  async function scanSample(match: string) {
    let count = 0
    const sample: string[] = []
    for await (const chunk of client.scanIterator({ MATCH: match, COUNT: 1000 })) {
      const keys = Array.isArray(chunk) ? chunk : [chunk]
      for (const k of keys) {
        count += 1
        if (sample.length < 5) sample.push(String(k))
      }
    }
    return { match, count, sample }
  }

  const scanCategories = await scanSample(`${prefix}:category:*`)
  const scanBrands = await scanSample(`${prefix}:brand:*`)
  const scanProducts = await scanSample(`${prefix}:product:*`)

  let categoryJsonGet: unknown = null
  if (scanCategories.sample.length) {
    const firstKey = scanCategories.sample[0]
    categoryJsonGet = (await client.sendCommand(['JSON.GET', firstKey])) as unknown
  }

  return {
    ok: true,
    ping,
    prefix,
    modules: detected,
    jsonGetOk: typeof jsonGet === 'string' && jsonGet.includes('"ok":true'),
    indexes: Array.isArray(indexes) ? indexes.map(String) : [],
    keys: {
      categories: scanCategories,
      brands: scanBrands,
      products: scanProducts,
    },
    categoryJsonGetOk: typeof categoryJsonGet === 'string' && categoryJsonGet.length > 0,
  }
}

export async function queryCatalogProducts<TItem = unknown>(
  input: CatalogProductsQueryInput
): Promise<CatalogProductsQueryResult<TItem>> {
  const query = buildSearchQuery({
    q: input.q,
    brandId: input.brandId,
    categoryId: input.categoryId,
    inStock: input.inStock,
    priceMin: input.priceMin,
    priceMax: input.priceMax,
  })
  return searchCatalogProducts<TItem>({ query, page: input.page, pageSize: input.pageSize, sort: input.sort })
}

export async function searchCatalogProducts<TItem = unknown>(input: {
  query: string
  page: number
  pageSize: number
  sort?: { field: CatalogProductSortField; dir: CatalogProductSortDir }
}): Promise<CatalogProductsQueryResult<TItem>> {
  logCatalogSource('catalog.search', { page: input.page, pageSize: input.pageSize })
  const client = await getCatalogRedisClient()

  const sort = input.sort ?? { field: 'name', dir: 'asc' }
  const offset = (input.page - 1) * input.pageSize

  const raw = await client.sendCommand([
    'FT.SEARCH',
    INDEX_NAME,
    input.query,
    'SORTBY',
    sort.field,
    sort.dir.toUpperCase(),
    'LIMIT',
    String(offset),
    String(input.pageSize),
    'RETURN',
    '1',
    '$',
    'DIALECT',
    '2',
  ])

  const parsed = parseFtSearchResponse(raw)
  const items = parsed.docs
    .map((d) => d.fields?.['$'])
    .filter((v): v is string => typeof v === 'string')
    .map((v) => {
      try {
        return JSON.parse(v) as TItem
      } catch {
        return null
      }
    })
    .filter((v): v is TItem => Boolean(v))

  return { total: parsed.total, page: input.page, pageSize: input.pageSize, items }
}

async function fetchJsonByKeyPrefix<TDoc>(input: { keyPrefix: string; batchSize?: number }): Promise<TDoc[]> {
  const client = await getCatalogRedisClient()
  const batchSize = input.batchSize ?? 200

  const docs: TDoc[] = []
  let batch: string[] = []

  const flush = async () => {
    if (!batch.length) return
    const multi = client.multi()
    for (const key of batch) multi.sendCommand(['JSON.GET', key])
    const results = await multi.exec()
    for (const r of results ?? []) {
      if (typeof r !== 'string') continue
      try {
        docs.push(JSON.parse(r) as TDoc)
      } catch {}
    }
    batch = []
  }

  for await (const key of client.scanIterator({ MATCH: `${input.keyPrefix}*`, COUNT: 1000 })) {
    const keys = Array.isArray(key) ? key : [key]
    for (const k of keys) {
      batch.push(String(k))
      if (batch.length >= batchSize) await flush()
    }
  }

  await flush()
  return docs
}

export async function listCatalogCategories<TCategory = unknown>(): Promise<TCategory[]> {
  logCatalogSource('catalog.categories.list')
  const prefix = getCatalogKeyPrefix()
  const keyPrefix = `${prefix}:category:`
  return fetchJsonByKeyPrefix<TCategory>({ keyPrefix })
}

export async function listCatalogBrands<TBrand = unknown>(): Promise<TBrand[]> {
  logCatalogSource('catalog.brands.list')
  const prefix = getCatalogKeyPrefix()
  const keyPrefix = `${prefix}:brand:`
  return fetchJsonByKeyPrefix<TBrand>({ keyPrefix })
}
