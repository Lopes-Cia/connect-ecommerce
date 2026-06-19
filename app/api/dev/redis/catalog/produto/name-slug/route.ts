import { NextRequest, NextResponse } from 'next/server'

import { buildCatalogHeaders } from '@/lib/integration/catalogHeaders'
import { getCatalogKeyPrefix, getCatalogRedisClient } from '@/lib/integration/catalogRedis'
import { slugify } from '@/lib/utils'

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

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeProductSlug(input: { idProduto: number; name: string; slug: string }): string {
  const provided = input.slug.trim()
  if (provided) {
    const withoutLeading = provided.replace(/^\/+/, '')
    if (withoutLeading.startsWith('produtos/')) return `/${withoutLeading}`
    return `/produtos/${withoutLeading}`
  }

  const baseSlug = slugify(input.name)
  return `/produtos/${baseSlug || `produto-${input.idProduto}`}-${input.idProduto}`
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
    const name = asString(record.name)
    const slug = asString(record.slug)

    if (!idProduto || idProduto <= 0 || !Number.isInteger(idProduto)) {
      return NextResponse.json({ ok: false, message: 'idProduto inválido' }, { status: 400, headers })
    }

    if (!name) {
      return NextResponse.json({ ok: false, message: 'name inválido' }, { status: 400, headers })
    }

    const client = await getCatalogRedisClient()
    const prefix = getCatalogKeyPrefix()
    const key = `${prefix}:product:${idProduto}`

    const raw = await client.sendCommand(['JSON.GET', key])
    if (typeof raw !== 'string' || !raw) {
      return NextResponse.json({ ok: false, message: 'Chave não encontrada', key }, { status: 404, headers })
    }

    const doc = JSON.parse(raw) as Record<string, unknown>
    const before = {
      name: asString(doc.name),
      slug: asString(doc.slug),
    }

    doc.name = name
    doc.slug = normalizeProductSlug({ idProduto, name, slug })

    await client.sendCommand(['JSON.SET', key, '$', JSON.stringify(doc)])

    return NextResponse.json(
      { ok: true, key, before, after: { name: doc.name, slug: doc.slug } },
      { headers }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected Redis error'
    return NextResponse.json({ ok: false, message }, { status: 500, headers })
  }
}
