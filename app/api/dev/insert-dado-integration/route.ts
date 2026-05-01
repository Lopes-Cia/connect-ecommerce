import { NextResponse } from 'next/server'

import { getIntegrationEnvConfig } from '@/lib/integration/config'
import { insertDadoIntegration } from '@/lib/integration/gpClient'
import { HttpError } from '@/lib/integration/network'

export const dynamic = 'force-dynamic'

type InsertBody = {
  tipo: string
  orderId: string
  payload: string
  integrado: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<InsertBody>

    const idIntegradora = getIntegrationEnvConfig().idIntegradora
    const tipo = String(body.tipo ?? '').trim()
    const orderId = String(body.orderId ?? '').trim()
    const payload = String(body.payload ?? '').trim()
    const integrado = String(body.integrado ?? '').trim()

    if (!tipo || !orderId) {
      return NextResponse.json(
        { success: false, message: 'Parâmetros obrigatórios ausentes: tipo, orderId' },
        { status: 400 }
      )
    }

    const data = await insertDadoIntegration({
      idIntegradora,
      tipo,
      orderId,
      payload,
      integrado: integrado || 'N',
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
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
