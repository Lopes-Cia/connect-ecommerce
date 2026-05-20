import { NextRequest, NextResponse } from "next/server"

import { buildCatalogHeaders } from "@/lib/integration/catalogHeaders"
import { ensureCatalogSynced } from "@/lib/integration/catalogAutoSync"
import { listCatalogBrands, searchCatalogProducts } from "@/lib/integration/catalogService"
import type { Brand, BrandByIdPayload, Produto } from "@/lib/types/produtos"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as UnknownRecord
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
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

function normalizeSlug(value: string, name: string, id: number): string {
  const raw = String(value ?? "").trim()
  if (raw.startsWith("/")) return raw
  if (raw) return `/${raw.replace(/^\/+/, "")}`
  const slug = slugify(name) || String(id)
  return `/marca/${slug}`
}

function toBrand(raw: unknown): Brand | null {
  const record = asRecord(raw)
  if (!record) return null
  const id = asNumber(record.id)
  if (!id || id <= 0 || !Number.isInteger(id)) return null

  const name = asString(record.name) || asString(record.nome) || `Marca ${id}`
  const slug = normalizeSlug(asString(record.slug), name, id)
  const image = asString(record.image)
  return { id, name, slug, image }
}

function parseIntOr(value: string | null, fallback: number): number {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

async function readBrandsSnapshot(): Promise<Brand[]> {
  const fs = await import("node:fs/promises")
  const path = await import("node:path")

  const filePath = path.join(process.cwd(), "lib", "mockups", "data", "brands.json")
  const raw = await fs.readFile(filePath, "utf8")
  const parsed = JSON.parse(raw) as unknown

  return Array.isArray(parsed) ? (parsed as Brand[]) : []
}

export async function GET(request: NextRequest, context: { params: Promise<{ idBrand: string }> }) {
  const headersRedis = buildCatalogHeaders({ origin: "lopes", readModel: "redis" })
  const headersFallback = buildCatalogHeaders({ origin: "lopes", readModel: "none" })

  try {
    const { idBrand } = await context.params
    const parsedId = Number.parseInt(idBrand, 10)

    if (Number.isNaN(parsedId)) {
      return NextResponse.json(
        { success: false, message: "idBrand must be a valid number" },
        { status: 400, headers: headersFallback }
      )
    }

    const page = parseIntOr(request.nextUrl.searchParams.get("page"), 1)
    const pageSize = parseIntOr(request.nextUrl.searchParams.get("pageSize"), 24)

    if (page < 1) {
      return NextResponse.json({ success: false, message: "page must be >= 1" }, { status: 400, headers: headersFallback })
    }
    if (pageSize < 1 || pageSize > 100) {
      return NextResponse.json(
        { success: false, message: "pageSize must be between 1 and 100" },
        { status: 400, headers: headersFallback }
      )
    }

    try {
      await ensureCatalogSynced()

      const rawBrands = await listCatalogBrands<unknown>()
      const foundRaw = rawBrands.find((b) => asNumber(asRecord(b)?.id) === parsedId) ?? null
      const brand = foundRaw ? toBrand(foundRaw) : null
      if (!brand) {
        return NextResponse.json({ success: false, message: "Brand not found" }, { status: 404, headers: headersRedis })
      }

      const productsResult = await searchCatalogProducts<unknown>({
        query: `@brandId:[${parsedId} ${parsedId}]`,
        page,
        pageSize,
        sort: { field: "rank", dir: "desc" },
      })

      const totalPages = productsResult.total === 0 ? 0 : Math.ceil(productsResult.total / pageSize)

      const payload: BrandByIdPayload = {
        brand,
        products: {
          data: productsResult.items as unknown as Produto[],
          page,
          pageSize,
          total: productsResult.total,
          totalPages,
        },
      }

      return NextResponse.json({ success: true, data: payload }, { headers: headersRedis })
    } catch {
      const brands = await readBrandsSnapshot()
      const brand = brands.find((b) => b.id === parsedId)
      if (!brand) {
        return NextResponse.json({ success: false, message: "Brand not found" }, { status: 404, headers: headersFallback })
      }

      const payload: BrandByIdPayload = {
        brand,
        products: {
          data: [] as Produto[],
          page,
          pageSize,
          total: 0,
          totalPages: 1,
        },
      }

      return NextResponse.json({ success: true, data: payload }, { headers: headersFallback })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected integration error"
    return NextResponse.json({ success: false, message }, { status: 500, headers: headersFallback })
  }
}

