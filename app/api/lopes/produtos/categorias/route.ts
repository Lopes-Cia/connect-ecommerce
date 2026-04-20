import { NextResponse } from "next/server"

import type { Categoria } from "@/lib/types/produtos"
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

export async function GET() {
  try {
    const categorias = await readCategoriasSnapshot()
    const tree = buildCategoriasTreeFromCategorias(categorias)
    return NextResponse.json(
      { success: true, data: tree },
      { headers: { "x-data-source": "categorias.json" } }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected integration error"
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
