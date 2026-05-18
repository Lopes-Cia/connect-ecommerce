import { NextResponse } from "next/server"

import { buildCatalogHeaders } from "@/lib/integration/catalogHeaders"
import type { Brand } from "@/lib/types/produtos"

export const dynamic = "force-dynamic"

async function readBrandsSnapshot(): Promise<Brand[]> {
  const fs = await import("node:fs/promises")
  const path = await import("node:path")

  const filePath = path.join(process.cwd(), "lib", "mockups", "data", "brands.json")
  const raw = await fs.readFile(filePath, "utf8")
  const parsed = JSON.parse(raw) as unknown

  return Array.isArray(parsed) ? (parsed as Brand[]) : []
}

export async function GET() {
  try {
    const brands = await readBrandsSnapshot()
    return NextResponse.json(
      { success: true, data: brands },
      { headers: buildCatalogHeaders({ origin: "lopes", readModel: "none" }) }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected integration error"
    return NextResponse.json(
      { success: false, message },
      { status: 500, headers: buildCatalogHeaders({ origin: "lopes", readModel: "none" }) }
    )
  }
}

