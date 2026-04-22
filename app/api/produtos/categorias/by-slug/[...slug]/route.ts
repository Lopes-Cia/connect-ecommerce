import { NextResponse } from 'next/server'

import { HttpError } from '@/lib/integration/network'
import { getCategoriaBySlug } from '@/liz_refator/integration/produtos'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await context.params
    const parts = Array.isArray(slug) ? slug.map((p) => String(p ?? '').trim()).filter(Boolean) : []
    const safeSlug = parts.join('/')

    if (!safeSlug) {
      return NextResponse.json(
        { success: false, message: 'slug must include category path segments' },
        { status: 400 }
      )
    }

    const result = await getCategoriaBySlug(safeSlug)
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
