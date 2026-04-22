import 'server-only'

import { ensureAuthWebserviceToken } from '@/liz_refator/adapters/integration-auth'
import { getIntegrationEnvConfig } from '@/liz_refator/adapters/integration-config'
import { fetchWithRetry, HttpError, readResponseData } from '@/liz_refator/adapters/integration-network'
import { toRawToken } from '@/liz_refator/adapters/integration-token'

export type IntegrationQueryParams = Record<string, string | number | boolean | null | undefined>

function buildIntegrationUrl(baseUrl: string, path: string, query?: IntegrationQueryParams): string {
  /**
   * Integração usa `INTEGRATION_URL_API` como base.
   * Em alguns ambientes a base já termina com `/Servidor` e alguns paths também começam com `/Servidor/...`.
   * Aqui normalizamos para evitar `.../Servidor/Servidor/...`.
   */
  const normalizedBase = baseUrl.replace(/\/+$/, '')
  let normalizedPath = path.startsWith('/') ? path : `/${path}`

  if (/\/Servidor$/i.test(normalizedBase) && /^\/Servidor\//i.test(normalizedPath)) {
    normalizedPath = normalizedPath.slice('/Servidor'.length)
  }

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

export async function integrationGetJson<T>(path: string, query?: IntegrationQueryParams): Promise<T> {
  /**
   * GET para integração sem autenticação.
   * Mantém as mesmas invariantes do legado: retry apenas para falha de rede (fetchWithRetry) e parse via readResponseData.
   */
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

export async function integrationGetJsonAuth<T>(path: string, query?: IntegrationQueryParams): Promise<T> {
  /**
   * GET para integração com autenticação (tokenService).
   * O header `Authorization` recebe o token bruto (sem prefixo `Bearer ` se existir).
   */
  const { integrationUrlApi } = getIntegrationEnvConfig()
  const url = buildIntegrationUrl(integrationUrlApi, path, query)

  const token = await ensureAuthWebserviceToken({ backgroundRefresh: true })
  const response = await fetchWithRetry(
    url,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: toRawToken(token.hashToken),
      },
    },
    { maxAttempts: 3 }
  )

  const data = await readResponseData<T>(response)

  if (!response.ok) {
    throw new HttpError('Integration request failed', response.status, url, data)
  }

  return (data ?? ({} as T)) as T
}
