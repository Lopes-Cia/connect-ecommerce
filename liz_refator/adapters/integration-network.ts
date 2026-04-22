import 'server-only'

/**
 * Adapter temporário para a camada legada (`lib/integration/**`).
 * Centraliza os imports para facilitar a substituição gradual.
 */
export { fetchWithRetry, HttpError, readResponseData } from '@/lib/integration/network'

