import { NextResponse } from "next/server"
import { getBackListProdutoLoja } from "@/lib/integration/lopesBackClient"
import { HttpError } from "@/lib/integration/network"
import { buildBrandsById, translateLopesProdutosToProdutosMock } from "@/lib/mockups/translateLopesProdutosToProdutos"
import type { Brand, Categoria } from "@/lib/types/produtos"

export const dynamic = "force-dynamic"

type CategoriaMock = Record<string, unknown>
type ProdutoMock = Record<string, unknown>
type CollectionsShape = {
  home?: {
    categorias_destaque?: CategoriaMock[]
    produtos_maisvendidos?: { data?: ProdutoMock[] } & Record<string, unknown>
    produtos_promocao?: { data?: ProdutoMock[] } & Record<string, unknown>
  } & Record<string, unknown>
} & Record<string, unknown>

function toIntOrZero(value: unknown): number {
  const n = Number.parseInt(String(value ?? "").trim(), 10)
  return Number.isFinite(n) ? n : 0
}

function buildCategoriasById(categorias: Categoria[]): Map<number, Categoria> {
  const byId = new Map<number, Categoria>()
  for (const c of categorias) {
    const id = toIntOrZero((c as unknown as { id?: unknown })?.id)
    byId.set(id, c)
  }
  return byId
}

function randomUniqueItems<T>(items: T[], count: number): T[] {
  const pool = [...items]
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, Math.max(0, Math.min(count, pool.length)))
}

function pickIds(items: Array<Record<string, unknown>>): Array<number | string> {
  return items
    .map((item) => item.id)
    .filter((id): id is number | string => typeof id === "number" || typeof id === "string")
}

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 })
  }

  try {
    const fs = await import("node:fs/promises")
    const path = await import("node:path")

    const categoriasPath = path.join(process.cwd(), "lib", "mockups", "data", "categorias.json")
    const brandsPath = path.join(process.cwd(), "lib", "mockups", "data", "brands.json")
    const collectionsPath = path.join(process.cwd(), "lib", "mockups", "data", "colections.json")

    const [categoriasRaw, brandsRaw, collectionsRaw] = await Promise.all([
      fs.readFile(categoriasPath, "utf8"),
      fs.readFile(brandsPath, "utf8"),
      fs.readFile(collectionsPath, "utf8"),
    ])

    const categorias = JSON.parse(categoriasRaw) as Categoria[]
    const brands = JSON.parse(brandsRaw) as Brand[]
    const collections = JSON.parse(collectionsRaw) as CollectionsShape

    const categoriasById = buildCategoriasById(categorias)
    const brandsById = buildBrandsById(brands)

    const rawProdutos = await getBackListProdutoLoja()
    const produtosTraduzidos = translateLopesProdutosToProdutosMock(rawProdutos, {
      categoriasById,
      brandsById,
    }) as ProdutoMock[]

    if (produtosTraduzidos.length < 8) {
      return NextResponse.json(
        {
          success: false,
          message: "Back retornou menos de 8 produtos traduzidos para montar a home",
          totalTraduzidos: produtosTraduzidos.length,
        },
        { status: 422 }
      )
    }

    const produtosMaisVendidos = randomUniqueItems(produtosTraduzidos, 8)
    const produtosPromocao = randomUniqueItems(produtosTraduzidos, 8)

    const nextCollections: CollectionsShape = {
      ...collections,
      home: {
        ...(collections.home ?? {}),
        produtos_maisvendidos: {
          ...(collections.home?.produtos_maisvendidos ?? {}),
          data: produtosMaisVendidos,
        },
        produtos_promocao: {
          ...(collections.home?.produtos_promocao ?? {}),
          data: produtosPromocao,
        },
      },
    }

    await fs.mkdir(path.dirname(collectionsPath), { recursive: true })
    await fs.writeFile(collectionsPath, `${JSON.stringify(nextCollections, null, 2)}\n`, "utf8")

    return NextResponse.json({
      success: true,
      data: {
        file: "lib/mockups/data/colections.json",
        source: "lopes-back + tradutor",
        totalTraduzidos: produtosTraduzidos.length,
        produtos_maisvendidos: {
          count: produtosMaisVendidos.length,
          ids: pickIds(produtosMaisVendidos as Array<Record<string, unknown>>),
        },
        produtos_promocao: {
          count: produtosPromocao.length,
          ids: pickIds(produtosPromocao as Array<Record<string, unknown>>),
        },
        wroteAt: new Date().toISOString(),
      },
    })
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
