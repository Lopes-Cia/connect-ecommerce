import { NextRequest, NextResponse } from 'next/server'

import { getIntegrationEnvConfig } from '@/lib/integration/config'
import { getIntegratedProductByCode } from '@/lib/integration/productsService'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ codProd: string }> }
) {
  try {
    const { codProd } = await context.params
    const parsedCodProd = Number.parseInt(codProd, 10)

    if (Number.isNaN(parsedCodProd)) {
      return NextResponse.json(
        {
          success: false,
          message: 'codProd must be a valid number',
        },
        {
          status: 400,
        }
      )
    }

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

    const product = await getIntegratedProductByCode(parsedCodProd, idIntegradora)

    return NextResponse.json({
      success: true,
      data: product,
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
