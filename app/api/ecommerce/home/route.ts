import { NextResponse } from 'next/server'

import { ensureCatalogSynced } from '@/lib/integration/catalogAutoSync'
import { buildCatalogHeaders } from '@/lib/integration/catalogHeaders'
import { applyHomeCollectionsRandomProducts, getHomeFromRedisOrNull, getRandomInStockPricedProducts } from '@/lib/integration/catalogHomeService'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await ensureCatalogSynced()

    const home = await getHomeFromRedisOrNull()
    if (!home) {
      return NextResponse.json(
        { success: false, message: 'Home não importado no Redis. Rode POST /api/producao/catalog/home/import' },
        { status: 500, headers: buildCatalogHeaders({ origin: 'lopes', readModel: 'redis' }) }
      )
    }

    const [maisVendidos, promocao] = await Promise.all([
      getRandomInStockPricedProducts({ count: 8 }),
      getRandomInStockPricedProducts({ count: 8 }),
    ])

    const data = applyHomeCollectionsRandomProducts({ home, maisVendidos, promocao })
    return NextResponse.json(
      { success: true, data },
      { headers: buildCatalogHeaders({ origin: 'lopes', readModel: 'redis' }) }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected integration error'
    return NextResponse.json(
      { success: false, message },
      { status: 500, headers: buildCatalogHeaders({ origin: 'lopes', readModel: 'redis' }) }
    )
  }
}
