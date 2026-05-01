import { NextResponse } from "next/server"

import { getSession } from "@/lib/auth/session"
import { RawHttpError, integrationRawGetJsonAuth } from "@/liz_refator/integration/rawClient"
import { redactRawRequestInfo } from "@/liz_refator/integration/redact"
import { CLIENTES_API_ROUTES } from "@/liz_refator/integration/integrationRoutes"

export async function GET() {
  try {
    const session = await getSession()
    const cnpj = session?.cliente?.cnpj?.trim() ?? ""

    if (!cnpj) {
      return NextResponse.json({ success: false, message: "Não autenticado." }, { status: 401 })
    }

    const clienteLoja = await integrationRawGetJsonAuth<unknown>(CLIENTES_API_ROUTES.getClienteLoja, {
      cgc: cnpj,
    })

    return NextResponse.json({
      success: true,
      clienteLoja: { request: redactRawRequestInfo(clienteLoja.request), data: clienteLoja.data },
    })
  } catch (error) {
    if (error instanceof RawHttpError) {
      const status = error.status >= 400 ? error.status : 500
      return NextResponse.json(
        { success: false, message: error.message, request: redactRawRequestInfo(error.request), data: error.data },
        { status }
      )
    }

    const message = error instanceof Error ? error.message : "Unexpected cliente-loja error"
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}

