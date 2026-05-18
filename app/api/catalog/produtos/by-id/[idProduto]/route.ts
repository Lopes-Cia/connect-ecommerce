import { NextRequest, NextResponse } from 'next/server'

import type { ApiSuccess } from '@/lib/types/produtos'
import { ensureCatalogSynced } from '@/lib/integration/catalogAutoSync'
import { buildCatalogHeaders } from '@/lib/integration/catalogHeaders'
import { getCatalogKeyPrefix, getCatalogRedisClient } from '@/lib/integration/catalogRedis'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(_request: NextRequest, context: { params: Promise<{ idProduto: string }> }) {
  try {
    await ensureCatalogSynced()
    const headers = buildCatalogHeaders({ origin: 'lopes', readModel: 'redis' })
    const { idProduto } = await context.params
    const parsedId = Number.parseInt(idProduto, 10)
    if (Number.isNaN(parsedId)) {
      return NextResponse.json({ success: false, message: 'idProduto must be a valid number' }, { status: 400, headers })
    }

    const client = await getCatalogRedisClient()
    const prefix = getCatalogKeyPrefix()
    const raw = await client.sendCommand(['JSON.GET', `${prefix}:product:${parsedId}`])
    if (typeof raw !== 'string' || !raw) {
      return NextResponse.json({ success: false, message: 'Produto não encontrado' }, { status: 404, headers })
    }

    const product = JSON.parse(raw) as unknown
    const payload: ApiSuccess<unknown> = { success: true, data: product }
    return NextResponse.json(payload, { headers })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected Redis error'
    return NextResponse.json(
      { success: false, message },
      { status: 500, headers: buildCatalogHeaders({ origin: 'lopes', readModel: 'redis' }) }
    )
  }
}

