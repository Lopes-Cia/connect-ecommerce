import { NextRequest, NextResponse } from "next/server"

import type { ApiSuccess } from "@/lib/types/produtos"
import { buildCatalogHeaders } from "@/lib/integration/catalogHeaders"
import { getCatalogKeyPrefix, getCatalogRedisClient } from "@/lib/integration/catalogRedis"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type OverwriteFlags = {
  category: 0 | 1
  brand: 0 | 1
  image: 0 | 1
}

const DEFAULT_FLAGS: OverwriteFlags = { category: 0, brand: 1, image: 0 }

function normalizeFlag(value: unknown): 0 | 1 {
  if (value === true) return 1
  if (value === false) return 0
  if (value === 1 || value === "1") return 1
  return 0
}

function toFlags(value: unknown): OverwriteFlags {
  if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULT_FLAGS
  const record = value as Record<string, unknown>
  return {
    category: normalizeFlag(record.category),
    brand: normalizeFlag(record.brand),
    image: normalizeFlag(record.image),
  }
}

async function readFlags(): Promise<OverwriteFlags> {
  const client = await getCatalogRedisClient()
  const prefix = getCatalogKeyPrefix()
  const key = `${prefix}:product_overwrite:global`
  const raw = await client.sendCommand(["JSON.GET", key])
  if (typeof raw !== "string" || !raw) return DEFAULT_FLAGS
  try {
    return toFlags(JSON.parse(raw) as unknown)
  } catch {
    return DEFAULT_FLAGS
  }
}

export async function GET() {
  const headers = buildCatalogHeaders({ origin: "lopes", readModel: "redis" })
  try {
    const flags = await readFlags()
    const payload: ApiSuccess<OverwriteFlags> = { success: true, data: flags }
    return NextResponse.json(payload, { headers })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected Redis error"
    return NextResponse.json({ success: false, message }, { status: 500, headers })
  }
}

export async function POST(request: NextRequest) {
  const headers = buildCatalogHeaders({ origin: "lopes", readModel: "redis" })
  try {
    const body = (await request.json().catch(() => null)) as unknown
    const flags = toFlags(body)

    const client = await getCatalogRedisClient()
    const prefix = getCatalogKeyPrefix()
    const key = `${prefix}:product_overwrite:global`

    await client.sendCommand(["JSON.SET", key, "$", JSON.stringify(flags)])

    const payload: ApiSuccess<OverwriteFlags> = { success: true, data: flags }
    return NextResponse.json(payload, { headers })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected Redis error"
    return NextResponse.json({ success: false, message }, { status: 500, headers })
  }
}
