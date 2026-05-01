import { NextResponse } from "next/server"

import { getIntegrationEnvConfig } from "@/liz_refator/adapters/integration-config"
import { integrationRawGetJsonAuth, RawHttpError } from "@/liz_refator/integration/rawClient"
import { PRODUTOS_INTEGRATION_ROUTES } from "@/liz_refator/integration/integrationRoutes"
import { redactRawRequestInfo } from "@/liz_refator/integration/redact"

export const dynamic = "force-dynamic"

function parseIntParam(value: string | null): number | undefined {
  if (!value) return undefined
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? undefined : parsed
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 })
  }

  const env = getIntegrationEnvConfig()
  const { searchParams } = new URL(request.url)

  const query = {
    codProd: parseIntParam(searchParams.get("codProd")),
    ean: searchParams.get("ean") ?? undefined,
    productId: searchParams.get("productId") ?? undefined,
    descricaoErp: searchParams.get("descricaoErp") ?? undefined,
    skuId: searchParams.get("skuId") ?? undefined,
    cnpjCliente: searchParams.get("cnpjCliente") ?? undefined,
  }

  try {
    const result = await integrationRawGetJsonAuth<unknown>(
      PRODUTOS_INTEGRATION_ROUTES.getProdutoLoja,
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
