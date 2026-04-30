import { NextResponse } from "next/server"

import { getIntegrationEnvConfig } from "@/liz_refator/adapters/integration-config"
import { authRawPostJsonAuth, RawHttpError } from "@/liz_refator/integration/rawClient"
import { AUTH_API_ROUTES } from "@/liz_refator/integration/integrationRoutes"
import { redactRawRequestInfo } from "@/liz_refator/integration/redact"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 })
  }

  const env = getIntegrationEnvConfig()

  let body: unknown = null
  try {
    body = await request.json()
  } catch {
    body = null
  }

  const normalizedBody =
    body && typeof body === "object" && !Array.isArray(body)
      ? { ...(body as Record<string, unknown>), idIntegradora: env.idIntegradora }
      : { idIntegradora: env.idIntegradora }

  try {
    const result = await authRawPostJsonAuth<unknown>(AUTH_API_ROUTES.insertVinculoUsuarioSite, normalizedBody)
    return NextResponse.json({ success: true, ...result, request: redactRawRequestInfo(result.request) })
  } catch (error) {
    if (error instanceof RawHttpError) {
      const status = error.status >= 400 ? error.status : 500
      return NextResponse.json(
        { success: false, message: error.message, request: redactRawRequestInfo(error.request), data: error.data },
        { status }
      )
    }

    const message = error instanceof Error ? error.message : "Unexpected auth error"
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}

