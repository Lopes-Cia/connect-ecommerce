import { NextResponse } from "next/server"

import { integrationRawGetJsonAuth, RawHttpError } from "@/liz_refator/integration/rawClient"
import { PRODUTOS_INTEGRATION_ROUTES } from "@/liz_refator/integration/integrationRoutes"
import { redactRawRequestInfo } from "@/liz_refator/integration/redact"

export const dynamic = "force-dynamic"

function parseRequiredIntParam(value: string | null, fallback: number): number {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)

  const query = {
    codigo: parseRequiredIntParam(searchParams.get("codigo"), 1),
  }

  try {
    const result = await integrationRawGetJsonAuth<unknown>(
      PRODUTOS_INTEGRATION_ROUTES.getCategoria,
      query
    )

    return NextResponse.json({ success: true, ...result, request: redactRawRequestInfo(result.request) })
  } catch (error) {
    if (error instanceof RawHttpError) {
      const status = error.status >= 400 ? error.status : 500
      return NextResponse.json(
        { success: false, message: error.message, request: redactRawRequestInfo(error.request), data: error.data },
        { status }
      )
    }

    const message = error instanceof Error ? error.message : "Unexpected integration error"
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
