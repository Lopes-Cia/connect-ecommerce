import 'server-only'

import { ensureAuthWebserviceToken } from '@/liz_refator/adapters/integration-auth'
import { getIntegrationEnvConfig } from '@/liz_refator/adapters/integration-config'
import { fetchWithRetry, readResponseData } from '@/liz_refator/adapters/integration-network'
import { toRawToken } from '@/liz_refator/adapters/integration-token'

import type { IntegrationQueryParams } from './client'
import { RawHttpError } from './rawClient'
import type { RawRequestInfo, RawIntegrationResponse } from './rawClient'
import { USUARIOS_API_ROUTES } from './integrationRoutes'

function buildWebserviceApiUrl(baseUrl: string, path: string, query: IntegrationQueryParams): string {
  const normalizedBase = baseUrl.replace(/\/+$/, '')
  let normalizedPath = path.startsWith('/') ? path : `/${path}`

  if (/\/webservice\/api$/i.test(normalizedBase) && /^\/webservice\/api\//i.test(normalizedPath)) {
    normalizedPath = normalizedPath.slice('/webservice/api'.length)
  }

  const url = new URL(`${normalizedBase}${normalizedPath}`)

  for (const [key, value] of Object.entries(query)) {
    if (value !== null && value !== undefined) {
      url.searchParams.set(key, String(value))
    }
  }

  return url.toString()
}

async function rawPostJson<T>(path: string, query: IntegrationQueryParams): Promise<RawIntegrationResponse<T>> {
  const { authBaseUrl } = getIntegrationEnvConfig()
  const url = buildWebserviceApiUrl(authBaseUrl, path, query)
  const headers: Record<string, string> = { Accept: 'application/json' }
  const requestInfo: RawRequestInfo = { url, method: 'POST', headers, query }

  let response: Response
  try {
    response = await fetchWithRetry(url, { method: 'POST', headers }, { maxAttempts: 3 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'User API network request failed'
    throw new RawHttpError('Integration request failed', 500, url, { message }, requestInfo)
  }

  const data = await readResponseData<T>(response)

  if (!response.ok) {
    throw new RawHttpError('Integration request failed', response.status, url, data, requestInfo)
  }

  return { request: requestInfo, data }
}

async function rawPostJsonAuth<T>(path: string, query: IntegrationQueryParams): Promise<RawIntegrationResponse<T>> {
  const { authBaseUrl } = getIntegrationEnvConfig()
  const url = buildWebserviceApiUrl(authBaseUrl, path, query)

  const token = await ensureAuthWebserviceToken({ backgroundRefresh: true })
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: toRawToken(token.hashToken),
  }

  const requestInfo: RawRequestInfo = { url, method: 'POST', headers, query }

  let response: Response
  try {
    response = await fetchWithRetry(url, { method: 'POST', headers }, { maxAttempts: 3 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'User API network request failed'
    throw new RawHttpError('Integration request failed', 500, url, { message }, requestInfo)
  }

  const data = await readResponseData<T>(response)

  if (!response.ok) {
    throw new RawHttpError('Integration request failed', response.status, url, data, requestInfo)
  }

  return { request: requestInfo, data }
}

export async function usuariosRawEnviarToken(query: { email?: string; whatsapp?: string }): Promise<RawIntegrationResponse<string>> {
  return rawPostJsonAuth<string>(USUARIOS_API_ROUTES.enviarToken, query)
}

export async function usuariosRawVerificarToken(query: { token: string; idIntegradora?: number }): Promise<RawIntegrationResponse<unknown>> {
  return rawPostJsonAuth<unknown>(USUARIOS_API_ROUTES.verificarToken, query)
}
