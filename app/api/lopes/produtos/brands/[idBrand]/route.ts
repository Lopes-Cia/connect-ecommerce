import { NextRequest, NextResponse } from "next/server"

import type { Brand, BrandByIdPayload, Produto } from "@/lib/types/produtos"

export const dynamic = "force-dynamic"

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
  try {
    const { idBrand } = await context.params
    const parsedId = Number.parseInt(idBrand, 10)

    if (Number.isNaN(parsedId)) {
      return NextResponse.json({ success: false, message: "idBrand must be a valid number" }, { status: 400 })
    }

    const page = parseIntOr(request.nextUrl.searchParams.get("page"), 1)
    const pageSize = parseIntOr(request.nextUrl.searchParams.get("pageSize"), 24)

    if (page < 1) {
      return NextResponse.json({ success: false, message: "page must be >= 1" }, { status: 400 })
    }
    if (pageSize < 1 || pageSize > 100) {
      return NextResponse.json({ success: false, message: "pageSize must be between 1 and 100" }, { status: 400 })
    }

    const brands = await readBrandsSnapshot()
    const brand = brands.find((b) => b.id === parsedId)
    if (!brand) {
      return NextResponse.json({ success: false, message: "Brand not found" }, { status: 404 })
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

    return NextResponse.json(
      { success: true, data: payload },
      { headers: { "x-data-source": "brands.json" } }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected integration error"
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}

