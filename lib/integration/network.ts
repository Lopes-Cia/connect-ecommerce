import 'server-only'

import { logWarn } from './logger'

interface RetryOptions {
  maxAttempts?: number
  baseDelayMs?: number
}

const DEFAULT_MAX_ATTEMPTS = 3
const DEFAULT_BASE_DELAY_MS = 250

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const details: string[] = [error.message]

    const cause = (error as Error & { cause?: unknown }).cause
    if (cause && typeof cause === 'object') {
      const causeObj = cause as {
        message?: unknown
        code?: unknown
        errno?: unknown
        address?: unknown
        port?: unknown
      }

      if (typeof causeObj.message === 'string' && causeObj.message.trim()) {
        details.push(`cause: ${causeObj.message.trim()}`)
      }

      const networkBits: string[] = []
      if (typeof causeObj.code === 'string') {
        networkBits.push(`code=${causeObj.code}`)
      }

      if (typeof causeObj.errno === 'number' || typeof causeObj.errno === 'string') {
        networkBits.push(`errno=${String(causeObj.errno)}`)
      }

      if (typeof causeObj.address === 'string') {
        networkBits.push(`address=${causeObj.address}`)
      }

      if (typeof causeObj.port === 'number' || typeof causeObj.port === 'string') {
        networkBits.push(`port=${String(causeObj.port)}`)
      }

      if (networkBits.length > 0) {
        details.push(networkBits.join(', '))
      }
    }

    return details.join(' | ')
  }

  return String(error)
}

export class HttpError extends Error {
  status: number
  url: string
  data: unknown

  constructor(message: string, status: number, url: string, data: unknown) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.url = url
    this.data = data
  }
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options?: RetryOptions
): Promise<Response> {
  const maxAttempts = options?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS
  const baseDelayMs = options?.baseDelayMs ?? DEFAULT_BASE_DELAY_MS

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fetch(url, {
        ...init,
        cache: init.cache ?? 'no-store',
      })
    } catch (error) {
      const isLastAttempt = attempt >= maxAttempts
      const reason = getErrorMessage(error)

      if (isLastAttempt) {
        throw new Error(`Network request failed for ${url} after ${attempt} attempts: ${reason}`)
      }

      const delayMs = baseDelayMs * 2 ** (attempt - 1)
      logWarn('network_retry_scheduled', {
        url,
        attempt,
        nextDelayMs: delayMs,
        reason,
      })

      await sleep(delayMs)
    }
  }

  throw new Error('Retry mechanism exhausted unexpectedly')
}

export async function readResponseData<T>(response: Response): Promise<T | null> {
  const rawText = await response.text()

  if (!rawText) {
    return null
  }

  try {
    return JSON.parse(rawText) as T
  } catch {
    return rawText as T
  }
}
