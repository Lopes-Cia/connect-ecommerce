import { NextResponse } from "next/server"

import { setSession } from "@/lib/auth/session"
import { RawHttpError, integrationRawGetJsonAuth } from "@/liz_refator/integration/rawClient"
import { redactRawRequestInfo } from "@/liz_refator/integration/redact"
import { CLIENTES_API_ROUTES } from "@/liz_refator/integration/integrationRoutes"
import { clientesRawVerificarToken } from "@/liz_refator/integration/usuariosRaw"

interface VerifyTokenRequestBody {
  token: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<VerifyTokenRequestBody>
    const token = (body.token ?? '').trim()

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: 'Token de validacao e obrigatorio.',
        },
        {
          status: 400,
        }
      )
    }

    const verifyResult = await clientesRawVerificarToken({ token })
    const verifyRecord =
      verifyResult.data && typeof verifyResult.data === "object" && !Array.isArray(verifyResult.data)
        ? (verifyResult.data as Record<string, unknown>)
        : null
    const cnpjCliente = String(verifyRecord?.cnpjCliente ?? "").trim()
    if (!cnpjCliente) {
      return NextResponse.json(
        { success: false, message: "Token validado sem cnpjCliente.", request: redactRawRequestInfo(verifyResult.request), data: verifyResult.data },
        { status: 502 }
      )
    }

    const clienteLoja = await integrationRawGetJsonAuth<unknown>(CLIENTES_API_ROUTES.getClienteLoja, { cgc: cnpjCliente })
    const clienteRecord =
      clienteLoja.data && typeof clienteLoja.data === "object" && !Array.isArray(clienteLoja.data)
        ? (clienteLoja.data as Record<string, unknown>)
        : null
    const customerId = Number(clienteRecord?.customerId)
    if (!Number.isFinite(customerId) || customerId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Cliente encontrado sem customerId válido.",
          request: redactRawRequestInfo(clienteLoja.request),
          data: clienteLoja.data,
        },
        { status: 502 }
      )
    }

    const email = String(clienteRecord?.email ?? "").trim()
    const nome = String(clienteRecord?.cliente ?? "").trim()
    const tokenFinal = String(verifyRecord?.hashToken ?? token).trim() || token

    await setSession({
      userId: String(customerId),
      email,
      token: tokenFinal,
      name: nome,
      cliente: { cnpj: cnpjCliente, customerId, email: email || undefined, nome: nome || undefined },
    })

    return NextResponse.json({
      success: true,
      request: redactRawRequestInfo(verifyResult.request),
      data: verifyResult.data,
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

    const message = error instanceof Error ? error.message : 'Unexpected verify-token error'

    return NextResponse.json(
      {
        success: false,
        message,
      },
      {
        status: 500,
      }
    )
  }
}
