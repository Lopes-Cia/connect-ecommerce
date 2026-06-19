import { NextResponse } from "next/server"

import { buildCatalogHeaders } from "@/lib/integration/catalogHeaders"
import { getCatalogKeyPrefix, getCatalogRedisClient } from "@/lib/integration/catalogRedis"
import { getBackProdutoLoja } from "@/lib/integration/lopesBackClient"
import { HttpError } from "@/lib/integration/network"
import type { Brand, Categoria } from "@/lib/types/produtos"
import { buildBrandsById, translateLopesProdutoToProduto } from "@/liz_refator/contracts/lopes/translate"
import type { ProdutoBrand, ProdutoCategory, ProdutoMock } from "@/liz_refator/contracts/lopes/models"

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

type OverwriteFlags = {
  category: 0 | 1
  brand: 0 | 1
  image: 0 | 1
  name: 0 | 1
  slug: 0 | 1
}

const DEFAULT_FLAGS: OverwriteFlags = { category: 0, brand: 0, image: 0, name: 0, slug: 0 }
const DEFAULT_GLOBAL_FLAGS: OverwriteFlags = { category: 0, brand: 1, image: 0, name: 0, slug: 0 }

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function normalizeFlag(value: unknown): 0 | 1 {
  if (value === true) return 1
  if (value === false) return 0
  if (value === 1 || value === "1") return 1
  return 0
}

function toFlags(value: unknown): OverwriteFlags {
  const record = asRecord(value)
  if (!record) return DEFAULT_FLAGS
  return {
    category: normalizeFlag(record.category),
    brand: normalizeFlag(record.brand),
    image: normalizeFlag(record.image),
    name: normalizeFlag(record.name),
    slug: normalizeFlag(record.slug),
  }
}

function slugify(value: string): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function toIntOrNull(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number.parseInt(String(value ?? "").trim(), 10)
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null
  return n
}

function normalizeCategory(value: unknown): ProdutoCategory | null {
  const record = asRecord(value)
  if (!record) return null
  const id = toIntOrNull(record.id)
  if (!id || id < 0) return null
  const nameRaw = typeof record.name === "string" ? record.name : ""
  const name = nameRaw.trim() || `Categoria ${id}`
  const slugRaw = typeof record.slug === "string" ? record.slug : ""
  const slug = slugRaw.trim() || `/categoria/${slugify(name) || "sem-categoria"}`
  const familiaRaw = record.familia
  const familia = Array.isArray(familiaRaw)
    ? familiaRaw
        .map((item) => {
          const obj = asRecord(item)
          if (!obj) return null
          const fid = toIntOrNull(obj.id) ?? id
          const fname = (typeof obj.name === "string" ? obj.name : name).trim() || name
          const fslug = (typeof obj.slug === "string" ? obj.slug : "").trim() || `/categoria/${slugify(fname) || "sem-categoria"}`
          return { id: fid, name: fname, slug: fslug }
        })
        .filter(Boolean) as Array<{ id: number; name: string; slug: string }>
    : [{ id, name, slug }]
  return { id, name, slug, familia: familia.length ? familia : [{ id, name, slug }] }
}

function normalizeBrand(value: unknown): ProdutoBrand | null {
  const record = asRecord(value)
  if (!record) return null
  const id = toIntOrNull(record.id)
  if (id === null || id < 0) return null
  const nameRaw =
    typeof record.name === "string"
      ? record.name
      : typeof record.nome === "string"
        ? record.nome
        : typeof record.marca === "string"
          ? record.marca
          : ""
  const name = nameRaw.trim() || `Marca ${id ?? 0}`
  const slugRaw = typeof record.slug === "string" ? record.slug : ""
  const slug = slugRaw.trim() || `/marca/${slugify(name) || "no-brand"}`
  const imageRaw = typeof record.image === "string" ? record.image : ""
  const image = imageRaw.trim() || "https://lopesecia.com.br/img/semImagem.png"
  return { id: id ?? 0, name, slug, image }
}

async function tryReadRedisJson(key: string): Promise<Record<string, unknown> | null> {
  try {
    const client = await getCatalogRedisClient()
    const raw = await client.sendCommand(["JSON.GET", key])
    if (typeof raw !== "string" || !raw) return null
    const parsed = JSON.parse(raw) as unknown
    return asRecord(parsed)
  } catch {
    return null
  }
}

async function tryApplyOverwriteFromRedis(input: { produto: ProdutoMock; idProduto: number }): Promise<ProdutoMock> {
  try {
    const prefix = getCatalogKeyPrefix()
    const flagsDoc =
      (await tryReadRedisJson(`${prefix}:product_overwrite:global`)) ?? DEFAULT_GLOBAL_FLAGS
    const flags = toFlags(flagsDoc)
    if (flags.brand === 0 && flags.category === 0 && flags.image === 0 && flags.name === 0 && flags.slug === 0) {
      return input.produto
    }

    const productKey = `${prefix}:product:${input.idProduto}`
    const redisProduct = await tryReadRedisJson(productKey)
    if (!redisProduct) return input.produto

    if (flags.brand === 1) {
      const brand = normalizeBrand(redisProduct.brand)
      if (brand) input.produto.brand = brand
    }

    if (flags.category === 1) {
      const category = normalizeCategory(redisProduct.category)
      if (category) input.produto.category = category
    }

    if (flags.image === 1) {
      const image = typeof redisProduct.image === "string" ? redisProduct.image.trim() : ""
      if (image) input.produto.image = image
    }

    if (flags.name === 1) {
      const name = typeof redisProduct.name === "string" ? redisProduct.name.trim() : ""
      if (name) input.produto.name = name
    }

    if (flags.slug === 1) {
      const slug = typeof redisProduct.slug === "string" ? redisProduct.slug.trim() : ""
      if (slug) input.produto.slug = slug
    }

    return input.produto
  } catch {
    return input.produto
  }
}

export async function GET(_request: Request, context: { params: Promise<{ idProduto: string }> }) {
  try {
    const headers = buildCatalogHeaders({ origin: "lopes", readModel: "none" })
    const { idProduto } = await context.params
    const parsedId = Number.parseInt(idProduto, 10)

    if (Number.isNaN(parsedId)) {
      return NextResponse.json({ success: false, message: "idProduto must be a valid number" }, { status: 400, headers })
    }

    const categorias = await readJsonArray<Categoria>(["lib", "mockups", "data", "categorias.json"])
    const brands = await readJsonArray<Brand>(["lib", "mockups", "data", "brands.json"])

    const raw = await getBackProdutoLoja({ codProd: parsedId })
    const produto = translateLopesProdutoToProduto(raw, {
      categoriasById: buildCategoriasById(categorias),
      brandsById: buildBrandsById(brands),
    })

    if (!produto) {
      return NextResponse.json({ success: false, message: "Produto not found" }, { status: 404, headers })
    }

    await tryApplyOverwriteFromRedis({ produto, idProduto: parsedId })
    return NextResponse.json({ success: true, data: produto }, { headers })
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
