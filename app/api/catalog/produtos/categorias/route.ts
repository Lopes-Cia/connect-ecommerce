import { NextResponse } from 'next/server'

import type { ApiSuccess, Categoria, CategoriaNode } from '@/lib/types/produtos'
import { ensureCatalogSynced } from '@/lib/integration/catalogAutoSync'
import { buildCatalogHeaders } from '@/lib/integration/catalogHeaders'
import { listCatalogCategories } from '@/lib/integration/catalogService'
import { buildCategoriasTreeFromCategorias } from '@/liz_refator/contracts/lopes/translate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    await ensureCatalogSynced()
    const categorias = await listCatalogCategories<Categoria>()
    const tree = buildCategoriasTreeFromCategorias(categorias) as CategoriaNode[]
    const payload: ApiSuccess<CategoriaNode[]> = { success: true, data: tree }
    return NextResponse.json(payload, { headers: buildCatalogHeaders({ origin: 'lopes', readModel: 'redis' }) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected Redis error'
    return NextResponse.json(
      { success: false, message },
      { status: 500, headers: buildCatalogHeaders({ origin: 'lopes', readModel: 'redis' }) }
    )
  }
}

