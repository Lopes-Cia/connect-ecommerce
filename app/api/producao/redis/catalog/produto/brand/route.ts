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

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function slugify(value: string): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeBrandDoc(input: { id: number; doc: Record<string, unknown> | null }) {
  const nome = asString(input.doc?.nome) || asString(input.doc?.name) || `Marca ${input.id}`
  const slug = asString(input.doc?.slug) || `/marca/${slugify(nome) || 'no-brand'}`
  const image = asString(input.doc?.image) || 'https://lopesecia.com.br/img/semImagem.png'
  return { id: input.id, nome, slug, image }
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
    const idBrand = asNumber(record.idBrand)

    if (!idProduto || idProduto <= 0 || !Number.isInteger(idProduto)) {
      return NextResponse.json({ ok: false, message: 'idProduto inválido' }, { status: 400, headers })
    }

    if (idBrand === null || idBrand < 0 || !Number.isInteger(idBrand)) {
      return NextResponse.json({ ok: false, message: 'idBrand inválido' }, { status: 400, headers })
    }

    const client = await getCatalogRedisClient()
    const prefix = getCatalogKeyPrefix()
    const productKey = `${prefix}:product:${idProduto}`

    const raw = await client.sendCommand(['JSON.GET', productKey])
    if (typeof raw !== 'string' || !raw) {
      return NextResponse.json({ ok: false, message: 'Chave não encontrada', key: productKey }, { status: 404, headers })
    }

    const doc = JSON.parse(raw) as Record<string, unknown>
    const beforeBrand = asRecord(doc.brand)

    if (idBrand === 0) {
      doc.brand = normalizeBrandDoc({ id: 0, doc: { nome: 'No Brand', slug: '/marca/no-brand' } })
      await client.sendCommand(['JSON.SET', productKey, '$', JSON.stringify(doc)])
      return NextResponse.json(
        { ok: true, key: productKey, before: { brand: beforeBrand }, after: { brand: doc.brand } },
        { headers }
      )
    }

    const brandKey = `${prefix}:brand:${idBrand}`
    const brandRaw = await client.sendCommand(['JSON.GET', brandKey])
    if (typeof brandRaw !== 'string' || !brandRaw) {
      return NextResponse.json({ ok: false, message: 'Brand não encontrada', key: brandKey }, { status: 404, headers })
    }

    const brandParsed = asRecord(JSON.parse(brandRaw) as unknown)
    doc.brand = normalizeBrandDoc({ id: idBrand, doc: brandParsed })

    await client.sendCommand(['JSON.SET', productKey, '$', JSON.stringify(doc)])

    return NextResponse.json(
      { ok: true, key: productKey, before: { brand: beforeBrand }, after: { brand: doc.brand } },
      { headers }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected Redis error'
    return NextResponse.json({ ok: false, message }, { status: 500, headers })
  }
}

