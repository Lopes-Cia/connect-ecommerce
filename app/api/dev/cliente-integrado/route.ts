import { NextResponse } from 'next/server'

import { getClienteIntegrado } from '@/lib/integration/gpClient'
import { HttpError } from '@/lib/integration/network'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const idIntegradora = url.searchParams.get('idIntegradora')?.trim() ?? ''
    const cgc = url.searchParams.get('cgc')?.trim() ?? ''

    if (!idIntegradora || !cgc) {
      return NextResponse.json(
        {
          success: false,
          message: 'Parâmetros obrigatórios ausentes: idIntegradora, cgc',
        },
        { status: 400 }
      )
    }

    const data = await getClienteIntegrado({ idIntegradora, cgc })
    return NextResponse.json({ success: true, data })
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        error.data ?? { success: false, message: 'Erro na integração (cliente-integrado)' },
        { status: error.status }
      )
    }

    const message = error instanceof Error ? error.message : 'Unexpected integration error'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}

