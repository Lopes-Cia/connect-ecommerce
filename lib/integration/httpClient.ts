import 'server-only'

import type { AuthStateBundle } from '@/lib/types/integration'

import { ensureAuthReady } from './authService'
import { logWarn } from './logger'
import { fetchWithRetry, HttpError, readResponseData } from './network'
import { toRawToken } from './token'

interface BusinessRequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  path: string
  query?: Record<string, string | number | boolean | null | undefined>
  headers?: HeadersInit
  body?: unknown
}



function buildBusinessUrl(
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

function buildRequestInit(auth: AuthStateBundle, options: BusinessRequestOptions): RequestInit {
  const headers = new Headers(options.headers)
  headers.set('Authorization', toRawToken(auth.token.hashToken))

  const hasBody = options.body !== undefined
  if (hasBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  return {
    ...options,
    headers,
    body: hasBody
      ? typeof options.body === 'string'
        ? options.body
        : JSON.stringify(options.body)
      : undefined,
  }
}

async function executeBusinessRequest<T>(
  auth: AuthStateBundle,
  options: BusinessRequestOptions
): Promise<T> {
  const url = buildBusinessUrl(auth.keyBean.urlApi, options.path, options.query)
  const response = await fetchWithRetry(url, buildRequestInit(auth, options), {
    maxAttempts: 3,
  })
  const data = await readResponseData<T>(response)

  if (!response.ok) {
    throw new HttpError('Business request failed', response.status, url, data)
  }

  return (data ?? ({} as T)) as T
}

function shouldRetryAuth(error: unknown): error is HttpError {
  return error instanceof HttpError && (error.status === 401 || error.status === 403)
}

export async function businessRequest<T>(options: BusinessRequestOptions): Promise<T> {
  const auth = await ensureAuthReady({ backgroundRefresh: true })

  try {
    return await executeBusinessRequest<T>(auth, options)
  } catch (error) {
    if (!shouldRetryAuth(error)) {
      throw error
    }

    logWarn('business_request_received_unauthorized_retrying_after_refresh', {
      path: options.path,
      status: error.status,
    })

    const refreshedAuth = await ensureAuthReady({ forceRefresh: true, backgroundRefresh: false })
    return executeBusinessRequest<T>(refreshedAuth, options)
  }
}

export async function businessGet<T>(
  path: string,
  query?: Record<string, string | number | boolean | null | undefined>
): Promise<T> {
  return businessRequest<T>({
    path,
    query,
    method: 'GET',
  })
}
