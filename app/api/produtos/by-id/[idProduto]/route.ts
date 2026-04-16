import { NextResponse } from 'next/server'

import { HttpError } from '@/lib/integration/network'
import { getProdutoById } from '@/lib/integration/produtosService'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  context: { params: Promise<{ idProduto: string }> }
) {
  try {
    const { idProduto } = await context.params
    const parsedId = Number.parseInt(idProduto, 10)

    if (Number.isNaN(parsedId)) {
      return NextResponse.json(
        { success: false, message: 'idProduto must be a valid number' },
        { status: 400 }
      )
    }

    const result = await getProdutoById(parsedId)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        error.data ?? { success: false, message: 'Erro na integração (produtos)' },
        { status: error.status }
      )
    }

    const message = error instanceof Error ? error.message : 'Unexpected integration error'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
