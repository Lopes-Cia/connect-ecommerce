import { NextResponse } from 'next/server'

import type { ApiSuccess, Brand } from '@/lib/types/produtos'
import { ensureCatalogSynced } from '@/lib/integration/catalogAutoSync'
import { buildCatalogHeaders } from '@/lib/integration/catalogHeaders'
import { listCatalogBrands } from '@/lib/integration/catalogService'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    await ensureCatalogSynced()
    const brands = await listCatalogBrands<Brand>()
    const payload: ApiSuccess<Brand[]> = { success: true, data: brands }
    return NextResponse.json(payload, { headers: buildCatalogHeaders({ origin: 'lopes', readModel: 'redis' }) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected Redis error'
    return NextResponse.json(
      { success: false, message },
      { status: 500, headers: buildCatalogHeaders({ origin: 'lopes', readModel: 'redis' }) }
    )
  }
}

