import { NextResponse } from "next/server"

import { getBackProdutoLoja } from "@/lib/integration/lopesBackClient"
import { HttpError } from "@/lib/integration/network"
import type { Brand, Categoria } from "@/lib/types/produtos"
import { buildBrandsById, translateLopesProdutoToProduto } from "@/liz_refator/contracts/lopes/translate"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const query: Record<string, string> = {}

    for (const [key, value] of url.searchParams.entries()) {
      query[key] = value
    }

    const result = Object.keys(query).length > 0 ? await getBackProdutoLoja(query) : await getBackProdutoLoja()

    const fs = await import("node:fs/promises")
    const path = await import("node:path")

    const categoriasPath = path.join(process.cwd(), "lib", "mockups", "data", "categorias.json")
    const brandsPath = path.join(process.cwd(), "lib", "mockups", "data", "brands.json")

    const categoriasRaw = await fs.readFile(categoriasPath, "utf8")
    const brandsRaw = await fs.readFile(brandsPath, "utf8")

    const categoriasParsed = JSON.parse(categoriasRaw) as unknown
    const brandsParsed = JSON.parse(brandsRaw) as unknown

    const categorias = Array.isArray(categoriasParsed) ? (categoriasParsed as Categoria[]) : []
    const brands = Array.isArray(brandsParsed) ? (brandsParsed as Brand[]) : []

    const categoriasById = new Map<number, Categoria>()
    for (const c of categorias) {
      categoriasById.set(Number(c.id), c)
    }

    const produto = translateLopesProdutoToProduto(result, {
      categoriasById,
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
