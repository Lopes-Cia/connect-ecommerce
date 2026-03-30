import { NextResponse } from 'next/server'

import { setSession } from '@/lib/auth/session'
import { getAuthWebserviceBaseUrl } from '@/lib/auth/externalApi'
import { ensureAuthReady } from '@/lib/integration/authService'
import { fetchWithRetry, readResponseData } from '@/lib/integration/network'

interface VerifyTokenRequestBody {
  token: string
}

interface VerifyTokenResponse {
  idUsuario: number
  hashToken: string
  canal: string
  cnpjCliente?: string
  dtCriacao?: string
  dtExpira?: string
  usado?: boolean
  tentativas?: number
  maxTentativas?: number
}

interface OperadorResponse {
  id: number
  nome?: string
  email?: string
  telefone?: string
  [key: string]: unknown
}

function toRawToken(hashToken: string): string {
  return hashToken.toLowerCase().startsWith('bearer ')
    ? hashToken.slice(7).trim()
    : hashToken
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<VerifyTokenRequestBody>
    const token = (body.token ?? '').trim()

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: 'Token de validacao e obrigatorio.',
        },
        {
          status: 400,
        }
      )
    }

    const auth = await ensureAuthReady({ backgroundRefresh: false })
    const authHeader = toRawToken(auth.token.hashToken)
    const baseUrl = getAuthWebserviceBaseUrl()

    const verifyUrl = `${baseUrl}/verificarTokenSistema?token=${encodeURIComponent(token)}`
    const verifyResponse = await fetchWithRetry(
      verifyUrl,
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

    const verifyData = await readResponseData<VerifyTokenResponse>(verifyResponse)

    if (!verifyResponse.ok || !verifyData || typeof verifyData.idUsuario !== 'number') {
      return NextResponse.json(
        {
          success: false,
          message: 'Falha ao validar token informado.',
          data: verifyData,
        },
        {
          status: verifyResponse.status || 401,
        }
      )
    }

    const operadorUrl = `${baseUrl}/getOperadorSistemaForId?id=${verifyData.idUsuario}`
    const operadorResponse = await fetchWithRetry(
      operadorUrl,
      {
        method: 'GET',
        headers: {
          Authorization: authHeader,
        },
      },
      {
        maxAttempts: 3,
      }
    )

    const operadorData = await readResponseData<OperadorResponse>(operadorResponse)

    if (!operadorResponse.ok || !operadorData || typeof operadorData.id !== 'number') {
      return NextResponse.json(
        {
          success: false,
          message: 'Falha ao carregar operador autenticado.',
          data: operadorData,
        },
        {
          status: operadorResponse.status || 401,
        }
      )
    }

    await setSession({
      userId: String(operadorData.id),
      email: operadorData.email ?? '',
      token: verifyData.hashToken || token,
      name: operadorData.nome,
    })

    return NextResponse.json({
      success: true,
      data: {
        verification: verifyData,
        operador: operadorData,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected verify-token error'

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
