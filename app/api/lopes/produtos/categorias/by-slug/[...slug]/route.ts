import { NextResponse } from "next/server"

import type { Categoria, CategoriaNode } from "@/lib/types/produtos"
import { buildCategoriasTreeFromCategorias } from "@/lib/mockups/syncDataFromBackToFront"

export const dynamic = "force-dynamic"

async function readCategoriasSnapshot(): Promise<Categoria[]> {
  const fs = await import("node:fs/promises")
  const path = await import("node:path")

  const filePath = path.join(process.cwd(), "lib", "mockups", "data", "categorias.json")
  const raw = await fs.readFile(filePath, "utf8")
  const parsed = JSON.parse(raw) as unknown

  return Array.isArray(parsed) ? (parsed as Categoria[]) : []
}

function findBySlug(nodes: CategoriaNode[], slug: string): CategoriaNode | null {
  for (const node of nodes) {
    if (node.slug === slug) return node
    const nested = findBySlug(node.children ?? [], slug)
    if (nested) return nested
  }
  return null
}

export async function GET(_request: Request, context: { params: Promise<{ slug: string[] }> }) {
  try {
    const { slug } = await context.params
    const parts = Array.isArray(slug) ? slug.map((p) => String(p ?? "").trim()).filter(Boolean) : []
    const safeSlug = parts.join("/")

    if (!safeSlug) {
      return NextResponse.json(
        { success: false, message: "slug must include category path segments" },
        { status: 400 }
      )
    }

    const normalized = safeSlug.startsWith("/") ? safeSlug : `/${safeSlug}`
    const categorias = await readCategoriasSnapshot()

    if (normalized === "/categoria/sem-categoria") {
      const raw = categorias.find((c) => c.id === 0) ?? null
      if (!raw) {
        return NextResponse.json({ success: false, message: "Categoria not found" }, { status: 404 })
      }

      const category: CategoriaNode = { ...raw, children: [] }
      return NextResponse.json(
        { success: true, data: { category } },
        { headers: { "x-data-source": "categorias.json" } }
      )
    }

    const tree = buildCategoriasTreeFromCategorias(categorias)
    const category = findBySlug(tree, normalized)

    if (!category) {
      return NextResponse.json({ success: false, message: "Categoria not found" }, { status: 404 })
    }

    return NextResponse.json(
      { success: true, data: { category } },
      { headers: { "x-data-source": "categorias.json" } }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected integration error"
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
