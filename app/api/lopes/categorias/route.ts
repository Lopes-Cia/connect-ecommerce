import { NextResponse } from 'next/server'

import { getBackListCategoria } from '@/lib/integration/lopesBackClient'
import { HttpError } from '@/lib/integration/network'
import { translateLopesCategoriasToCategoriasTree } from '@/lib/mockups/syncDataFromBackToFront'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const query: Record<string, string> = {}

    for (const [key, value] of url.searchParams.entries()) {
      query[key] = value
    }

    const result =
      Object.keys(query).length > 0 ? await getBackListCategoria(query) : await getBackListCategoria()

    return NextResponse.json({ success: true, data: translateLopesCategoriasToCategoriasTree(result) })
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
