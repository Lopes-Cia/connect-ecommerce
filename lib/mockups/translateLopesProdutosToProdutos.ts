import "server-only"

import type { Brand, Categoria } from "@/lib/types/produtos"

function safeString(value: unknown): string {
  return String(value ?? "").trim()
}

function normalizeText(value: unknown): string {
  return safeString(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function slugify(value: unknown): string {
  const s = normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
  return s || "item"
}

function toIntOrZero(value: unknown): number {
  const n = Number.parseInt(String(value ?? "").trim(), 10)
  return Number.isFinite(n) ? n : 0
}

function toNumberOrNull(value: unknown): number | null {
  const n = Number(String(value ?? "").trim())
  return Number.isFinite(n) ? n : null
}

function detectSizeLabel(text: unknown): string {
  const t = normalizeText(text)
  const m = t.match(/(\d+(?:[.,]\d+)?)\s*(ml|l|g|kg)\b/)
  if (!m) return ""
  const raw = safeString(m[1]).replace(",", ".")
  const qty = Number(raw)
  if (!Number.isFinite(qty)) return ""
  const unit = safeString(m[2]).toLowerCase()
  const isInt = Number.isInteger(qty)
  const qStr = isInt ? String(qty) : String(qty).replace(/\.0+$/, "")
  if (unit === "ml") return `${qStr}ml`
  if (unit === "l") return `${qStr}L`
  if (unit === "g") return `${qStr}g`
  if (unit === "kg") return `${qStr}kg`
  return `${qStr}${unit}`
}

function detectUnitLabel(text: unknown, codVol: unknown): string {
  const t = normalizeText(text)
  if (t.includes("long neck")) return "long neck"
  if (t.includes("growler")) return "growler"
  if (t.includes("lata")) return "lata"
  if (t.includes("frasco")) return "frasco"
  if (t.includes("envelope")) return "envelope"
  if (t.includes("caixa")) return "caixa"
  const cv = normalizeText(codVol)
  return cv || "un"
}

type LopesProdutoRaw = {
  codProd?: unknown
  descricaoEcomerce?: unknown
  descricaoErp?: unknown
  ean?: unknown
  codVol?: unknown
  preco?: unknown
  qtEstoque?: unknown
  imagem?: unknown
  categoriaPrinciapal?: unknown
  categorias?: unknown
}

function readListFrom(input: unknown): unknown[] {
  if (Array.isArray(input)) return input
  if (input && typeof input === "object" && Array.isArray((input as { data?: unknown }).data)) {
    return (input as { data: unknown[] }).data
  }
  return []
}

type CategoriaFamiliaItem = { id: number; name: string; slug: string }
type ProdutoCategory = { id: number; name: string; slug: string; familia: CategoriaFamiliaItem[] }
type ProdutoBrand = { id: number; name: string; slug: string; image: string }

export type ProdutoMock = {
  id: number
  sku: string
  name: string
  slug: string
  unitLabel: string
  sizeLabel: string
  price: number | null
  compareAtPrice: number | null
  badges: string[]
  image: string
  stock: number
  inStock: boolean
  category: ProdutoCategory
  brand: ProdutoBrand
}

function resolveCategoryFromSnapshot(
  categoriasById: Map<number, Categoria>,
  rawId: number
): ProdutoCategory {
  const fallbackName = "sem categoria"
  const fallbackSlug = "/categoria/sem-categoria"

  const fallbackFor = (id: number): ProdutoCategory => ({
    id,
    name: fallbackName,
    slug: fallbackSlug,
    familia: [{ id, name: fallbackName, slug: fallbackSlug }],
  })

  if (!rawId) return fallbackFor(0)
  const found = categoriasById.get(rawId)
  if (!found) return fallbackFor(rawId)

  const familia: CategoriaFamiliaItem[] = []
  const visited = new Set<number>()
  let current: Categoria | undefined = found
  while (current && !visited.has(current.id) && current.id !== 0) {
    visited.add(current.id)
    familia.push({ id: current.id, name: current.name, slug: current.slug })
    current = categoriasById.get(current.parentId)
  }
  familia.reverse()

  return {
    id: found.id,
    name: found.name,
    slug: found.slug,
    familia: familia.length ? familia : [{ id: found.id, name: found.name, slug: found.slug }],
  }
}

function resolveBrandFromSnapshot(brandsById: Map<number, Brand>, rawId: number | null): ProdutoBrand {
  const fallback = brandsById.get(0)
  const base: ProdutoBrand = fallback
    ? { id: fallback.id, name: fallback.name, slug: fallback.slug, image: fallback.image }
    : {
        id: 0,
        name: "No Brand",
        slug: "/marca/no-brand",
        image: "http://localhost:4000/assets/images/semImagem.png",
      }

  if (!rawId) return base
  const found = brandsById.get(rawId)
  if (!found) return base
  return { id: found.id, name: found.name, slug: found.slug, image: found.image }
}

export function translateLopesProdutosToProdutosMock(
  input: unknown,
  lookups: {
    categoriasById: Map<number, Categoria>
    brandsById: Map<number, Brand>
    fallbackImage?: string
  }
): ProdutoMock[] {
  const items = readListFrom(input) as LopesProdutoRaw[]
  const fallbackImage = lookups.fallbackImage ?? "http://localhost:4000/assets/images/semImagem.png"

  return items.map((it) => {
    const id = toIntOrZero(it?.codProd)
    const name = safeString(it?.descricaoEcomerce) || safeString(it?.descricaoErp) || `Produto ${id}`
    const baseSlug = slugify(name)
    const slug = `/produtos/${baseSlug}-${id}`

    const ean = safeString(it?.ean)
    const sku = ean && normalizeText(ean) !== "null" ? `${ean}-${id}` : `${baseSlug}-${id}`

    const unitLabel = detectUnitLabel(name, it?.codVol)
    const sizeLabel = detectSizeLabel(name)

    const price = toNumberOrNull(it?.preco)
    const stock = toIntOrZero(it?.qtEstoque)

    const catIdRaw = toIntOrZero(it?.categoriaPrinciapal)
    const category = resolveCategoryFromSnapshot(lookups.categoriasById, catIdRaw)

    const image = safeString(it?.imagem) || fallbackImage
    const brand = resolveBrandFromSnapshot(lookups.brandsById, null)

    return {
      id,
      sku,
      name,
      slug,
      unitLabel,
      sizeLabel,
      price,
      compareAtPrice: null,
      badges: [],
      image,
      stock,
      inStock: stock > 0,
      category,
      brand,
    }
  })
}

export function translateLopesProdutoToProduto(
  input: unknown,
  lookups: {
    categoriasById: Map<number, Categoria>
    brandsById: Map<number, Brand>
    fallbackImage?: string
  }
): ProdutoMock | null {
  const list = readListFrom(input) as LopesProdutoRaw[]
  if (list.length > 0) {
    return translateLopesProdutosToProdutosMock(list, lookups)[0] ?? null
  }

  if (input && typeof input === "object" && !Array.isArray(input)) {
    const obj = input as Record<string, unknown>
    const data = obj.data
    if (data && typeof data === "object" && !Array.isArray(data)) {
      return translateLopesProdutosToProdutosMock([data], lookups)[0] ?? null
    }
    if ((obj as unknown as LopesProdutoRaw)?.codProd !== undefined) {
      return translateLopesProdutosToProdutosMock([obj], lookups)[0] ?? null
    }
  }

  return null
}

export function buildBrandsById(brands: Brand[]): Map<number, Brand> {
  const byId = new Map<number, Brand>()
  for (const b of brands) {
    byId.set(toIntOrZero((b as unknown as { id?: unknown })?.id), b)
  }
  return byId
}
