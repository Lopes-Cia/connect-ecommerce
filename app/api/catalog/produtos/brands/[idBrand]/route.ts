import { NextRequest, NextResponse } from 'next/server'

import type { ApiSuccess, Brand, BrandByIdPayload, Produto } from '@/lib/types/produtos'
import { ensureCatalogSynced } from '@/lib/integration/catalogAutoSync'
import { buildCatalogHeaders } from '@/lib/integration/catalogHeaders'
import { listCatalogBrands, searchCatalogProducts } from '@/lib/integration/catalogService'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function parseIntOr(value: string | null, fallback: number): number {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

export async function GET(request: NextRequest, context: { params: Promise<{ idBrand: string }> }) {
  try {
    await ensureCatalogSynced()
    const headers = buildCatalogHeaders({ origin: 'lopes', readModel: 'redis' })
    const { idBrand } = await context.params
    const parsedId = Number.parseInt(idBrand, 10)
    if (Number.isNaN(parsedId)) {
      return NextResponse.json({ success: false, message: 'idBrand must be a valid number' }, { status: 400, headers })
    }

    const page = parseIntOr(request.nextUrl.searchParams.get('page'), 1)
    const pageSize = parseIntOr(request.nextUrl.searchParams.get('pageSize'), 24)
    if (page < 1) {
      return NextResponse.json({ success: false, message: 'page must be >= 1' }, { status: 400, headers })
    }
    if (pageSize < 1 || pageSize > 100) {
      return NextResponse.json({ success: false, message: 'pageSize must be between 1 and 100' }, { status: 400, headers })
    }

    const brands = await listCatalogBrands<Brand>()
    const brand = brands.find((b) => Number(b.id) === parsedId)
    if (!brand) {
      return NextResponse.json({ success: false, message: 'Brand não encontrada' }, { status: 404, headers })
    }

    const query = `@brandId:[${parsedId} ${parsedId}]`
    const productsResult = await searchCatalogProducts<Produto>({
      query,
      page,
      pageSize,
      sort: { field: 'rank', dir: 'desc' },
    })

    const totalPages = productsResult.total === 0 ? 0 : Math.ceil(productsResult.total / pageSize)

    const payload: ApiSuccess<BrandByIdPayload> = {
      success: true,
      data: {
        brand,
        products: {
          data: productsResult.items,
          page,
          pageSize,
          total: productsResult.total,
          totalPages,
        },
      },
    }

    return NextResponse.json(payload, { headers })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected Redis error'
    return NextResponse.json(
      { success: false, message },
      { status: 500, headers: buildCatalogHeaders({ origin: 'lopes', readModel: 'redis' }) }
    )
  }
}
