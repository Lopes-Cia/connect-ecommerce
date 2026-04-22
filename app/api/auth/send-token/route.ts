import { NextResponse } from 'next/server'

import { getAuthWebserviceBaseUrl } from '@/lib/auth/externalApi'
import { ensureAuthWebserviceToken } from '@/lib/integration/authWebserviceClient'
import { fetchWithRetry, readResponseData } from '@/lib/integration/network'
import { toRawToken } from '@/lib/integration/token'

interface SendTokenRequestBody {
  email?: string
  whatsapp?: string
}



export async function POST(request: Request) {
  try {

    console.log("r1")
    const body = (await request.json()) as SendTokenRequestBody
    const email = body.email?.trim() ?? ''
    const whatsapp = body.whatsapp?.trim() ?? ''

    if (!email && !whatsapp) {
      return NextResponse.json(
        {
          success: false,
          message: 'Informe email ou whatsapp para enviar o token.',
        },
        {
          status: 400,
        }
      )
    }

    const query = new URLSearchParams()
    if (email) {
      query.set('email', email)
    } else {
      query.set('whatsapp', whatsapp)
    }

    const url = `${getAuthWebserviceBaseUrl()}/enviarToken?${query.toString()}`
    const tokenResponse = await ensureAuthWebserviceToken({ backgroundRefresh: false })
    const authHeader = toRawToken(tokenResponse.hashToken)

    const response = await fetchWithRetry(
      url,
      {
        method: 'POST',
        headers: {
          Authorization: authHeader,
        },
      },
      {
        maxAttempts: 3,
      }
    )

    const data = await readResponseData<unknown>(response)

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: 'Falha ao enviar token de acesso.',
          data,
        },
        {
          status: response.status,
        }
      )
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected send-token error'

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
