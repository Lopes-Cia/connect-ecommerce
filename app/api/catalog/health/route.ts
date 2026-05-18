import { NextResponse } from 'next/server'

import { buildCatalogHeaders } from '@/lib/integration/catalogHeaders'
import { catalogHealthcheck } from '@/lib/integration/catalogService'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const result = await catalogHealthcheck()
    return NextResponse.json(result, { headers: buildCatalogHeaders({ origin: 'lopes', readModel: 'redis' }) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected Redis error'
    return NextResponse.json(
      { ok: false, message },
      { status: 500, headers: buildCatalogHeaders({ origin: 'lopes', readModel: 'redis' }) }
    )
  }
}
