import { NextRequest, NextResponse } from 'next/server'

import { buildCatalogHeaders } from '@/lib/integration/catalogHeaders'
import { getCatalogKeyPrefix, getCatalogRedisClient } from '@/lib/integration/catalogRedis'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

export async function POST(request: NextRequest) {
  const headers = buildCatalogHeaders({ origin: 'lopes', readModel: 'redis' })

  try {
    const input = (await request.json().catch(() => null)) as unknown
    const record = asRecord(input)
    if (!record) {
      return NextResponse.json({ ok: false, message: 'Body inválido' }, { status: 400, headers })
    }

    const idProduto = asNumber(record.idProduto)
    const patch = asRecord(record.patch)
    if (!idProduto || idProduto <= 0 || !Number.isInteger(idProduto)) {
      return NextResponse.json({ ok: false, message: 'idProduto inválido' }, { status: 400, headers })
    }
    if (!patch) {
      return NextResponse.json({ ok: false, message: 'patch inválido' }, { status: 400, headers })
    }

    const client = await getCatalogRedisClient()
    const prefix = getCatalogKeyPrefix()
    const key = `${prefix}:product:${idProduto}`

    const raw = await client.sendCommand(['JSON.GET', key])
    if (typeof raw !== 'string' || !raw) {
      return NextResponse.json({ ok: false, message: 'Chave não encontrada', key }, { status: 404, headers })
    }

    const doc = JSON.parse(raw) as Record<string, unknown>

    if (typeof patch.sku === 'string') doc.sku = patch.sku
    if (typeof patch.slug === 'string') doc.slug = patch.slug
    if (typeof patch.name === 'string') doc.name = patch.name
    if (typeof patch.unitLabel === 'string') doc.unitLabel = patch.unitLabel
    if (typeof patch.sizeLabel === 'string') doc.sizeLabel = patch.sizeLabel
    if (typeof patch.price === 'number') doc.price = patch.price
    if (typeof patch.stock === 'number') doc.stock = patch.stock
    if (typeof patch.qtUnit === 'number') doc.qtUnit = patch.qtUnit
    if (typeof patch.qtUnitCaixa === 'number') doc.qtUnitCaixa = patch.qtUnitCaixa
    if (typeof patch.inStock === 'boolean') doc.inStock = patch.inStock
    if (patch.compareAtPrice === null || typeof patch.compareAtPrice === 'number') {
      doc.compareAtPrice = patch.compareAtPrice
    }

    await client.sendCommand(['JSON.SET', key, '$', JSON.stringify(doc)])

    return NextResponse.json({ ok: true }, { headers })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected Redis error'
    return NextResponse.json({ ok: false, message }, { status: 500, headers })
  }
}
