import { NextResponse } from 'next/server'

import { getBackCategoria } from '@/lib/integration/lopesBackClient'
import { HttpError } from '@/lib/integration/network'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const codigo = url.searchParams.get('codigo')
    if (!codigo) {
      return NextResponse.json(
        { success: false, message: "Required parameter 'codigo' is not present." },
        { status: 400 }
      )
    }

    const result = await getBackCategoria({ codigo })
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        error.data ?? { success: false, message: 'Erro na integração (lopes back)' },
        { status: error.status }
      )
    }

    const message = error instanceof Error ? error.message : 'Unexpected integration error'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}

