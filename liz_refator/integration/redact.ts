import type { RawRequestInfo } from './rawClient'

export function redactRawRequestInfo(request: RawRequestInfo): RawRequestInfo {
  const headers: Record<string, string> = { ...request.headers }

  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === 'authorization') {
      headers[key] = '<redacted>'
    }
  }

  return { ...request, headers }
}

