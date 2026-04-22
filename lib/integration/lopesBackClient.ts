import 'server-only'

import type { TokenResponse } from '@/lib/types/integration'

import { fetchWithRetry, HttpError, readResponseData } from './network'
import { toRawToken } from './token'

type QueryValue = string | number | boolean | null | undefined
type Query = Record<string, QueryValue>

type IntLike = number | string

type GetListCategoriaQuery = {
  codigo?: IntLike
  codPai?: IntLike
  categoria?: string
  idCatMarketplace?: string
  nomeCatMarketplace?: string
}

type GetCategoriaQuery = {
  codigo: IntLike
}

type GetProdutoLojaQuery = {
  codProd?: IntLike
  ean?: string
  productId?: string
  descricaoErp?: string
  skuId?: string
  cnpjCliente?: string
}

type GetListProdutoLojaQuery = GetProdutoLojaQuery & {
  idCategoria?: IntLike
}

export const LOPES_BACK_ROUTES = {
  getListCategoria: '/webservice/integration/getListCategoria',
  getCategoria: '/webservice/integration/getCategoria',
  getProdutoLoja: '/webservice/integration/getProdutoLoja',
  getListProdutoLoja: '/webservice/integration/getListProdutoLoja',
} as const

interface LopesBackEnvConfig {
  authBaseUrl: string
  integrationUrlApi: string
  produto: string
  ean: string
  idIntegradora: number
  codCli: number
}

let cachedEnv: LopesBackEnvConfig | null = null
let cachedToken: TokenResponse | null = null

function normalizeString(value: string | undefined): string {
  if (!value) {
    return ''
  }

  const trimmed = value.trim()

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }

  return trimmed
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '')
}

function readFirstEnv(keys: string[]): string {
  for (const key of keys) {
    const value = normalizeString(process.env[key])
    if (value) {
      return value
    }
  }

  throw new Error(`Missing required environment variable. Tried: ${keys.join(', ')}`)
}

function parseRequiredNumber(keys: string[]): number {
  const value = readFirstEnv(keys)
  const parsed = Number.parseInt(value, 10)

  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable must be a valid integer: ${keys.join(', ')}`)
  }

  return parsed
}

function getLopesBackEnvConfig(): LopesBackEnvConfig {
  if (cachedEnv) {
    return cachedEnv
  }

  const fonte = normalizeString(process.env.NEXT_PUBLIC_FONTE).toLowerCase()
  const integrationUrlKeys =
    fonte === 'mock'
      ? ['INTEGRATION_URL_API_MOCK', 'INTEGRATION_URL_API_BACK', 'INTEGRATION_URL_API']
      : ['INTEGRATION_URL_API_BACK', 'INTEGRATION_URL_API']

  cachedEnv = {
    authBaseUrl: normalizeBaseUrl(readFirstEnv(['AUTH_BASE_URL_BACK', 'AUTH_BASE_URL'])),
    integrationUrlApi: normalizeBaseUrl(readFirstEnv(integrationUrlKeys)),
    produto: readFirstEnv(['PRODUTO']),
    ean: readFirstEnv(['EAN']),
    idIntegradora: parseRequiredNumber(['ID_INTEGRADORA', 'IDINTEGRADORA']),
    codCli: parseRequiredNumber(['COD_CLI', 'CODCLI']),
  }

  return cachedEnv
}

function withEnvIdIntegradora(query?: Query): Query {
  const env = getLopesBackEnvConfig()
  const { idIntegradora: _ignored, ...rest } = (query ?? {}) as Record<string, QueryValue>
  return {
    ...rest,
    idIntegradora: env.idIntegradora,
  }
}

function isTokenStillValid(token: TokenResponse): boolean {
  const expiresAt = Date.parse(token.dtExpira)
  if (Number.isNaN(expiresAt)) {
    return false
  }

  return expiresAt > Date.now() + 60_000
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
  const env = getLopesBackEnvConfig()
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
  const env = getLopesBackEnvConfig()
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

async function ensureToken(): Promise<TokenResponse> {
  if (cachedToken && isTokenStillValid(cachedToken)) {
    return cachedToken
  }

  if (cachedToken?.refreshToken) {
    try {
      cachedToken = await refreshToken(cachedToken)
      return cachedToken
    } catch {
      cachedToken = null
    }
  }

  cachedToken = await requestTokenByProduct()
  return cachedToken
}

function buildUrl(baseUrl: string, path: string, query?: Query): string {
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

export async function lopesBackGet<T>(
  path: string,
  query?: Query
): Promise<T> {
  const env = getLopesBackEnvConfig()
  const token = await ensureToken()
  const url = buildUrl(env.integrationUrlApi, path, query)
  if (process.env.NODE_ENV !== 'production') {
    const fonte = normalizeString(process.env.NEXT_PUBLIC_FONTE).toLowerCase()
    const source = fonte === 'mock' ? 'mock' : 'back'
    console.log('[DATA-SOURCE]', source, 'lopes', 'GET', path)
  }

  const response = await fetchWithRetry(
    url,
    {
      method: 'GET',
      headers: {
        Authorization: toRawToken(token.hashToken),
      },
    },
    { maxAttempts: 3 }
  )

  const data = await readResponseData<T>(response)

  if (!response.ok) {
    throw new HttpError('Lopes back request failed', response.status, url, data)
  }

  return (data ?? ({} as T)) as T
}

export async function getBackListCategoria(
  query?: GetListCategoriaQuery
): Promise<unknown> {
  return lopesBackGet(LOPES_BACK_ROUTES.getListCategoria, withEnvIdIntegradora(query))
}

export async function getBackCategoria(query: GetCategoriaQuery): Promise<unknown> {
  return lopesBackGet(LOPES_BACK_ROUTES.getCategoria, withEnvIdIntegradora(query))
}

export async function getBackProdutoLoja(query?: GetProdutoLojaQuery): Promise<unknown> {
  return lopesBackGet(LOPES_BACK_ROUTES.getProdutoLoja, withEnvIdIntegradora(query))
}

export async function getBackListProdutoLoja(
  query?: GetListProdutoLojaQuery
): Promise<unknown> {
  return lopesBackGet(LOPES_BACK_ROUTES.getListProdutoLoja, withEnvIdIntegradora(query))
}
