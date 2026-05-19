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

export async function POST(request: NextRequest) {
  const headers = buildCatalogHeaders({ origin: 'lopes', readModel: 'redis' })

  try {
    const input = (await request.json().catch(() => null)) as unknown
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return NextResponse.json({ ok: false, message: 'Body inválido' }, { status: 400, headers })
    }

    const record = input as Record<string, unknown>
    const idProduto = asNumber(record.idProduto)
    const stock = asNumber(record.stock)

    if (!idProduto || idProduto <= 0 || !Number.isInteger(idProduto)) {
      return NextResponse.json({ ok: false, message: 'idProduto inválido' }, { status: 400, headers })
    }

    if (stock === null || stock < 0) {
      return NextResponse.json({ ok: false, message: 'stock inválido' }, { status: 400, headers })
    }

    const client = await getCatalogRedisClient()
    const prefix = getCatalogKeyPrefix()
    const key = `${prefix}:product:${idProduto}`

    const raw = await client.sendCommand(['JSON.GET', key])
    if (typeof raw !== 'string' || !raw) {
      return NextResponse.json({ ok: false, message: 'Chave não encontrada', key }, { status: 404, headers })
    }

    const doc = JSON.parse(raw) as Record<string, unknown>
    const before = asNumber(doc.stock)
    doc.stock = stock

    await client.sendCommand(['JSON.SET', key, '$', JSON.stringify(doc)])

    return NextResponse.json({ ok: true, key, before: { stock: before }, after: { stock } }, { headers })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected Redis error'
    return NextResponse.json({ ok: false, message }, { status: 500, headers })
  }
}
