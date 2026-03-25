import { NextResponse } from 'next/server'

import { getIntegrationEnvConfig } from '@/lib/integration/config'
import { businessGet } from '@/lib/integration/httpClient'
import type { IntegrationConfig } from '@/lib/types/integration'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const env = getIntegrationEnvConfig()
    const integrationConfig = await businessGet<IntegrationConfig>(
      '/Servidor/webservice/integration/getIntegradora',
      {
        id: env.idIntegradora,
      }
    )

    return NextResponse.json({
      success: true,
      data: integrationConfig,
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
