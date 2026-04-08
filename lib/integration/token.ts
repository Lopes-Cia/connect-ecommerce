import 'server-only'

/**
 * Strips the optional "Bearer " prefix from an authorization token,
 * returning only the raw token value.
 */
export function toRawToken(hashToken: string): string {
  return hashToken.toLowerCase().startsWith('bearer ')
    ? hashToken.slice(7).trim()
    : hashToken
}
