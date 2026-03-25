import { NextRequest, NextResponse } from 'next/server'

import { getIntegrationEnvConfig } from '@/lib/integration/config'
import { getIntegratedProducts } from '@/lib/integration/productsService'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const env = getIntegrationEnvConfig()
    const queryValue = request.nextUrl.searchParams.get('idIntegradora')
    const idIntegradora = queryValue
      ? Number.parseInt(queryValue, 10)
      : env.idIntegradora

    if (Number.isNaN(idIntegradora)) {
      return NextResponse.json(
        {
          success: false,
          message: 'idIntegradora must be a valid number',
        },
        {
          status: 400,
        }
      )
    }

    const products = await getIntegratedProducts(idIntegradora)

    return NextResponse.json({
      success: true,
      data: products,
      total: products.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected integration error'

    return NextResponse.json(
      {
        success: false,
        message,
      },
      {
        status: 500,
      }
    )
  }
}
