import { NextRequest, NextResponse } from 'next/server'

import { ensureCatalogIndex } from '@/lib/integration/catalogAdminService'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function parseBoolOrNull(value: string | null): boolean | null {
  if (!value) return null
  const v = value.trim().toLowerCase()
  if (v === 'true' || v === '1') return true
  if (v === 'false' || v === '0') return false
  return null
}

export async function POST(request: NextRequest) {
  try {
    const drop = parseBoolOrNull(request.nextUrl.searchParams.get('drop')) ?? false
    const result = await ensureCatalogIndex({ drop })
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return NextResponse.json({ ok: false, message }, { status: 500 })
  }
}

