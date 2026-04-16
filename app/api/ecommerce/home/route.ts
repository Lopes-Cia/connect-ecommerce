import { NextResponse } from 'next/server'

import { HttpError } from '@/lib/integration/network'
import { getHome } from '@/lib/integration/ecommerceService'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
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

