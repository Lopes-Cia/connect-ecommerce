function resolveApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim()

  if (!configured) {
    return '/api'
  }

  if (typeof window !== 'undefined') {
    try {
      const parsed = new URL(configured, window.location.origin)
      const configuredHost = parsed.hostname
      const currentHost = window.location.hostname

      const isConfiguredLocal = configuredHost === 'localhost' || configuredHost === '127.0.0.1'
      const isCurrentLocal = currentHost === 'localhost' || currentHost === '127.0.0.1'

      if (isConfiguredLocal && !isCurrentLocal) {
        return '/api'
      }
    } catch {
      return '/api'
    }
  }

  return configured
}

const API_BASE_URL = resolveApiBaseUrl()

function buildApiUrl(endpoint: string): string {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const normalizedBase = API_BASE_URL.replace(/\/+$/, '')

  return `${normalizedBase}${normalizedEndpoint}`
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiClient<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = buildApiUrl(endpoint)
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(
        errorData.message || 'An error occurred',
        response.status,
        errorData
      )
    }

    return response.json()
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError('Network error', 0, error)
  }
}
