import 'server-only'

import { ensureAuthWebserviceToken } from '@/liz_refator/adapters/integration-auth'
import { getIntegrationEnvConfig } from '@/liz_refator/adapters/integration-config'
import { fetchWithRetry, HttpError, readResponseData } from '@/liz_refator/adapters/integration-network'
import { toRawToken } from '@/liz_refator/adapters/integration-token'

import type { IntegrationQueryParams } from './client'

export type RawRequestInfo = {
  url: string
  method: 'GET' | 'POST'
  headers: Record<string, string>
  query: IntegrationQueryParams
}

export type RawIntegrationResponse<T> = {
  request: RawRequestInfo
  data: Awaited<T> | null
}

export class RawHttpError extends HttpError {
  request: RawRequestInfo

  constructor(message: string, status: number, url: string, data: unknown, request: RawRequestInfo) {
    super(message, status, url, data)
    this.name = 'RawHttpError'
    this.request = request
  }
}

function buildIntegrationUrl(baseUrl: string, path: string, query: IntegrationQueryParams): string {
  const normalizedBase = baseUrl.replace(/\/+$/, '')
  let normalizedPath = path.startsWith('/') ? path : `/${path}`

  if (/\/Servidor$/i.test(normalizedBase) && /^\/Servidor\//i.test(normalizedPath)) {
    normalizedPath = normalizedPath.slice('/Servidor'.length)
  }

  const url = new URL(`${normalizedBase}${normalizedPath}`)

  for (const [key, value] of Object.entries(query)) {
    if (value !== null && value !== undefined) {
      url.searchParams.set(key, String(value))
    }
  }

  return url.toString()
}

function withEnvIdIntegradora(query?: IntegrationQueryParams): IntegrationQueryParams {
  const env = getIntegrationEnvConfig()
  const { idIntegradora: _ignored, ...rest } = (query ?? {}) as IntegrationQueryParams
  return { ...rest, idIntegradora: env.idIntegradora }
}

function stripIdIntegradora(query?: IntegrationQueryParams): IntegrationQueryParams {
  const { idIntegradora: _ignored, ...rest } = (query ?? {}) as IntegrationQueryParams
  return rest
}

export async function integrationRawGetJson<T>(
  path: string,
  query?: IntegrationQueryParams
): Promise<RawIntegrationResponse<T>> {
  const { integrationUrlApi } = getIntegrationEnvConfig()
  const finalQuery = withEnvIdIntegradora(query)
  const url = buildIntegrationUrl(integrationUrlApi, path, finalQuery)

  const headers: Record<string, string> = { Accept: 'application/json' }
  const requestInfo: RawRequestInfo = { url, method: 'GET', headers, query: finalQuery }
  let response: Response
  try {
    response = await fetchWithRetry(url, { method: 'GET', headers }, { maxAttempts: 3 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Integration network request failed'
    throw new RawHttpError('Integration request failed', 500, url, { message }, requestInfo)
  }

  const data = await readResponseData<T>(response)

  if (!response.ok) {
    throw new RawHttpError('Integration request failed', response.status, url, data, requestInfo)
  }

  return { request: requestInfo, data }
}

export async function integrationRawPostJsonAuth<T>(
  path: string,
  body: unknown,
  query?: IntegrationQueryParams
): Promise<RawIntegrationResponse<T>> {
  const { integrationUrlApi } = getIntegrationEnvConfig()
  const finalQuery = stripIdIntegradora(query)
  const url = buildIntegrationUrl(integrationUrlApi, path, finalQuery)

  const token = await ensureAuthWebserviceToken({ backgroundRefresh: true })
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: toRawToken(token.hashToken),
  }

  const requestInfo: RawRequestInfo = { url, method: 'POST', headers, query: finalQuery }
  let response: Response
  try {
    response = await fetchWithRetry(
      url,
      { method: 'POST', headers, body: JSON.stringify(body ?? {}) },
      { maxAttempts: 3 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Integration network request failed'
    throw new RawHttpError('Integration request failed', 500, url, { message }, requestInfo)
  }

  const data = await readResponseData<T>(response)

  if (!response.ok) {
    throw new RawHttpError('Integration request failed', response.status, url, data, requestInfo)
  }

  return { request: requestInfo, data }
}

export async function integrationRawGetJsonAuth<T>(
  path: string,
  query?: IntegrationQueryParams
): Promise<RawIntegrationResponse<T>> {
  const { integrationUrlApi } = getIntegrationEnvConfig()
  const finalQuery = withEnvIdIntegradora(query)
  const url = buildIntegrationUrl(integrationUrlApi, path, finalQuery)

  const token = await ensureAuthWebserviceToken({ backgroundRefresh: true })
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: toRawToken(token.hashToken),
  }

  const requestInfo: RawRequestInfo = { url, method: 'GET', headers, query: finalQuery }
  let response: Response
  try {
    response = await fetchWithRetry(url, { method: 'GET', headers }, { maxAttempts: 3 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Integration network request failed'
    throw new RawHttpError('Integration request failed', 500, url, { message }, requestInfo)
  }

  const data = await readResponseData<T>(response)

  if (!response.ok) {
    throw new RawHttpError('Integration request failed', response.status, url, data, requestInfo)
  }

  return { request: requestInfo, data }
}
