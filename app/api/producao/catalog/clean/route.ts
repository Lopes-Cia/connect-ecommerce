import { NextRequest, NextResponse } from 'next/server'

import { cleanCatalogNamespace } from '@/lib/integration/catalogAdminService'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type CleanType = 'category' | 'product' | 'brand'

function isCleanType(value: string): value is CleanType {
  return value === 'category' || value === 'product' || value === 'brand'
}

export async function POST(request: NextRequest) {
  try {
    const typesRaw = request.nextUrl.searchParams.get('types')
    const types = typesRaw
      ? typesRaw
          .split(',')
          .map((s) => s.trim())
          .filter((value): value is CleanType => Boolean(value) && isCleanType(value))
      : undefined

    const result = await cleanCatalogNamespace({ types })
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return NextResponse.json({ ok: false, message }, { status: 500 })
  }
}

