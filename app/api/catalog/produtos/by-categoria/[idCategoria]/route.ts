import { NextRequest, NextResponse } from 'next/server'

import type { ProdutosByCategoriaResponse } from '@/lib/api/produtos'
import type { Categoria } from '@/lib/types/produtos'
import { listCatalogCategories, searchCatalogProducts } from '@/lib/integration/catalogService'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function parseIntOr(value: string | null, fallback: number): number {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

function buildDescendantsByParent(categorias: Categoria[]): Map<number, number[]> {
  const byParent = new Map<number, number[]>()
  for (const c of categorias) {
    const id = Number(c.id) || 0
    const parentId = Number(c.parentId) || 0
    const list = byParent.get(parentId) ?? []
    list.push(id)
    byParent.set(parentId, list)
  }
  return byParent
}

function collectDescendantIds(byParent: Map<number, number[]>, rootId: number): number[] {
  const result: number[] = []
  const seen = new Set<number>()
  const stack: number[] = [rootId]

  while (stack.length) {
    const current = stack.pop() as number
    if (seen.has(current)) continue
    seen.add(current)
    result.push(current)
    const children = byParent.get(current) ?? []
    for (const child of children) {
      if (!seen.has(child)) stack.push(child)
    }
  }

  return result
}

function buildCategoryFilterQuery(categoryIds: number[]): string {
  if (categoryIds.length === 1) {
    const id = categoryIds[0] ?? 0
    return `@categoryId:[${id} ${id}]`
  }

  const parts = categoryIds.map((id) => `@categoryId:[${id} ${id}]`)
  return `(${parts.join(' | ')})`
}

export async function GET(request: NextRequest, context: { params: Promise<{ idCategoria: string }> }) {
  try {
    const { idCategoria } = await context.params
    const parsedId = Number.parseInt(idCategoria, 10)
    if (Number.isNaN(parsedId)) {
      return NextResponse.json({ success: false, message: 'idCategoria must be a valid number' }, { status: 400 })
    }

    const includeDescendantsRaw = request.nextUrl.searchParams.get('includeDescendants')
    const includeDescendants = parseIntOr(includeDescendantsRaw, 1)
    if (includeDescendants !== 0 && includeDescendants !== 1) {
      return NextResponse.json({ success: false, message: 'includeDescendants must be 0 or 1' }, { status: 400 })
    }

    const page = parseIntOr(request.nextUrl.searchParams.get('page'), 1)
    const pageSize = parseIntOr(request.nextUrl.searchParams.get('pageSize'), 24)
    if (page < 1) {
      return NextResponse.json({ success: false, message: 'page must be >= 1' }, { status: 400 })
    }
    if (pageSize < 1 || pageSize > 100) {
      return NextResponse.json({ success: false, message: 'pageSize must be between 1 and 100' }, { status: 400 })
    }

    const categorias = await listCatalogCategories<Categoria>()
    const byParent = buildDescendantsByParent(categorias)

    const categoryIds =
      parsedId === 0
        ? [0]
        : includeDescendants === 1
          ? collectDescendantIds(byParent, parsedId).filter((id) => id !== 0)
          : [parsedId]

    const filterQuery = buildCategoryFilterQuery(categoryIds)
    const query = filterQuery

    const result = await searchCatalogProducts({
      query,
      page,
      pageSize,
      sort: { field: 'rank', dir: 'desc' },
    })

    const totalPages = result.total === 0 ? 0 : Math.ceil(result.total / pageSize)

    const payload: ProdutosByCategoriaResponse = {
      success: true,
      data: result.items as any,
      page,
      pageSize,
      total: result.total,
      totalPages,
    }

    return NextResponse.json(payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected Redis error'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
