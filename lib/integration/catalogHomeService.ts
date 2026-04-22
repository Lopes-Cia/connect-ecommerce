import 'server-only'

import { getCatalogKeyPrefix, getCatalogRedisClient } from '@/lib/integration/catalogRedis'
import { searchCatalogProducts } from '@/lib/integration/catalogService'

function rewriteMockLocalhostAssetUrls(value: unknown): unknown {
  if (typeof value === 'string') {
    if (value === 'https://lopesecia.com.br/img/semImagem.png') return '/logo.png'
    if (value.startsWith('http://localhost:4000/assets/images/banners/banner-')) {
      const match = value.match(/banner-(\d+)\.webp$/)
      if (match?.[1]) return `/assets/banner-${match[1]}.webp`
    }
    return value
  }

  if (Array.isArray(value)) return value.map(rewriteMockLocalhostAssetUrls)

  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const next: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj)) next[k] = rewriteMockLocalhostAssetUrls(v)
    return next
  }

  return value
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = arr[i]
    arr[i] = arr[j] as T
    arr[j] = tmp as T
  }
  return arr
}

export async function importMockHomeToRedis() {
  const fs = await import('node:fs/promises')
  const path = await import('node:path')

  const filePath = path.join(process.cwd(), 'lib', 'mockups', 'data', 'colections.json')
  const raw = await fs.readFile(filePath, 'utf8')
  const parsed = rewriteMockLocalhostAssetUrls(JSON.parse(raw) as unknown)

  const client = await getCatalogRedisClient()
  const prefix = getCatalogKeyPrefix()
  const key = `${prefix}:home`
  await client.sendCommand(['JSON.SET', key, '$', JSON.stringify(parsed)])

  return { ok: true, key }
}

export async function getHomeFromRedisOrNull(): Promise<unknown | null> {
  const client = await getCatalogRedisClient()
  const prefix = getCatalogKeyPrefix()
  const key = `${prefix}:home`
  const raw = await client.sendCommand(['JSON.GET', key])
  if (typeof raw !== 'string' || !raw) return null
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

export async function getRandomInStockPricedProducts(input: { count: number }): Promise<unknown[]> {
  const candidates = await searchCatalogProducts({
    query: '@rank:[1000000000000000 +inf]',
    page: 1,
    pageSize: 200,
    sort: { field: 'rank', dir: 'desc' },
  })

  const picked = shuffleInPlace([...candidates.items]).slice(0, Math.max(0, input.count))
  return picked
}

export function applyHomeCollectionsRandomProducts(input: {
  home: unknown
  maisVendidos: unknown[]
  promocao: unknown[]
}): unknown {
  if (!input.home || typeof input.home !== 'object' || Array.isArray(input.home)) return input.home

  const root = input.home as Record<string, unknown>
  const homeObj = root.home
  if (!homeObj || typeof homeObj !== 'object' || Array.isArray(homeObj)) return input.home

  const home = homeObj as Record<string, unknown>

  const mv = home.produtos_maisvendidos
  if (mv && typeof mv === 'object' && !Array.isArray(mv)) {
    home.produtos_maisvendidos = { ...(mv as Record<string, unknown>), data: input.maisVendidos }
  }

  const promo = home.produtos_promocao
  if (promo && typeof promo === 'object' && !Array.isArray(promo)) {
    home.produtos_promocao = { ...(promo as Record<string, unknown>), data: input.promocao }
  }

  return { ...root, home }
}

