import { NextRequest, NextResponse } from 'next/server'

import { getCatalogKeyPrefix, getCatalogRedisClient } from '@/lib/integration/catalogRedis'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BRAND_PLACEHOLDER_IMAGE = 'https://lopesecia.com.br/img/semImagem.png'

function assertDevOnly() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Endpoint disponível somente em ambiente de desenvolvimento.')
  }
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

function normalizeName(value: string): string {
  const text = String(value ?? '').trim().toLowerCase()
  if (!text) return ''
  try {
    return text
      .normalize('NFD')
      .replace(/\p{Diacritic}+/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
  } catch {
    return text.replace(/\s+/g, ' ').trim()
  }
}

function pickFirstString(values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}

function parseExistingBrandName(doc: unknown): string | null {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return null
  const obj = doc as Record<string, unknown>
  return pickFirstString([obj.name, obj.nome, obj.marca, obj.brand])
}

function parseBrandIdFromKey(key: string, prefix: string): number | null {
  const base = `${prefix}:brand:`
  if (!key.startsWith(base)) return null
  const raw = key.slice(base.length)
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) return null
  return parsed
}

export async function POST(request: NextRequest) {
  try {
    assertDevOnly()
    const body = (await request.json().catch(() => null)) as unknown
    const nameRaw = body && typeof body === 'object' ? (body as Record<string, unknown>).name : null
    const name = typeof nameRaw === 'string' ? nameRaw.trim() : ''
    if (!name) return NextResponse.json({ ok: false, message: 'name é obrigatório' }, { status: 400 })

    const normalized = normalizeName(name)
    const client = await getCatalogRedisClient()
    const prefix = getCatalogKeyPrefix()
    const slug = `/marca/${slugify(name) || 'no-brand'}`

    let maxId = 0

    for await (const chunk of client.scanIterator({ MATCH: `${prefix}:brand:*`, COUNT: 1000 })) {
      const keys = Array.isArray(chunk) ? chunk : [chunk]
      for (const k of keys) {
        const key = String(k)
        const id = parseBrandIdFromKey(key, prefix)
        if (id !== null && id > maxId) maxId = id

        const raw: unknown = await client.sendCommand(['JSON.GET', key])
        if (typeof raw !== 'string') continue
        try {
          const doc = JSON.parse(raw) as unknown
          const existingName = parseExistingBrandName(doc)
          if (!existingName) continue
          if (normalizeName(existingName) === normalized) {
            if (id === null) continue
            const nextDoc = doc && typeof doc === 'object' && !Array.isArray(doc) ? (doc as Record<string, unknown>) : {}
            const merged = {
              id,
              nome: existingName,
              slug: typeof nextDoc.slug === 'string' && nextDoc.slug.trim() ? nextDoc.slug : slug,
              image:
                typeof nextDoc.image === 'string' && nextDoc.image.trim() ? nextDoc.image : BRAND_PLACEHOLDER_IMAGE,
            }
            await client.sendCommand(['JSON.SET', key, '$', JSON.stringify(merged)])
            return NextResponse.json({
              ok: true,
              created: false,
              id,
              key,
              doc: merged,
            })
          }
        } catch {}
      }
    }

    const id = maxId + 1
    const key = `${prefix}:brand:${id}`
    const doc = { id, nome: name, slug, image: BRAND_PLACEHOLDER_IMAGE }
    await client.sendCommand(['JSON.SET', key, '$', JSON.stringify(doc)])

    return NextResponse.json({ ok: true, created: true, id, key, doc })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    const status = message.includes('somente em ambiente') ? 404 : 500
    return NextResponse.json({ ok: false, message }, { status })
  }
}
