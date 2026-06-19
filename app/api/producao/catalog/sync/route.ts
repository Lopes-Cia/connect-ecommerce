import { NextRequest, NextResponse } from 'next/server'

import { syncCatalogToRedis } from '@/lib/integration/catalogAdminService'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type SyncKind = 'categorias' | 'produtos' | 'brands'

function isSyncKind(value: string): value is SyncKind {
  return value === 'categorias' || value === 'produtos' || value === 'brands'
}

function parseIntOrNull(value: string | null): number | null {
  if (!value) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

function parseBoolOrNull(value: string | null): boolean | null {
  if (!value) return null
  const v = value.trim().toLowerCase()
  if (v === 'true' || v === '1') return true
  if (v === 'false' || v === '0') return false
  return null
}

export async function POST(request: NextRequest) {
  try {
    const usp = request.nextUrl.searchParams

    const onlyRaw = usp.get('only')
    const only = onlyRaw
      ? onlyRaw
          .split(',')
          .map((s) => s.trim())
          .filter((value): value is SyncKind => Boolean(value) && isSyncKind(value))
      : undefined

    const pruneParsed = parseBoolOrNull(usp.get('prune'))
    const skipIfUnchangedParsed = parseBoolOrNull(usp.get('skipIfUnchanged'))

    const result = await syncCatalogToRedis({
      only,
      batchSize: parseIntOrNull(usp.get('batch')) ?? undefined,
      scanCount: parseIntOrNull(usp.get('scanCount')) ?? undefined,
      prune: pruneParsed ?? undefined,
      skipIfUnchanged: skipIfUnchangedParsed ?? undefined,
    })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return NextResponse.json({ ok: false, message }, { status: 500 })
  }
}

