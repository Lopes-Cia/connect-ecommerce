import { NextResponse } from 'next/server'

import { HttpError } from '@/lib/integration/network'
import { getProdutoBySlug } from '@/lib/integration/produtosService'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params
    const normalized = String(slug ?? '').trim()

    if (!normalized) {
      return NextResponse.json(
        { success: false, message: 'slug must be a non-empty string' },
        { status: 400 }
      )
    }

    const decoded = decodeURIComponent(normalized)
    const withoutLeading = decoded.startsWith('/') ? decoded.slice(1) : decoded
    const baseSlug = withoutLeading.startsWith('produtos/')
      ? withoutLeading.slice('produtos/'.length)
      : withoutLeading

    if (!baseSlug) {
      return NextResponse.json(
        { success: false, message: 'slug must include a product slug segment' },
        { status: 400 }
      )
    }

    const result = await getProdutoBySlug(baseSlug)
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
