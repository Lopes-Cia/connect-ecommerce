import { NextResponse } from 'next/server'

import { getBackProdutoLoja } from '@/lib/integration/lopesBackClient'
import { HttpError } from '@/lib/integration/network'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const query: Record<string, string> = {}

    for (const [key, value] of url.searchParams.entries()) {
      query[key] = value
    }

    const result =
      Object.keys(query).length > 0 ? await getBackProdutoLoja(query) : await getBackProdutoLoja()

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

