import { NextResponse } from "next/server"

import { getIntegrationEnvConfig } from "@/liz_refator/adapters/integration-config"
import { parseInsertClienteLojaResult } from "@/liz_refator/contracts/lopes/clientes"
import { integrationRawPostJsonAuth, RawHttpError } from "@/liz_refator/integration/rawClient"
import { CLIENTES_API_ROUTES } from "@/liz_refator/integration/integrationRoutes"
import { redactRawRequestInfo } from "@/liz_refator/integration/redact"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 })
  }

  const env = getIntegrationEnvConfig()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const normalizedBody =
    body && typeof body === "object" && !Array.isArray(body)
      ? { ...(body as Record<string, unknown>), idIntegradora: env.idIntegradora }
      : { idIntegradora: env.idIntegradora }

  try {
    const result = await integrationRawPostJsonAuth<unknown>(CLIENTES_API_ROUTES.insertClienteLoja, normalizedBody)
    const parsed = parseInsertClienteLojaResult(result.data)
    return NextResponse.json({ success: true, request: redactRawRequestInfo(result.request), data: parsed })
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
