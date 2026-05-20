import { NextResponse } from "next/server"

import { buildCatalogHeaders } from "@/lib/integration/catalogHeaders"
import { ensureCatalogSynced } from "@/lib/integration/catalogAutoSync"
import { listCatalogBrands } from "@/lib/integration/catalogService"
import type { Brand } from "@/lib/types/produtos"

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

async function readBrandsSnapshot(): Promise<Brand[]> {
  const fs = await import("node:fs/promises")
  const path = await import("node:path")

  const filePath = path.join(process.cwd(), "lib", "mockups", "data", "brands.json")
  const raw = await fs.readFile(filePath, "utf8")
  const parsed = JSON.parse(raw) as unknown

  return Array.isArray(parsed) ? (parsed as Brand[]) : []
}

export async function GET() {
  const headersRedis = buildCatalogHeaders({ origin: "lopes", readModel: "redis" })
  const headersFallback = buildCatalogHeaders({ origin: "lopes", readModel: "none" })

  try {
    try {
      await ensureCatalogSynced()
      const rawBrands = await listCatalogBrands<unknown>()
      const brands = rawBrands.map(toBrand).filter(Boolean) as Brand[]
      return NextResponse.json({ success: true, data: brands }, { headers: headersRedis })
    } catch {
      const brands = await readBrandsSnapshot()
      return NextResponse.json({ success: true, data: brands }, { headers: headersFallback })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected integration error"
    return NextResponse.json({ success: false, message }, { status: 500, headers: headersFallback })
  }
}

