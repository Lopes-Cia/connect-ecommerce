import 'server-only'

import type { TokenResponse } from '@/lib/types/integration'

import { getIntegrationEnvConfig } from './config'
import { fetchWithRetry, HttpError, readResponseData } from './network'

const TOKEN_REFRESH_SAFETY_WINDOW_MS = 10 * 60 * 1000

let cachedToken: TokenResponse | null = null
let refreshPromise: Promise<TokenResponse> | null = null

function parseExpiration(dtExpira: string): number {
  const direct = Date.parse(dtExpira)
  if (!Number.isNaN(direct)) {
    return direct
  }

  const normalized = dtExpira.includes(' ') ? dtExpira.replace(' ', 'T') : dtExpira
  const normalizedParse = Date.parse(normalized)
  if (!Number.isNaN(normalizedParse)) {
    return normalizedParse
  }

  return 0
}

function isTokenExpired(token: TokenResponse): boolean {
  const expiresAt = parseExpiration(token.dtExpira)
  return expiresAt <= Date.now()
}

function isTokenExpiringSoon(token: TokenResponse): boolean {
  const expiresAt = parseExpiration(token.dtExpira)
  return expiresAt <= Date.now() + TOKEN_REFRESH_SAFETY_WINDOW_MS
}

function ensureTokenResponse(value: unknown, fallbackMessage: string): TokenResponse {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(fallbackMessage)
  }

  const obj = value as Record<string, unknown>

  if (typeof obj.hashToken !== 'string' || typeof obj.dtExpira !== 'string') {
    throw new Error(fallbackMessage)
  }

  return {
    ...obj,
    hashToken: obj.hashToken,
    dtExpira: obj.dtExpira,
    refreshToken: typeof obj.refreshToken === 'string' ? obj.refreshToken : '',
  }
}

async function requestTokenByProduct(): Promise<TokenResponse> {
  const env = getIntegrationEnvConfig()
  const url = `${env.authBaseUrl}/tokenService`

  const response = await fetchWithRetry(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        produto: env.produto,
        ean: env.ean,
        idIntegradora: env.idIntegradora,
        codCli: env.codCli,
      }),
    },
    { maxAttempts: 3 }
  )

  const data = await readResponseData<unknown>(response)

  if (response.status !== 200) {
    throw new HttpError('Failed to generate token', response.status, url, data)
  }

  return ensureTokenResponse(data, 'Invalid response while generating token')
}

async function refreshToken(currentToken: TokenResponse): Promise<TokenResponse> {
  const env = getIntegrationEnvConfig()
  const url = `${env.authBaseUrl}/tokenService`

  const response = await fetchWithRetry(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken: currentToken.refreshToken,
      }),
    },
    { maxAttempts: 3 }
  )

  const data = await readResponseData<unknown>(response)

  if (response.status !== 200) {
    throw new HttpError('Refresh token request failed', response.status, url, data)
  }

  const refreshed = ensureTokenResponse(data, 'Invalid refresh token response')

  return {
    ...currentToken,
    ...refreshed,
    refreshToken: refreshed.refreshToken || currentToken.refreshToken,
  }
}

async function runRefreshWithLock(): Promise<TokenResponse> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      if (cachedToken?.refreshToken) {
        const refreshed = await refreshToken(cachedToken)
        cachedToken = refreshed
        return refreshed
      }

      const token = await requestTokenByProduct()
      cachedToken = token
      return token
    })().finally(() => {
      refreshPromise = null
    })
  }

  return refreshPromise
}

export async function ensureAuthWebserviceToken(options?: { forceRefresh?: boolean; backgroundRefresh?: boolean }) {
  if (!cachedToken) {
    cachedToken = await requestTokenByProduct()
    return cachedToken
  }

  if (options?.forceRefresh || isTokenExpired(cachedToken)) {
    return runRefreshWithLock()
  }

  if (isTokenExpiringSoon(cachedToken)) {
    const runInBackground = options?.backgroundRefresh ?? true
    if (runInBackground) {
      void runRefreshWithLock()
    } else {
      await runRefreshWithLock()
    }
  }

  return cachedToken
}

