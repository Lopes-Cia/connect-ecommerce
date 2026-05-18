import { NextRequest, NextResponse } from 'next/server'

import type { ApiSuccess, Categoria, CategoriaNode } from '@/lib/types/produtos'
import { ensureCatalogSynced } from '@/lib/integration/catalogAutoSync'
import { buildCatalogHeaders } from '@/lib/integration/catalogHeaders'
import { listCatalogCategories } from '@/lib/integration/catalogService'
import { buildCategoriasTreeFromCategorias } from '@/liz_refator/contracts/lopes/translate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function findNodeBySlug(nodes: CategoriaNode[], slug: string): CategoriaNode | null {
  for (const node of nodes) {
    if (node.slug === slug) return node
    const found = findNodeBySlug(node.children ?? [], slug)
    if (found) return found
  }
  return null
}

export async function GET(_request: NextRequest, context: { params: Promise<{ slug: string[] }> }) {
  try {
    await ensureCatalogSynced()
    const { slug } = await context.params
    const slugPath = `/${(Array.isArray(slug) ? slug : []).map((s) => decodeURIComponent(s)).join('/')}`

    const categorias = await listCatalogCategories<Categoria>()
    if (slugPath === '/categoria/sem-categoria') {
      const sem = categorias.find((c) => Number(c.id) === 0) ?? null
      if (!sem) {
        return NextResponse.json(
          { success: false, message: 'Categoria não encontrada' },
          { status: 404, headers: buildCatalogHeaders({ origin: 'lopes', readModel: 'redis' }) }
        )
      }
      const node: CategoriaNode = { ...(sem as CategoriaNode), children: [] }
      const payload: ApiSuccess<{ category: CategoriaNode }> = { success: true, data: { category: node } }
      return NextResponse.json(payload, { headers: buildCatalogHeaders({ origin: 'lopes', readModel: 'redis' }) })
    }
    const tree = buildCategoriasTreeFromCategorias(categorias) as CategoriaNode[]
    const found = findNodeBySlug(tree, slugPath)

    if (!found) {
      return NextResponse.json(
        { success: false, message: 'Categoria não encontrada' },
        { status: 404, headers: buildCatalogHeaders({ origin: 'lopes', readModel: 'redis' }) }
      )
    }

    const payload: ApiSuccess<{ category: CategoriaNode }> = { success: true, data: { category: found } }
    return NextResponse.json(payload, { headers: buildCatalogHeaders({ origin: 'lopes', readModel: 'redis' }) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected Redis error'
    return NextResponse.json(
      { success: false, message },
      { status: 500, headers: buildCatalogHeaders({ origin: 'lopes', readModel: 'redis' }) }
    )
  }
}
