import 'server-only'

import { getIntegrationEnvConfig } from './config'
import { fetchWithRetry, HttpError, readResponseData } from './network'

import type { HomeCollections } from '@/lib/types/ecommerce'

type SuccessResponse<T> = {
  success: true
  data: T
}

function unwrapData<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const obj = payload as Record<string, unknown>
    if ('data' in obj) {
      return obj.data as T
    }
  }
  return payload as T
}

function buildIntegrationUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, string | number | boolean | null | undefined>
): string {
  const normalizedBase = baseUrl.replace(/\/+$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = new URL(`${normalizedBase}${normalizedPath}`)

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== null && value !== undefined) {
        url.searchParams.set(key, String(value))
      }
    }
  }

  return url.toString()
}

async function integrationGet<T>(
  path: string,
  query?: Record<string, string | number | boolean | null | undefined>
): Promise<T> {
  const { integrationUrlApi } = getIntegrationEnvConfig()
  const url = buildIntegrationUrl(integrationUrlApi, path, query)
  const response = await fetchWithRetry(
    url,
    { method: 'GET', headers: { Accept: 'application/json' } },
    { maxAttempts: 3 }
  )
  const data = await readResponseData<T>(response)

  if (!response.ok) {
    throw new HttpError('Integration request failed', response.status, url, data)
  }

  return (data ?? ({} as T)) as T
}

export async function getHome(): Promise<SuccessResponse<HomeCollections>> {
  const payload = await integrationGet<unknown>('/Servidor/webservice/integration/home')
  const data = unwrapData<HomeCollections>(payload)
  return { success: true, data }
}

