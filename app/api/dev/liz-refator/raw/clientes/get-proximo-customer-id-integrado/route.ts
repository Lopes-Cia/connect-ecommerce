import { NextResponse } from "next/server"

import { parseProximoCustomerIdIntegrado } from "@/liz_refator/contracts/lopes/clientes"
import { integrationRawGetJsonAuth, RawHttpError } from "@/liz_refator/integration/rawClient"
import { CLIENTES_API_ROUTES } from "@/liz_refator/integration/integrationRoutes"
import { redactRawRequestInfo } from "@/liz_refator/integration/redact"

export const dynamic = "force-dynamic"

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 })
  }

  try {
    const result = await integrationRawGetJsonAuth<unknown>(CLIENTES_API_ROUTES.getProximoCustomerIdIntegrado)
    const parsed = parseProximoCustomerIdIntegrado(result.data)
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
