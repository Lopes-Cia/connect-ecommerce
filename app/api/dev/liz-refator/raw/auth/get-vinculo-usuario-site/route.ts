import { NextResponse } from "next/server"

import { getIntegrationEnvConfig } from "@/liz_refator/adapters/integration-config"
import { authRawGetJsonAuth, RawHttpError } from "@/liz_refator/integration/rawClient"
import { AUTH_API_ROUTES } from "@/liz_refator/integration/integrationRoutes"
import { redactRawRequestInfo } from "@/liz_refator/integration/redact"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 })
  }

  const env = getIntegrationEnvConfig()
  const url = new URL(request.url)
  const email = (url.searchParams.get("email") ?? "").trim()
  const cnpj = (url.searchParams.get("cnpj") ?? "").trim()

  if (!email || !cnpj) {
    return NextResponse.json({ success: false, message: "Missing required query params: email, cnpj" }, { status: 400 })
  }

  try {
    const result = await authRawGetJsonAuth<unknown>(AUTH_API_ROUTES.getVinculoUsuarioSite, {
      idIntegradora: env.idIntegradora,
      email,
      cnpj,
    })
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

