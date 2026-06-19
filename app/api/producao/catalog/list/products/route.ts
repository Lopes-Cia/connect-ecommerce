import { NextRequest, NextResponse } from 'next/server'

import { getCatalogKeyPrefix, getCatalogRedisClient } from '@/lib/integration/catalogRedis'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function assertDevOnly() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Endpoint disponível somente em ambiente de desenvolvimento.')
  }
}

function parseLimit(value: string | null): number {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed <= 0) return 50
  return Math.min(parsed, 200)
}

function parseIdFromKey(key: string, prefix: string): string {
  const base = `${prefix}:product:`
  if (!key.startsWith(base)) return ''
  return key.slice(base.length)
}

export async function GET(request: NextRequest) {
  try {
    assertDevOnly()
    const client = await getCatalogRedisClient()
    const prefix = getCatalogKeyPrefix()
    const limit = parseLimit(request.nextUrl.searchParams.get('limit'))

    const keys: string[] = []
    for await (const chunk of client.scanIterator({ MATCH: `${prefix}:product:*`, COUNT: 1000 })) {
      const arr = Array.isArray(chunk) ? chunk : [chunk]
      for (const k of arr) {
        keys.push(String(k))
        if (keys.length >= limit) break
      }
      if (keys.length >= limit) break
    }

    const multi = client.multi()
    for (const key of keys) multi.sendCommand(['JSON.GET', key])
    const results = await multi.exec()

    const items: Array<{ id: string; key: string; doc: unknown }> = []
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i]
      const raw = results?.[i]
      if (typeof raw !== 'string') continue
      try {
        const doc = JSON.parse(raw) as unknown
        const id = parseIdFromKey(key, prefix)
        items.push({ id, key, doc })
      } catch {}
    }

    return NextResponse.json({ ok: true, prefix, limit, count: items.length, items })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    const status = message.includes('somente em ambiente') ? 404 : 500
    return NextResponse.json({ ok: false, message }, { status })
  }
}

