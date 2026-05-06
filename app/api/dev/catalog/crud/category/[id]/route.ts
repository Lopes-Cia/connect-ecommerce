import { NextRequest, NextResponse } from 'next/server'

import { getCatalogKeyPrefix, getCatalogRedisClient } from '@/lib/integration/catalogRedis'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function assertDevOnly() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Endpoint disponível somente em ambiente de desenvolvimento.')
  }
}

function parseCategoryId(raw: string): string {
  const id = String(raw ?? '').trim()
  if (!id) throw new Error('id inválido')
  if (!/^\d+$/.test(id)) throw new Error('id deve ser numérico')
  return id
}

function buildCategoryKey(id: string) {
  const prefix = getCatalogKeyPrefix()
  return `${prefix}:category:${id}`
}

function parseJsonBody(body: unknown) {
  if (body && typeof body === 'object' && 'doc' in body) {
    const doc = (body as { doc?: unknown }).doc
    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) throw new Error('doc deve ser um objeto JSON')
    return doc as Record<string, unknown>
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('body deve ser um objeto JSON')
  return body as Record<string, unknown>
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    assertDevOnly()
    const { id: rawId } = await context.params
    const id = parseCategoryId(rawId)
    const client = await getCatalogRedisClient()
    const key = buildCategoryKey(id)

    const raw: unknown = await client.sendCommand(['JSON.GET', key])
    if (raw === null) return NextResponse.json({ ok: true, key, exists: false, data: null })

    const jsonText = typeof raw === 'string' ? raw : JSON.stringify(raw)
    let data: unknown = null
    try {
      data = JSON.parse(jsonText)
    } catch {
      data = jsonText
    }

    return NextResponse.json({ ok: true, key, exists: true, data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    const status = message.includes('somente em ambiente') ? 404 : 500
    return NextResponse.json({ ok: false, message }, { status })
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    assertDevOnly()
    const { id: rawId } = await context.params
    const id = parseCategoryId(rawId)
    const client = await getCatalogRedisClient()
    const key = buildCategoryKey(id)

    const body = await request.json()
    const doc = parseJsonBody(body)

    await client.sendCommand(['JSON.SET', key, '$', JSON.stringify(doc)])

    return NextResponse.json({ ok: true, key })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    const status = message.includes('somente em ambiente') ? 404 : 500
    return NextResponse.json({ ok: false, message }, { status })
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    assertDevOnly()
    const { id: rawId } = await context.params
    const id = parseCategoryId(rawId)
    const client = await getCatalogRedisClient()
    const key = buildCategoryKey(id)

    const unlinked = await client.sendCommand(['UNLINK', key])
    const removed = Number(unlinked) > 0

    return NextResponse.json({ ok: true, key, removed })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    const status = message.includes('somente em ambiente') ? 404 : 500
    return NextResponse.json({ ok: false, message }, { status })
  }
}

