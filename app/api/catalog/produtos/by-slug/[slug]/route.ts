import { NextRequest, NextResponse } from 'next/server'

import type { ApiSuccess } from '@/lib/types/produtos'
import { ensureCatalogSynced } from '@/lib/integration/catalogAutoSync'
import { buildCatalogHeaders } from '@/lib/integration/catalogHeaders'
import { getCatalogProductBySlug } from '@/lib/integration/catalogService'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(_request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    await ensureCatalogSynced()
    const { slug } = await context.params
    const decoded = decodeURIComponent(String(slug ?? '').trim())
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'slug inválido' },
        { status: 400, headers: buildCatalogHeaders({ origin: 'lopes', readModel: 'redis' }) }
      )
    }

    const fullSlug = `/produtos/${decoded}`
    const found = await getCatalogProductBySlug(fullSlug)

    if (!found) {
      return NextResponse.json(
        { success: false, message: 'Produto não encontrado' },
        { status: 404, headers: buildCatalogHeaders({ origin: 'lopes', readModel: 'redis' }) }
      )
    }

    const payload: ApiSuccess<unknown> = { success: true, data: found }
    return NextResponse.json(payload, { headers: buildCatalogHeaders({ origin: 'lopes', readModel: 'redis' }) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected Redis error'
    return NextResponse.json(
      { success: false, message },
      { status: 500, headers: buildCatalogHeaders({ origin: 'lopes', readModel: 'redis' }) }
    )
  }
}
