import { NextResponse } from "next/server"

import type { Categoria } from "@/lib/types/produtos"

export const dynamic = "force-dynamic"

function toIntOrNaN(value: unknown): number {
  if (typeof value === "number") return value
  const parsed = Number.parseInt(String(value ?? "").trim(), 10)
  return Number.isNaN(parsed) ? Number.NaN : parsed
}

function sortCategorias(list: Categoria[]): Categoria[] {
  return [...list].sort((a, b) => {
    const ao = toIntOrNaN(a?.order)
    const bo = toIntOrNaN(b?.order)
    if (!Number.isNaN(ao) && !Number.isNaN(bo) && ao !== bo) return ao - bo
    const ai = toIntOrNaN(a?.id)
    const bi = toIntOrNaN(b?.id)
    if (!Number.isNaN(ai) && !Number.isNaN(bi)) return ai - bi
    return 0
  })
}

async function readCategoriasSnapshot(): Promise<Categoria[]> {
  const fs = await import("node:fs/promises")
  const path = await import("node:path")

  const filePath = path.join(process.cwd(), "lib", "mockups", "data", "categorias.json")
  const raw = await fs.readFile(filePath, "utf8")
  const parsed = JSON.parse(raw) as unknown

  return Array.isArray(parsed) ? (parsed as Categoria[]) : []
}

export async function GET(_request: Request, context: { params: Promise<{ idCategoria: string }> }) {
  try {
    const { idCategoria } = await context.params
    const parsedId = Number.parseInt(idCategoria, 10)

    if (Number.isNaN(parsedId)) {
      return NextResponse.json({ success: false, message: "idCategoria must be a valid number" }, { status: 400 })
    }

    const categorias = await readCategoriasSnapshot()
    const byId = new Map<number, Categoria>()
    for (const c of categorias) {
      const id = toIntOrNaN(c?.id)
      if (!Number.isNaN(id)) byId.set(id, c)
    }

    const category = byId.get(parsedId)
    if (!category) {
      return NextResponse.json({ success: false, message: "Categoria not found" }, { status: 404 })
    }

    const children = parsedId === 0 ? [] : sortCategorias(categorias.filter((c) => toIntOrNaN(c?.parentId) === parsedId))
    return NextResponse.json(
      { success: true, data: { category, children } },
      { headers: { "x-data-source": "categorias.json" } }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected integration error"
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
