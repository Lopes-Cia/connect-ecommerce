import { NextResponse } from 'next/server'

import { listCatalogCategories } from '@/lib/integration/catalogService'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const items = await listCatalogCategories()
    return NextResponse.json(items)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected Redis error'
    return NextResponse.json({ message }, { status: 500 })
  }
}
