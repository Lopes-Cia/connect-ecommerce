import { NextResponse } from 'next/server'

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

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function pickFirstString(values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}

function pickFirstNumber(values: unknown[]): number | null {
  for (const v of values) {
    const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
    if (Number.isFinite(n)) return n
  }
  return null
}

function parseBrandIdFromKey(key: string, prefix: string): number | null {
  const base = `${prefix}:brand:`
  if (!key.startsWith(base)) return null
  const raw = key.slice(base.length)
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) return null
  return parsed
}

function normalizeBrandObject(input: Record<string, unknown>) {
  const id = pickFirstNumber([input.id, input.brandId, input.codigo]) ?? 0
  const nome = pickFirstString([input.nome, input.name]) ?? ''
  const slug =
    pickFirstString([input.slug]) ?? `/marca/${slugify(nome) || 'no-brand'}`
  const image = pickFirstString([input.image]) ?? BRAND_PLACEHOLDER_IMAGE

  const out = { id, nome, slug, image }
  const changed =
    input.id !== id ||
    input.nome !== nome ||
    input.slug !== slug ||
    input.image !== image ||
    'name' in input ||
    Object.keys(input).some((k) => !['id', 'nome', 'slug', 'image', 'name'].includes(k))

  const emptyNome = !nome.trim()
  return { out, changed, emptyNome }
}

function normalizeProductDoc(doc: Record<string, unknown>) {
  const brandObj = asObject(doc.brand)
  if (!brandObj) return { doc, changed: false, emptyNome: false }

  const normalized = normalizeBrandObject(brandObj)
  const next: Record<string, unknown> = { ...doc, brand: normalized.out }
  delete next.brandId
  delete next.marca
  return { doc: next, changed: normalized.changed || 'brandId' in doc || 'marca' in doc, emptyNome: normalized.emptyNome }
}

function normalizeBrandDoc(doc: Record<string, unknown>, keyBrandId: number) {
  const normalized = normalizeBrandObject({ ...doc, id: keyBrandId })
  const next = normalized.out
  return { doc: next, changed: true, emptyNome: normalized.emptyNome }
}

async function scanKeys(client: Awaited<ReturnType<typeof getCatalogRedisClient>>, match: string) {
  const keys: string[] = []
  for await (const chunk of client.scanIterator({ MATCH: match, COUNT: 1000 })) {
    const arr = Array.isArray(chunk) ? chunk : [chunk]
    for (const k of arr) keys.push(String(k))
  }
  return keys
}

export async function POST() {
  const startedAt = Date.now()
  try {
    assertDevOnly()
    const client = await getCatalogRedisClient()
    const prefix = getCatalogKeyPrefix()

    const productKeys = await scanKeys(client, `${prefix}:product:*`)
    const brandKeys = await scanKeys(client, `${prefix}:brand:*`)

    const report = {
      ok: true as const,
      prefix,
      products: {
        scanned: productKeys.length,
        updated: 0,
        errors: 0,
        emptyNome: 0,
        examplesUpdated: [] as string[],
      },
      brands: {
        scanned: brandKeys.length,
        updated: 0,
        errors: 0,
        emptyNome: 0,
        examplesUpdated: [] as string[],
      },
      ms: 0,
    }

    const batchSize = 200

    const migrateBatch = async (keys: string[], kind: 'product' | 'brand') => {
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize)
        const multiGet = client.multi()
        for (const key of batch) multiGet.sendCommand(['JSON.GET', key])
        const raws = await multiGet.exec()

        const multiSet = client.multi()
        let writes = 0

        for (let j = 0; j < batch.length; j += 1) {
          const key = batch[j]
          const raw = raws?.[j]
          if (typeof raw !== 'string') continue
          try {
            const parsed = JSON.parse(raw) as unknown
            const obj = asObject(parsed)
            if (!obj) continue

            if (kind === 'product') {
              const normalized = normalizeProductDoc(obj)
              if (!normalized.changed) continue
              if (normalized.emptyNome) report.products.emptyNome += 1
              multiSet.sendCommand(['JSON.SET', key, '$', JSON.stringify(normalized.doc)])
              writes += 1
              report.products.updated += 1
              if (report.products.examplesUpdated.length < 12) report.products.examplesUpdated.push(key)
            } else {
              const id = parseBrandIdFromKey(key, prefix)
              if (id === null) continue
              const normalized = normalizeBrandDoc(obj, id)
              if (normalized.emptyNome) report.brands.emptyNome += 1
              multiSet.sendCommand(['JSON.SET', key, '$', JSON.stringify(normalized.doc)])
              writes += 1
              report.brands.updated += 1
              if (report.brands.examplesUpdated.length < 12) report.brands.examplesUpdated.push(key)
            }
          } catch {
            if (kind === 'product') report.products.errors += 1
            else report.brands.errors += 1
          }
        }

        if (writes > 0) await multiSet.exec()
      }
    }

    await migrateBatch(productKeys, 'product')
    await migrateBatch(brandKeys, 'brand')

    report.ms = Date.now() - startedAt
    return NextResponse.json(report)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    const status = message.includes('somente em ambiente') ? 404 : 500
    return NextResponse.json({ ok: false, message, ms: Date.now() - startedAt }, { status })
  }
}

