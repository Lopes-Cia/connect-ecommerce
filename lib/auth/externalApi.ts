import 'server-only'

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

function getConfiguredAuthBaseUrl(): string {
  const value = normalizeString(process.env.AUTH_BASE_URL)
  if (!value) {
    throw new Error('Missing required environment variable AUTH_BASE_URL')
  }

  return normalizeBaseUrl(value)
}

export function getAuthWebserviceBaseUrl(): string {
  return getConfiguredAuthBaseUrl()
}

export function getActivationKey(): string {
  const value = normalizeString(process.env.KEY)
  if (!value) {
    throw new Error('Missing required environment variable KEY')
  }

  return value
}
