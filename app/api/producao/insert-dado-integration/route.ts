import { NextResponse } from 'next/server'

import { getSession } from '@/lib/auth/session'
import { getIntegrationEnvConfig } from '@/lib/integration/config'
import { HttpError } from '@/lib/integration/network'
import { PEDIDOS_INTEGRATION_ROUTES } from '@/liz_refator/integration/integrationRoutes'
import { RawHttpError, integrationRawPostJsonServerToken } from '@/liz_refator/integration/rawClient'

export const dynamic = 'force-dynamic'

type InsertBody = {
  tipo: string
  orderId: string
  payload: string
  integrado: string
  cgc: string
}

function readGpBaseUrl(): string {
  const value = process.env.GP_BASE_URL?.trim()
  if (!value) return 'https://gp.lopesecia.com.br:9004'
  return value.replace(/\/+$/, '')
}

export async function POST(request: Request) {
  const gpUrl = `${readGpBaseUrl()}/Servidor/webservice/integration/insertDadoIntegration`

  try {
    const body = (await request.json()) as Partial<InsertBody>

    const session = await getSession()
    const cgc = session?.cliente?.cnpj ? String(session.cliente.cnpj).trim() : ''
    if (!cgc) {
      return NextResponse.json(
        {
          success: false,
          message: 'Sessão inválida. Faça login novamente.',
          request: { url: gpUrl, method: 'POST', payload: null },
        },
        { status: 401 }
      )
    }
    const idIntegradora = getIntegrationEnvConfig().idIntegradora
    const tipo = String(body.tipo ?? '').trim()
    const orderId = String(body.orderId ?? '').trim()
    const payload = String(body.payload ?? '').trim()
    const integrado = String(body.integrado ?? '').trim()


    if (!tipo || !orderId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Parâmetros obrigatórios ausentes: tipo, orderId',
          request: { url: gpUrl, method: 'POST', payload: null },
        },
        { status: 400 }
      )
    }

    const payloadToGp = {
      idIntegradora,
      tipo,
      orderId,
      payload,
      integrado: integrado || 'N',
      cgc,
    }

    const result = await integrationRawPostJsonServerToken<unknown>(
      PEDIDOS_INTEGRATION_ROUTES.insertDadoIntegration,
      payloadToGp
    )

    return NextResponse.json({
      success: true,
      request: { url: gpUrl, method: 'POST', payload: payloadToGp },
      integration: result,
      data: result.data,
    })
  } catch (error) {
    if (error instanceof RawHttpError) {
      return NextResponse.json(
        { success: false, message: error.message, request: { url: gpUrl, method: 'POST', payload: null }, data: error.data },
        { status: error.status }
      )
    }
    if (error instanceof HttpError) {
      return NextResponse.json(
        error.data ?? { success: false, message: 'Erro na integração (insertDadoIntegration)' },
        { status: error.status }
      )
    }

    const message = error instanceof Error ? error.message : 'Unexpected integration error'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
