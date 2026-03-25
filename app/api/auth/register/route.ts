import { NextResponse } from 'next/server'

import { getActivationKey, getAuthWebserviceBaseUrl } from '@/lib/auth/externalApi'
import { ensureAuthReady } from '@/lib/integration/authService'
import { fetchWithRetry, readResponseData } from '@/lib/integration/network'

interface RegisterRequestBody {
  responsavel: string
  cnpj: string
  email: string
  whatsapp: string
}

function toRawToken(hashToken: string): string {
  return hashToken.toLowerCase().startsWith('bearer ')
    ? hashToken.slice(7).trim()
    : hashToken
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<RegisterRequestBody>
    const responsavel = (body.responsavel ?? '').trim()
    const cnpj = (body.cnpj ?? '').trim()
    const email = (body.email ?? '').trim()
    const whatsapp = (body.whatsapp ?? '').trim()

    if (!responsavel || !cnpj || !email || !whatsapp) {
      return NextResponse.json(
        {
          success: false,
          message: 'Campos obrigatorios ausentes para cadastro.',
        },
        {
          status: 400,
        }
      )
    }

    const url = `${getAuthWebserviceBaseUrl()}/postAutenteicaAplicativo`
    const auth = await ensureAuthReady({ backgroundRefresh: false })
    const authHeader = toRawToken(auth.token.hashToken)

    const response = await fetchWithRetry(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({
          chaveAtivacao: getActivationKey(),
          responsavel,
          cnpj,
          email,
          whatsapp,
        }),
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
          message: 'Falha ao cadastrar cliente.',
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
    const message = error instanceof Error ? error.message : 'Unexpected register error'

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
