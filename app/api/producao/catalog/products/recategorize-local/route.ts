import { NextRequest, NextResponse } from 'next/server'

import { getCatalogKeyPrefix, getCatalogRedisClient } from '@/lib/integration/catalogRedis'
import type { Categoria } from '@/lib/types/produtos'
import type { ProdutoMock } from '@/liz_refator/contracts/lopes/models'
import { normalizeText, slugify } from '@/liz_refator/contracts/lopes/raw'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type FamiliaItem = { id: number; name: string; slug: string }
type ProdutoCategory = { id: number; name: string; slug: string; familia: FamiliaItem[] }

function parseBool(value: string | null, defaultValue: boolean): boolean {
  if (!value) return defaultValue
  const v = value.trim().toLowerCase()
  if (v === '1' || v === 'true' || v === 'yes' || v === 'on') return true
  if (v === '0' || v === 'false' || v === 'no' || v === 'off') return false
  return defaultValue
}

function parseIntBounded(value: string | null, input: { min: number; max: number; defaultValue: number }): number {
  const raw = String(value ?? '').trim()
  const parsed = Number.parseInt(raw, 10)
  const n = Number.isFinite(parsed) ? parsed : input.defaultValue
  return Math.min(input.max, Math.max(input.min, n))
}

async function readLocalCategorias(): Promise<Categoria[]> {
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  const filePath = path.join(process.cwd(), 'lib', 'mockups', 'data', 'categorias.json')
  const raw = await fs.readFile(filePath, 'utf8')
  const parsed = JSON.parse(raw) as unknown
  return Array.isArray(parsed) ? (parsed as Categoria[]) : []
}

function tokenize(value: string): string[] {
  const v = normalizeText(value)
  if (!v) return []
  const raw = v.split(/[^a-z0-9]+/g).filter(Boolean)
  const stop = new Set(['e', 'de', 'do', 'da', 'dos', 'das', 'a', 'o', 'as', 'os', 'sem', 'com', 'para'])
  const tokens: string[] = []
  for (const t of raw) {
    if (stop.has(t)) continue
    if (t.length < 2) continue
    tokens.push(t)
  }
  return tokens
}

function buildFamilyById(categorias: Categoria[]): Map<number, FamiliaItem[]> {
  const byId = new Map<number, Categoria>()
  for (const c of categorias) {
    const id = Number((c as { id?: unknown } | null)?.id ?? 0)
    if (!Number.isFinite(id)) continue
    byId.set(id, c)
  }

  const cache = new Map<number, FamiliaItem[]>()
  const build = (id: number): FamiliaItem[] => {
    if (cache.has(id)) return cache.get(id) ?? []
    const found = byId.get(id)
    if (!found || id === 0) {
      const fallback: FamiliaItem[] = [{ id: 0, name: 'sem categoria', slug: '/categoria/sem-categoria' }]
      cache.set(id, fallback)
      return fallback
    }

    const familia: FamiliaItem[] = []
    const visited = new Set<number>()
    let current: Categoria | undefined = found
    while (current && !visited.has(current.id) && current.id !== 0) {
      visited.add(current.id)
      familia.push({ id: current.id, name: current.name, slug: current.slug })
      current = byId.get(current.parentId)
    }
    familia.reverse()
    cache.set(id, familia.length ? familia : [{ id: found.id, name: found.name, slug: found.slug }])
    return cache.get(id) ?? []
  }

  for (const c of categorias) {
    const id = Number((c as { id?: unknown } | null)?.id ?? 0)
    if (!Number.isFinite(id)) continue
    build(id)
  }

  return cache
}

function buildCategoryIndex(categorias: Categoria[]) {
  const byId = new Map<number, Categoria>()
  const tokenToIds = new Map<string, Set<number>>()
  const nameNormById = new Map<number, string>()
  const depthById = new Map<number, number>()
  const familyById = buildFamilyById(categorias)

  for (const c of categorias) {
    const id = Number((c as { id?: unknown } | null)?.id ?? 0)
    if (!Number.isFinite(id) || id === 0) continue
    byId.set(id, c)

    const nameNorm = normalizeText(c.name)
    nameNormById.set(id, nameNorm)
    depthById.set(id, (familyById.get(id) ?? []).length)

    const tokens = new Set<string>([
      ...tokenize(c.name),
      ...tokenize(String(c.slug ?? '').split('/').join(' ')),
    ])

    for (const t of tokens) {
      const list = tokenToIds.get(t) ?? new Set<number>()
      list.add(id)
      tokenToIds.set(t, list)
    }
  }

  return { byId, tokenToIds, nameNormById, depthById, familyById }
}

function chooseBestCategoryId(input: {
  productText: string
  productTokens: Set<string>
  categories: ReturnType<typeof buildCategoryIndex>
}): { id: number; score: number } {
  const candidates = new Set<number>()
  for (const t of input.productTokens) {
    const ids = input.categories.tokenToIds.get(t)
    if (!ids) continue
    for (const id of ids) candidates.add(id)
  }

  let bestId = 0
  let bestScore = 0
  let bestDepth = 0

  const evaluate = (id: number) => {
    const c = input.categories.byId.get(id)
    if (!c) return

    let score = 0
    const full = input.categories.nameNormById.get(id) ?? ''
    if (full && input.productText.includes(full)) score += 100

    const tokens = tokenize(c.name)
    for (const t of tokens) {
      if (!input.productTokens.has(t)) continue
      score += t.length >= 4 ? 12 : 6
    }

    const depth = input.categories.depthById.get(id) ?? 0
    if (score > bestScore || (score === bestScore && depth > bestDepth)) {
      bestId = id
      bestScore = score
      bestDepth = depth
    }
  }

  for (const id of candidates) evaluate(id)

  if (!bestId) {
    for (const [id, nameNorm] of input.categories.nameNormById) {
      if (!nameNorm) continue
      if (!input.productText.includes(nameNorm)) continue
      evaluate(id)
    }
  }

  return { id: bestId, score: bestScore }
}

function buildProdutoCategory(categorias: ReturnType<typeof buildCategoryIndex>, id: number): ProdutoCategory {
  if (!id) {
    return {
      id: 0,
      name: 'sem categoria',
      slug: '/categoria/sem-categoria',
      familia: [{ id: 0, name: 'sem categoria', slug: '/categoria/sem-categoria' }],
    }
  }

  const found = categorias.byId.get(id)
  if (!found) {
    return {
      id,
      name: 'sem categoria',
      slug: '/categoria/sem-categoria',
      familia: [{ id, name: 'sem categoria', slug: '/categoria/sem-categoria' }],
    }
  }

  const familia = categorias.familyById.get(id)
  return {
    id: found.id,
    name: found.name,
    slug: found.slug || `/categoria/${slugify(found.name)}`,
    familia: familia?.length ? familia : [{ id: found.id, name: found.name, slug: found.slug }],
  }
}

export async function POST(request: NextRequest) {
  try {
    const usp = request.nextUrl.searchParams
    const dryRun = parseBool(usp.get('dryRun'), false)
    const limit = parseIntBounded(usp.get('limit'), { min: 0, max: 500000, defaultValue: 0 })
    const batchSize = parseIntBounded(usp.get('batch'), { min: 20, max: 2000, defaultValue: 200 })
    const scanCount = parseIntBounded(usp.get('scanCount'), { min: 200, max: 100000, defaultValue: 2000 })

    const categoriasRaw = await readLocalCategorias()
    const categorias = buildCategoryIndex(categoriasRaw)

    const prefix = getCatalogKeyPrefix()
    const client = await getCatalogRedisClient()

    let scanned = 0
    let updated = 0
    let unchanged = 0
    let skipped = 0
    const sample: Array<{
      id: number
      name: string
      from: number
      to: number
      score: number
    }> = []

    let keysBatch: string[] = []

    const flush = async () => {
      if (!keysBatch.length) return
      const multi = client.multi()
      for (const k of keysBatch) multi.sendCommand(['JSON.GET', k])
      const results = await multi.exec()

      const updates: Array<{ key: string; category: ProdutoCategory }> = []
      for (let i = 0; i < keysBatch.length; i += 1) {
        const key = keysBatch[i]
        const raw = results?.[i]
        if (typeof raw !== 'string') {
          skipped += 1
          continue
        }

        let doc: ProdutoMock | null = null
        try {
          doc = JSON.parse(raw) as ProdutoMock
        } catch {
          skipped += 1
          continue
        }

        const productName = String((doc as unknown as { name?: unknown })?.name ?? '')
        const productSlug = String((doc as unknown as { slug?: unknown })?.slug ?? '')
        const productText = normalizeText(`${productName} ${productSlug}`)
        const tokens = new Set(tokenize(productText))

        const best = chooseBestCategoryId({ productText, productTokens: tokens, categories: categorias })
        const currentId = Number((doc as unknown as { category?: { id?: unknown } })?.category?.id ?? 0) || 0
        const nextId = best.id || 0

        if (nextId && best.score <= 0) {
          unchanged += 1
          continue
        }

        if (nextId === currentId) {
          unchanged += 1
          continue
        }

        const category = buildProdutoCategory(categorias, nextId)
        updates.push({ key, category })

        if (sample.length < 25) {
          sample.push({ id: doc.id, name: productName, from: currentId, to: nextId, score: best.score })
        }
      }

      if (!dryRun && updates.length) {
        const multiWrite = client.multi()
        for (const u of updates) {
          multiWrite.sendCommand(['JSON.SET', u.key, '$.category', JSON.stringify(u.category)])
        }
        await multiWrite.exec()
      }

      updated += updates.length
      keysBatch = []
    }

    const match = `${prefix}:product:*`
    for await (const chunk of client.scanIterator({ MATCH: match, COUNT: scanCount })) {
      const keys = Array.isArray(chunk) ? chunk : [chunk]
      for (const rawKey of keys) {
        scanned += 1
        keysBatch.push(String(rawKey))
        if (keysBatch.length >= batchSize) await flush()
        if (limit > 0 && scanned >= limit) break
      }
      if (limit > 0 && scanned >= limit) break
    }

    await flush()

    return NextResponse.json({
      ok: true,
      prefix,
      source: 'lib/mockups/data/categorias.json',
      dryRun,
      scanned,
      updated,
      unchanged,
      skipped,
      sample,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return NextResponse.json({ ok: false, message }, { status: 500 })
  }
}

