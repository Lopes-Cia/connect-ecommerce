import { NextResponse } from 'next/server'

import { ensureCatalogSynced } from '@/lib/integration/catalogAutoSync'
import { listCatalogBrands } from '@/lib/integration/catalogService'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    await ensureCatalogSynced()
    const items = await listCatalogBrands()
    return NextResponse.json(items)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected Redis error'
    return NextResponse.json({ message }, { status: 500 })
  }
}
