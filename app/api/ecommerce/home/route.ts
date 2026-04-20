import { NextResponse } from 'next/server'

import { HttpError } from '@/lib/integration/network'
import { getHome } from '@/lib/integration/ecommerceService'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    if (process.env.NEXT_PUBLIC_FONTE === 'lopes') {
      const fs = await import('node:fs/promises')
      const path = await import('node:path')
      const filePath = path.join(process.cwd(), 'lib', 'mockups', 'data', 'colections.json')
      const raw = await fs.readFile(filePath, 'utf8')
      const parsed = JSON.parse(raw) as unknown
      return NextResponse.json(
        { success: true, data: parsed },
        { headers: { 'x-data-source': 'colections.json (lopes)' } }
      )
    }

    const result = await getHome()
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        error.data ?? { success: false, message: 'Erro na integração (ecommerce)' },
        { status: error.status }
      )
    }

    const message = error instanceof Error ? error.message : 'Unexpected integration error'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
