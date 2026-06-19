import { NextRequest, NextResponse } from 'next/server'

import type { ApiSuccess } from '@/lib/types/produtos'
import { buildCatalogHeaders } from '@/lib/integration/catalogHeaders'
import { getCatalogKeyPrefix, getCatalogRedisClient } from '@/lib/integration/catalogRedis'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type OverwriteFlags = {
  category: 0 | 1
  brand: 0 | 1
  image: 0 | 1
  name: 0 | 1
  slug: 0 | 1
}

const DEFAULT_FLAGS: OverwriteFlags = { category: 0, brand: 0, image: 0, name: 0, slug: 0 }

function normalizeFlag(value: unknown): 0 | 1 {
  if (value === true) return 1
  if (value === false) return 0
  if (value === 1 || value === '1') return 1
  return 0
}

function toFlags(value: unknown): OverwriteFlags {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return DEFAULT_FLAGS
  const record = value as Record<string, unknown>
  return {
    category: normalizeFlag(record.category),
    brand: normalizeFlag(record.brand),
    image: normalizeFlag(record.image),
    name: normalizeFlag(record.name),
    slug: normalizeFlag(record.slug),
  }
}

export async function GET(_request: NextRequest, context: { params: Promise<{ idProduto: string }> }) {
  const headers = buildCatalogHeaders({ origin: 'lopes', readModel: 'redis' })

  try {
    const { idProduto } = await context.params
    const parsedId = Number.parseInt(idProduto, 10)
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      return NextResponse.json({ success: false, message: 'idProduto must be a valid number' }, { status: 400, headers })
    }

    const client = await getCatalogRedisClient()
    const prefix = getCatalogKeyPrefix()
    const key = `${prefix}:product_overwrite:${parsedId}`

    const raw = await client.sendCommand(['JSON.GET', key])
    if (typeof raw !== 'string' || !raw) {
      const payload: ApiSuccess<OverwriteFlags> = { success: true, data: DEFAULT_FLAGS }
      return NextResponse.json(payload, { headers })
    }

    const parsed = JSON.parse(raw) as unknown
    const payload: ApiSuccess<OverwriteFlags> = { success: true, data: toFlags(parsed) }
    return NextResponse.json(payload, { headers })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected Redis error'
    return NextResponse.json({ success: false, message }, { status: 500, headers })
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ idProduto: string }> }) {
  const headers = buildCatalogHeaders({ origin: 'lopes', readModel: 'redis' })

  try {
    const { idProduto } = await context.params
    const parsedId = Number.parseInt(idProduto, 10)
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      return NextResponse.json({ success: false, message: 'idProduto must be a valid number' }, { status: 400, headers })
    }

    const body = (await request.json().catch(() => null)) as unknown
    const flags = toFlags(body)

    const client = await getCatalogRedisClient()
    const prefix = getCatalogKeyPrefix()
    const key = `${prefix}:product_overwrite:${parsedId}`

    await client.sendCommand(['JSON.SET', key, '$', JSON.stringify(flags)])

    const payload: ApiSuccess<OverwriteFlags> = { success: true, data: flags }
    return NextResponse.json(payload, { headers })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected Redis error'
    return NextResponse.json({ success: false, message }, { status: 500, headers })
  }
}

