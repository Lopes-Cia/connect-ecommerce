import { NextRequest, NextResponse } from 'next/server'

import { ensureCatalogSynced } from '@/lib/integration/catalogAutoSync'
import { queryCatalogProducts, type CatalogProductSortDir, type CatalogProductSortField } from '@/lib/integration/catalogService'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function parseIntOrNull(value: string | null): number | null {
  if (!value) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

function parseNumberOrNull(value: string | null): number | null {
  if (!value) return null
  const parsed = Number.parseFloat(value)
  return Number.isNaN(parsed) ? null : parsed
}

function parseBoolOrNull(value: string | null): boolean | null {
  if (!value) return null
  const v = value.trim().toLowerCase()
  if (v === 'true') return true
  if (v === 'false') return false
  return null
}

function normalizeSort(value: string | null): { field: CatalogProductSortField; dir: CatalogProductSortDir } {
  const v = String(value || 'name:asc').trim().toLowerCase()
  const [fieldRaw, dirRaw] = v.split(':')
  const field = (fieldRaw || 'name') as CatalogProductSortField
  const dir = (dirRaw || 'asc') as CatalogProductSortDir

  const allowedFields = new Set<CatalogProductSortField>(['id', 'name', 'price', 'stock', 'rank'])
  const allowedDirs = new Set<CatalogProductSortDir>(['asc', 'desc'])
  if (!allowedFields.has(field)) {
    throw new Error('sort inválido (campos: id,name,price,stock,rank)')
  }
  if (!allowedDirs.has(dir)) {
    throw new Error('sort inválido (direções: asc,desc)')
  }

  return { field, dir }
}

export async function GET(request: NextRequest) {
  try {
    await ensureCatalogSynced()
    const usp = request.nextUrl.searchParams

    const page = parseIntOrNull(usp.get('page')) ?? 1
    const pageSize = parseIntOrNull(usp.get('pageSize')) ?? 20
    if (page < 1) {
      return NextResponse.json({ message: 'page deve ser >= 1' }, { status: 400 })
    }
    if (pageSize < 1 || pageSize > 200) {
      return NextResponse.json({ message: 'pageSize fora do intervalo (1..200)' }, { status: 400 })
    }

    const brandId = parseIntOrNull(usp.get('brandId')) ?? undefined
    const categoryId = parseIntOrNull(usp.get('categoryId')) ?? undefined

    const inStockParsed = parseBoolOrNull(usp.get('inStock'))
    if (usp.has('inStock') && inStockParsed === null) {
      return NextResponse.json({ message: 'inStock deve ser true ou false' }, { status: 400 })
    }

    const priceMinParsed = parseNumberOrNull(usp.get('priceMin'))
    if (usp.has('priceMin') && priceMinParsed === null) {
      return NextResponse.json({ message: 'priceMin deve ser número' }, { status: 400 })
    }

    const priceMaxParsed = parseNumberOrNull(usp.get('priceMax'))
    if (usp.has('priceMax') && priceMaxParsed === null) {
      return NextResponse.json({ message: 'priceMax deve ser número' }, { status: 400 })
    }

    const sortParam = usp.get('sort')
    let sort: ReturnType<typeof normalizeSort> | undefined
    if (sortParam) {
      try {
        sort = normalizeSort(sortParam)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'sort inválido'
        return NextResponse.json({ message }, { status: 400 })
      }
    } else {
      sort = { field: 'rank', dir: 'desc' }
    }

    const q = usp.get('q') ?? undefined

    const result = await queryCatalogProducts({
      q,
      brandId,
      categoryId,
      inStock: inStockParsed ?? undefined,
      priceMin: priceMinParsed ?? undefined,
      priceMax: priceMaxParsed ?? undefined,
      sort,
      page,
      pageSize,
    })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected Redis error'
    return NextResponse.json({ message }, { status: 500 })
  }
}
