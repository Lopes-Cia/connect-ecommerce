import { NextRequest, NextResponse } from "next/server"

import { buildCatalogHeaders } from "@/lib/integration/catalogHeaders"
import { getBackListProdutoLoja } from "@/lib/integration/lopesBackClient"
import { HttpError } from "@/lib/integration/network"
import type { Brand, Categoria } from "@/lib/types/produtos"
import type { ProdutoMock } from "@/liz_refator/contracts/lopes/models"
import { buildBrandsById, translateLopesProdutosToProdutosMock } from "@/liz_refator/contracts/lopes/translate"

export const dynamic = "force-dynamic"

function parseIntOr(value: string | null, fallback: number): number {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

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
    const id = toIntOrZero((c as unknown as { id?: unknown })?.id)
    byId.set(id, c)
  }
  return byId
}

function buildDescendantsByParent(categorias: Categoria[]): Map<number, number[]> {
  const byParent = new Map<number, number[]>()
  for (const c of categorias) {
    const id = toIntOrZero((c as unknown as { id?: unknown })?.id)
    const parentId = toIntOrZero((c as unknown as { parentId?: unknown })?.parentId)
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

function dedupeById(list: ProdutoMock[]): ProdutoMock[] {
  const byId = new Map<number, ProdutoMock>()
  for (const p of list) {
    byId.set(toIntOrZero((p as unknown as { id?: unknown })?.id), p)
  }
  return Array.from(byId.values())
}

function sortById(list: ProdutoMock[]): ProdutoMock[] {
  return [...list].sort((a, b) => toIntOrZero(a?.id) - toIntOrZero(b?.id))
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ idCategoria: string }> }
) {
  try {
    const headers = buildCatalogHeaders({ origin: "lopes", readModel: "none" })
    const { idCategoria } = await context.params
    const parsedId = Number.parseInt(idCategoria, 10)

    if (Number.isNaN(parsedId)) {
      return NextResponse.json(
        { success: false, message: "idCategoria must be a valid number" },
        { status: 400, headers }
      )
    }

    const includeDescendantsRaw = request.nextUrl.searchParams.get("includeDescendants")
    const includeDescendants = parseIntOr(includeDescendantsRaw, 0)
    if (includeDescendants !== 0 && includeDescendants !== 1) {
      return NextResponse.json(
        { success: false, message: "includeDescendants must be 0 or 1" },
        { status: 400, headers }
      )
    }

    const page = parseIntOr(request.nextUrl.searchParams.get("page"), 1)
    const pageSize = parseIntOr(request.nextUrl.searchParams.get("pageSize"), 24)

    if (page < 1) {
      return NextResponse.json({ success: false, message: "page must be >= 1" }, { status: 400, headers })
    }
    if (pageSize < 1 || pageSize > 100) {
      return NextResponse.json(
        { success: false, message: "pageSize must be between 1 and 100" },
        { status: 400, headers }
      )
    }

    const categorias = await readJsonArray<Categoria>(["lib", "mockups", "data", "categorias.json"])
    const categoriasById = buildCategoriasById(categorias)
    const byParent = buildDescendantsByParent(categorias)

    const brands = await readJsonArray<Brand>(["lib", "mockups", "data", "brands.json"])
    const brandsById = buildBrandsById(brands)

    const categoryIds =
      parsedId === 0
        ? [0]
        : includeDescendants === 1
          ? collectDescendantIds(byParent, parsedId).filter((id) => id !== 0)
          : [parsedId]

    const allProdutos: ProdutoMock[] = []
    for (const idCat of categoryIds) {
      let raw: unknown
      try {
        raw = await getBackListProdutoLoja({ idCategoria: idCat })
      } catch (error) {
        if (error instanceof HttpError && error.status === 404) {
          continue
        }
        throw error
      }
      const translated = translateLopesProdutosToProdutosMock(raw, {
        categoriasById,
        brandsById,
      })
      allProdutos.push(...translated)
    }

    const merged = sortById(dedupeById(allProdutos))
    const total = merged.length
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize)
    const start = (page - 1) * pageSize
    const data = merged.slice(start, start + pageSize)

    return NextResponse.json({ success: true, data, page, pageSize, total, totalPages }, { headers })
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        error.data ?? { success: false, message: "Erro na integração (lopes back)" },
        { status: error.status, headers: buildCatalogHeaders({ origin: "lopes", readModel: "none" }) }
      )
    }

    const message = error instanceof Error ? error.message : "Unexpected integration error"
    return NextResponse.json(
      { success: false, message },
      { status: 500, headers: buildCatalogHeaders({ origin: "lopes", readModel: "none" }) }
    )
  }
}
