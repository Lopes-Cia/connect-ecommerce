import { NextRequest, NextResponse } from 'next/server'

import type { ApiSuccess, Categoria } from '@/lib/types/produtos'
import { listCatalogCategories } from '@/lib/integration/catalogService'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(_request: NextRequest, context: { params: Promise<{ idCategoria: string }> }) {
  try {
    const { idCategoria } = await context.params
    const parsedId = Number.parseInt(idCategoria, 10)
    if (Number.isNaN(parsedId)) {
      return NextResponse.json({ success: false, message: 'idCategoria must be a valid number' }, { status: 400 })
    }

    const categorias = await listCatalogCategories<Categoria>()
    const category = categorias.find((c) => Number(c.id) === parsedId)
    if (!category) {
      return NextResponse.json({ success: false, message: 'Categoria não encontrada' }, { status: 404 })
    }
    const children = categorias.filter((c) => Number(c.parentId) === parsedId)

    const payload: ApiSuccess<{ category: Categoria; children: Categoria[] }> = {
      success: true,
      data: { category, children },
    }
    return NextResponse.json(payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected Redis error'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
