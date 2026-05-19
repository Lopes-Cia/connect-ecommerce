import { NextRequest, NextResponse } from 'next/server'

import { buildCatalogHeaders } from '@/lib/integration/catalogHeaders'
import { getCatalogKeyPrefix, getCatalogRedisClient } from '@/lib/integration/catalogRedis'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

export async function GET(_request: NextRequest, context: { params: Promise<{ idBrand: string }> }) {
  const headers = buildCatalogHeaders({ origin: 'lopes', readModel: 'redis' })

  try {
    const { idBrand } = await context.params
    const parsedId = Number.parseInt(idBrand, 10)
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      return NextResponse.json({ ok: false, message: 'idBrand inválido' }, { status: 400, headers })
    }

    const client = await getCatalogRedisClient()
    const prefix = getCatalogKeyPrefix()
    const key = `${prefix}:brand:${parsedId}`

    const raw = await client.sendCommand(['JSON.GET', key])
    if (typeof raw !== 'string' || !raw) {
      return NextResponse.json({ ok: false, message: 'Chave não encontrada', key }, { status: 404, headers })
    }

    return NextResponse.json({ ok: true, key, data: JSON.parse(raw) as unknown }, { headers })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected Redis error'
    return NextResponse.json({ ok: false, message }, { status: 500, headers })
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ idBrand: string }> }) {
  const headers = buildCatalogHeaders({ origin: 'lopes', readModel: 'redis' })

  try {
    const { idBrand } = await context.params
    const parsedId = Number.parseInt(idBrand, 10)
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      return NextResponse.json({ ok: false, message: 'idBrand inválido' }, { status: 400, headers })
    }

    const input = (await request.json().catch(() => null)) as unknown
    const record = asRecord(input)
    if (!record) {
      return NextResponse.json({ ok: false, message: 'Body inválido' }, { status: 400, headers })
    }

    const client = await getCatalogRedisClient()
    const prefix = getCatalogKeyPrefix()
    const key = `${prefix}:brand:${parsedId}`

    const existingRaw = await client.sendCommand(['JSON.GET', key])
    const existing = typeof existingRaw === 'string' && existingRaw ? (JSON.parse(existingRaw) as unknown) : null
    const existingRecord = asRecord(existing)

    const nome = asString(record.nome) || asString(record.name) || asString(existingRecord?.nome) || asString(existingRecord?.name)
    if (!nome) {
      return NextResponse.json({ ok: false, message: 'nome é obrigatório' }, { status: 400, headers })
    }

    const slug = asString(record.slug) || asString(existingRecord?.slug)
    const image = asString(record.image) || asString(existingRecord?.image)

    const doc = { ...(existingRecord ?? {}), id: parsedId, nome, slug, image }

    await client.sendCommand(['JSON.SET', key, '$', JSON.stringify(doc)])

    return NextResponse.json({ ok: true, key, data: doc }, { headers })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected Redis error'
    return NextResponse.json({ ok: false, message }, { status: 500, headers })
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ idBrand: string }> }) {
  const headers = buildCatalogHeaders({ origin: 'lopes', readModel: 'redis' })

  try {
    const { idBrand } = await context.params
    const parsedId = Number.parseInt(idBrand, 10)
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      return NextResponse.json({ ok: false, message: 'idBrand inválido' }, { status: 400, headers })
    }

    const client = await getCatalogRedisClient()
    const prefix = getCatalogKeyPrefix()
    const key = `${prefix}:brand:${parsedId}`

    const deleted = await client.sendCommand(['UNLINK', key])

    return NextResponse.json({ ok: true, key, deleted }, { headers })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected Redis error'
    return NextResponse.json({ ok: false, message }, { status: 500, headers })
  }
}

