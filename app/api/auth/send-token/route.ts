import { NextResponse } from "next/server"

import { RawHttpError } from "@/liz_refator/integration/rawClient"
import { redactRawRequestInfo } from "@/liz_refator/integration/redact"
import { clientesRawEnviarToken } from "@/liz_refator/integration/usuariosRaw"

interface SendTokenRequestBody {
  email?: string
  whatsapp?: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SendTokenRequestBody
    const email = body.email?.trim() ?? ''
    const whatsapp = body.whatsapp?.trim() ?? ''

    if (!email && !whatsapp) {
      return NextResponse.json(
        {
          success: false,
          message: 'Informe email ou whatsapp para enviar o token.',
        },
        {
          status: 400,
        }
      )
    }

    const result = await clientesRawEnviarToken({ email: email || undefined, whatsapp: whatsapp || undefined })
    return NextResponse.json({ success: true, ...result, request: redactRawRequestInfo(result.request) })
  } catch (error) {
    if (error instanceof RawHttpError) {
      const status = error.status >= 400 ? error.status : 500
      return NextResponse.json(
        { success: false, message: error.message, request: redactRawRequestInfo(error.request), data: error.data },
        { status }
      )
    }

    const message = error instanceof Error ? error.message : 'Unexpected send-token error'

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
