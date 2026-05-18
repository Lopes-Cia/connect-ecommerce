import { NextResponse } from 'next/server'

import { ensureCatalogSynced } from '@/lib/integration/catalogAutoSync'
import { buildCatalogHeaders } from '@/lib/integration/catalogHeaders'
import { listCatalogCategories } from '@/lib/integration/catalogService'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    await ensureCatalogSynced()
    const items = await listCatalogCategories()
    return NextResponse.json(items, { headers: buildCatalogHeaders({ origin: 'lopes', readModel: 'redis' }) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected Redis error'
    return NextResponse.json(
      { message },
      { status: 500, headers: buildCatalogHeaders({ origin: 'lopes', readModel: 'redis' }) }
    )
  }
}
