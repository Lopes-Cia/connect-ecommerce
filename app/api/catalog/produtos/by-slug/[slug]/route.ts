import { NextRequest, NextResponse } from 'next/server'

import type { ApiSuccess } from '@/lib/types/produtos'
import { getCatalogKeyPrefix, getCatalogRedisClient } from '@/lib/integration/catalogRedis'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(_request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params
    const decoded = decodeURIComponent(String(slug ?? '').trim())
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'slug inválido' }, { status: 400 })
    }

    const fullSlug = `/produtos/${decoded}`
    const client = await getCatalogRedisClient()
    const prefix = getCatalogKeyPrefix()

    let found: unknown = null
    for await (const chunk of client.scanIterator({ MATCH: `${prefix}:product:*`, COUNT: 1000 })) {
      const keys = Array.isArray(chunk) ? chunk : [chunk]
      const multi = client.multi()
      for (const k of keys) multi.sendCommand(['JSON.GET', String(k)])
      const docs = await multi.exec()
      for (const raw of docs ?? []) {
        if (typeof raw !== 'string') continue
        try {
          const parsed = JSON.parse(raw) as { slug?: unknown }
          if (typeof parsed.slug === 'string' && parsed.slug === fullSlug) {
            found = parsed
            break
          }
        } catch {}
      }
      if (found) break
    }

    if (!found) return NextResponse.json({ success: false, message: 'Produto não encontrado' }, { status: 404 })

    const payload: ApiSuccess<unknown> = { success: true, data: found }
    return NextResponse.json(payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected Redis error'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
