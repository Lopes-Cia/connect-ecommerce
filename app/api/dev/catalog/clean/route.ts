import { NextRequest, NextResponse } from 'next/server'

import { cleanCatalogNamespace } from '@/lib/integration/catalogAdminService'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const typesRaw = request.nextUrl.searchParams.get('types')
    const types = typesRaw
      ? typesRaw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined

    const result = await cleanCatalogNamespace({ types: types as any })
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return NextResponse.json({ ok: false, message }, { status: 500 })
  }
}

