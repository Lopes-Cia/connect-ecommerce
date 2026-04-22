const API_BASE_URL = '/api'

function buildApiUrl(endpoint: string): string {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`

  return `${API_BASE_URL}${normalizedEndpoint}`
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
  options: RequestInit = {}
): Promise<T> {
  const url = buildApiUrl(endpoint)
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const rawText = await response.text().catch(() => '')
      const errorData = rawText ? JSON.parse(rawText) : {}
      throw new ApiError(
        (errorData as { message?: string })?.message ||
          (rawText ? rawText.slice(0, 800) : 'Ocorreu um erro na requisição'),
        response.status,
        rawText ? { errorData, rawText } : errorData
      )
    }

    if (response.status === 204) {
      return undefined as T
    }

    const rawText = await response.text()
    return (rawText ? JSON.parse(rawText) : undefined) as T
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError('Erro de rede', 0, error)
  }
}


