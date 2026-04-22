import { NextResponse } from 'next/server'

import type { ApiSuccess, Brand } from '@/lib/types/produtos'
import { listCatalogBrands } from '@/lib/integration/catalogService'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const brands = await listCatalogBrands<Brand>()
    const payload: ApiSuccess<Brand[]> = { success: true, data: brands }
    return NextResponse.json(payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected Redis error'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}

