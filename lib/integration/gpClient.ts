import 'server-only'

import { fetchWithRetry, HttpError, readResponseData } from '@/lib/integration/network'

function readRequiredEnv(key: string): string {
  const value = process.env[key]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

function readBaseUrl(): string {
  const value = process.env.GP_BASE_URL?.trim()
  if (!value) {
    return 'https://gp.lopesecia.com.br:9004'
  }
  return value.replace(/\/+$/, '')
}

export async function getClienteIntegrado(params: {
  idIntegradora: string | number
  cgc: string
}) {
  const baseUrl = readBaseUrl()
  const token = readRequiredEnv('GP_CLIENTE_INTEGRADO_TOKEN')

  const idIntegradora = String(params.idIntegradora).trim()
  const cgc = String(params.cgc).trim()

  const url = `${baseUrl}/Servidor/webservice/integration/getClienteIntegrado?idIntegradora=${encodeURIComponent(
    idIntegradora
  )}&cgc=${encodeURIComponent(cgc)}`

  const response = await fetchWithRetry(
    url,
    {
      method: 'GET',
      headers: {
        token,
      },
    },
    { maxAttempts: 3 }
  )

  const data = await readResponseData<unknown>(response)

  if (!response.ok) {
    throw new HttpError('Failed to fetch cliente integrado', response.status, url, data)
  }

  return data
}

export async function insertDadoIntegration(payload: {
  idIntegradora: number | string
  tipo: string
  orderId: string
  payload: string
  integrado: string
}) {
  const baseUrl = readBaseUrl()
  const token = readRequiredEnv('GP_CLIENTE_INTEGRADO_TOKEN')

  const url = `${baseUrl}/Servidor/webservice/integration/insertDadoIntegration`
  const response = await fetchWithRetry(
    url,
    {
      method: 'POST',
      headers: {
        token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
    { maxAttempts: 3 }
  )

  const data = await readResponseData<unknown>(response)

  if (!response.ok) {
    throw new HttpError('Failed to insert dado integration', response.status, url, data)
  }

  return data
}
