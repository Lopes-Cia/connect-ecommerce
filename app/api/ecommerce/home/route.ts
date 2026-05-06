import { NextResponse } from 'next/server'

import { HttpError } from '@/lib/integration/network'
import { getHome } from '@/lib/integration/ecommerceService'
import { applyHomeCollectionsRandomProducts, getHomeFromRedisOrNull, getRandomInStockPricedProducts } from '@/lib/integration/catalogHomeService'

export const dynamic = 'force-dynamic'

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

export async function GET() {
  try {
    const fonte = String(process.env.FONTE ?? process.env.NEXT_PUBLIC_FONTE ?? '').trim().toLowerCase()
    const catalogFonte = String(process.env.CATALOGO_FONTE ?? process.env.NEXT_PUBLIC_CATALOGO_FONTE ?? '').trim().toLowerCase()
    const useRedisCatalog = catalogFonte === 'redis' || fonte === 'redis'
    if (useRedisCatalog) {
      const home = await getHomeFromRedisOrNull()
      if (!home) {
        return NextResponse.json(
          { success: false, message: 'Home não importado no Redis. Rode POST /api/dev/catalog/home/import' },
          { status: 500, headers: { 'x-data-source': 'redis (missing home)' } }
        )
      }

      const [maisVendidos, promocao] = await Promise.all([
        getRandomInStockPricedProducts({ count: 8 }),
        getRandomInStockPricedProducts({ count: 8 }),
      ])

      const data = applyHomeCollectionsRandomProducts({ home, maisVendidos, promocao })
      return NextResponse.json(
        { success: true, data },
        { headers: { 'x-data-source': 'redis (home + random products)' } }
      )
    }
    if (fonte === 'lopes' || fonte === 'mock') {
      const fs = await import('node:fs/promises')
      const path = await import('node:path')
      const filePath = path.join(process.cwd(), 'lib', 'mockups', 'data', 'colections.json')
      const raw = await fs.readFile(filePath, 'utf8')
      const parsed = rewriteMockLocalhostAssetUrls(JSON.parse(raw) as unknown)
      return NextResponse.json(
        { success: true, data: parsed },
        { headers: { 'x-data-source': `colections.json (${fonte})` } }
      )
    }

    const result = await getHome()
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        error.data ?? { success: false, message: 'Erro na integração (ecommerce)' },
        { status: error.status }
      )
    }

    const message = error instanceof Error ? error.message : 'Unexpected integration error'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
