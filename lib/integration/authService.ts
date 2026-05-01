import 'server-only'

import type { AuthStateBundle, IntegrationConfig, KeyBean, TokenResponse } from '@/lib/types/integration'

import { getIntegrationEnvConfig } from './config'
import { logError, logInfo, logWarn } from './logger'
import { fetchWithRetry, getErrorMessage, HttpError, readResponseData } from './network'
import { toRawToken } from './token'
import {
  getIntegrationAuthBundle,
  getIntegrationAuthState,
  hasCompleteAuthState,
  setIntegrationAuthBundle,
  setIntegrationAuthState,
} from './state'

interface EnsureAuthOptions {
  forceRefresh?: boolean
  backgroundRefresh?: boolean
}

const TOKEN_REFRESH_SAFETY_WINDOW_MS = 10 * 60 * 1000

let bootPromise: Promise<AuthStateBundle> | null = null
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



function ensureObject<T extends object>(value: unknown, fallbackMessage: string): T {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(fallbackMessage)
  }

  return value as T
}

function ensureTokenResponse(value: unknown, fallbackMessage: string): TokenResponse {
  const obj = ensureObject<Record<string, unknown>>(value, fallbackMessage)

  if (typeof obj.hashToken !== 'string' || typeof obj.dtExpira !== 'string') {
    throw new Error(fallbackMessage)
  }

  const refreshTokenValue = obj.refreshToken
  const refreshToken =
    typeof refreshTokenValue === 'string'
      ? refreshTokenValue
      : typeof refreshTokenValue === 'number'
        ? String(refreshTokenValue)
        : ''

  return {
    ...obj,
    hashToken: obj.hashToken,
    dtExpira: obj.dtExpira,
    refreshToken,
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
  const url = `${env.authBaseUrl}/refreshToken`
  const refreshValue = currentToken.refreshToken
  const refreshTokenParam =
    typeof refreshValue === 'string' &&
    /^\d+$/.test(refreshValue) &&
    refreshValue.length <= 15 &&
    Number.isSafeInteger(Number(refreshValue))
      ? Number(refreshValue)
      : refreshValue

  const response = await fetchWithRetry(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: currentToken.hashToken,
      },
      body: JSON.stringify({
        token: currentToken.hashToken,
        refreshToken: refreshTokenParam,
        idIntegradora: env.idIntegradora,
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

async function requestIntegrationConfig(token: TokenResponse, keyBean: KeyBean): Promise<IntegrationConfig> {
  const env = getIntegrationEnvConfig()
  const normalizedUrlApi = keyBean.urlApi.replace(/\/+$/, '')
  let path = '/Servidor/webservice/integration/getIntegradora'
  if (/\/Servidor$/i.test(normalizedUrlApi) && /^\/Servidor\//i.test(path)) {
    path = path.slice('/Servidor'.length)
  }
  const url = new URL(`${normalizedUrlApi}${path}`)
  url.searchParams.set('id', String(env.idIntegradora))

  const response = await fetchWithRetry(
    url.toString(),
    {
      method: 'GET',
      headers: {
        Authorization: toRawToken(token.hashToken),
      },
    },
    { maxAttempts: 3 }
  )

  const data = await readResponseData<unknown>(response)

  if (response.status !== 200) {
    throw new HttpError('Failed to fetch integration config', response.status, url.toString(), data)
  }

  return ensureObject<IntegrationConfig>(data, 'Invalid integration config response')
}

async function runBootSequence(): Promise<AuthStateBundle> {
  logInfo('integration_boot_started')
  const env = getIntegrationEnvConfig()

  const token = await requestTokenByProduct()
  logInfo('integration_boot_token_ready', {
    expiresAt: token.dtExpira,
    hasRefreshToken: Boolean(token.refreshToken),
  })

  const keyBean: KeyBean = {
    urlApi: env.integrationUrlApi,
  }

  logInfo('integration_boot_keybean_ready', {
    urlApi: keyBean.urlApi,
    source: 'env',
  })

  const integrationConfig = await requestIntegrationConfig(token, keyBean)
  const bundle: AuthStateBundle = {
    token,
    keyBean,
    integrationConfig,
  }

  setIntegrationAuthBundle(bundle)
  logInfo('integration_boot_completed')

  return bundle
}

function runBootSequenceOnce(): Promise<AuthStateBundle> {
  if (bootPromise) {
    return bootPromise
  }

  bootPromise = runBootSequence().finally(() => {
    bootPromise = null
  })

  return bootPromise
}

async function runRefreshWithFallback(): Promise<TokenResponse> {
  const boot = await runBootSequenceOnce()
  return boot.token
}

function runRefreshWithLock(waitForResult: boolean): Promise<TokenResponse> | void {
  if (!refreshPromise) {
    refreshPromise = runRefreshWithFallback()
      .catch((error) => {
        logError('token_refresh_unhandled_error', {
          reason: getErrorMessage(error),
        })
        throw error
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  if (waitForResult) {
    return refreshPromise
  }

  void refreshPromise.catch((error) => {
    logError('token_refresh_background_failed', {
      reason: getErrorMessage(error),
    })
  })
}

function getOrThrowBundle(): AuthStateBundle {
  const bundle = getIntegrationAuthBundle()

  if (!bundle) {
    throw new Error('Auth state bundle is not available')
  }

  return bundle
}

export async function ensureAuthReady(options: EnsureAuthOptions = {}): Promise<AuthStateBundle> {
  const state = getIntegrationAuthState()

  if (!hasCompleteAuthState(state)) {
    return runBootSequenceOnce()
  }

  const token = state.token as TokenResponse

  if (options.forceRefresh || isTokenExpired(token)) {
    await runRefreshWithLock(true)
    return getOrThrowBundle()
  }

  if (isTokenExpiringSoon(token)) {
    const runInBackground = options.backgroundRefresh ?? true

    if (runInBackground) {
      runRefreshWithLock(false)
    } else {
      await runRefreshWithLock(true)
    }
  }

  return getOrThrowBundle()
}
