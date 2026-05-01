import { NextResponse } from "next/server"

import { authRawGetJsonAuth, RawHttpError } from "@/liz_refator/integration/rawClient"
import { AUTH_API_ROUTES } from "@/liz_refator/integration/integrationRoutes"
import { redactRawRequestInfo } from "@/liz_refator/integration/redact"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 })
  }

  const url = new URL(request.url)
  const email = (url.searchParams.get("email") ?? "").trim()

  if (!email) {
    return NextResponse.json({ success: false, message: "Missing required query param: email" }, { status: 400 })
  }

  try {
    const result = await authRawGetJsonAuth<unknown>(AUTH_API_ROUTES.getOperadorSistema, { email })
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

