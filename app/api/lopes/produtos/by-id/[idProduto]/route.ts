import { NextResponse } from "next/server"

import { getBackProdutoLoja } from "@/lib/integration/lopesBackClient"
import { HttpError } from "@/lib/integration/network"
import type { Brand, Categoria } from "@/lib/types/produtos"
import { buildBrandsById, translateLopesProdutoToProduto } from "@/liz_refator/contracts/lopes/translate"

export const dynamic = "force-dynamic"

function toIntOrZero(value: unknown): number {
  const n = Number.parseInt(String(value ?? "").trim(), 10)
  return Number.isFinite(n) ? n : 0
}

async function readJsonArray<T>(relativeParts: string[]): Promise<T[]> {
  const fs = await import("node:fs/promises")
  const path = await import("node:path")

  const filePath = path.join(process.cwd(), ...relativeParts)
  const raw = await fs.readFile(filePath, "utf8")
  const parsed = JSON.parse(raw) as unknown
  return Array.isArray(parsed) ? (parsed as T[]) : []
}

function buildCategoriasById(categorias: Categoria[]): Map<number, Categoria> {
  const byId = new Map<number, Categoria>()
  for (const c of categorias) {
    byId.set(toIntOrZero((c as unknown as { id?: unknown })?.id), c)
  }
  return byId
}

export async function GET(_request: Request, context: { params: Promise<{ idProduto: string }> }) {
  try {
    const { idProduto } = await context.params
    const parsedId = Number.parseInt(idProduto, 10)

    if (Number.isNaN(parsedId)) {
      return NextResponse.json({ success: false, message: "idProduto must be a valid number" }, { status: 400 })
    }

    const categorias = await readJsonArray<Categoria>(["lib", "mockups", "data", "categorias.json"])
    const brands = await readJsonArray<Brand>(["lib", "mockups", "data", "brands.json"])

    const raw = await getBackProdutoLoja({ codProd: parsedId })
    const produto = translateLopesProdutoToProduto(raw, {
      categoriasById: buildCategoriasById(categorias),
      brandsById: buildBrandsById(brands),
    })

    if (!produto) {
      return NextResponse.json({ success: false, message: "Produto not found" }, { status: 404 })
    }

    return NextResponse.json(
      { success: true, data: produto },
      { headers: { "x-data-source": "lopes-back + categorias.json + brands.json" } }
    )
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        error.data ?? { success: false, message: "Erro na integração (lopes back)" },
        { status: error.status }
      )
    }

    const message = error instanceof Error ? error.message : "Unexpected integration error"
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
