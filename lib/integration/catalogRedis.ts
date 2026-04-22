import 'server-only'

import { createClient } from 'redis'

export interface CatalogRedisConfig {
  url: string
  tlsEnabled: boolean
  tlsServername: string
  catalogKeyPrefix: string
}

let cachedConfig: CatalogRedisConfig | null = null
let cachedClientPromise: Promise<ReturnType<typeof createClient>> | null = null

function normalizeString(value: string | undefined): string {
  if (!value) return ''
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

function readFirstEnvOptional(keys: string[]): string {
  for (const key of keys) {
    const value = normalizeString(process.env[key])
    if (value) return value
  }
  return ''
}

function parseBoolEnv(value: string | undefined, defaultValue: boolean): boolean {
  const v = normalizeString(value).toLowerCase()
  if (!v) return defaultValue
  if (v === '1' || v === 'true' || v === 'yes' || v === 'on') return true
  if (v === '0' || v === 'false' || v === 'no' || v === 'off') return false
  return defaultValue
}

function buildRedisUrlFromParts(input: {
  host: string
  port: string
  username: string
  password: string
  tlsEnabled: boolean
}): string {
  const scheme = input.tlsEnabled ? 'rediss' : 'redis'
  const user = encodeURIComponent(input.username || 'default')
  const pass = encodeURIComponent(input.password)
  const host = input.host
  const port = input.port || '6379'
  return `${scheme}://${user}:${pass}@${host}:${port}`
}

export function getCatalogRedisConfig(): CatalogRedisConfig {
  if (cachedConfig) return cachedConfig

  const tlsEnabled = parseBoolEnv(process.env.REDIS_TLS, true)
  const tlsServername = readFirstEnvOptional(['REDIS_TLS_SERVERNAME'])
  const catalogKeyPrefix = readFirstEnvOptional(['CATALOG_KEY_PREFIX']) || 'catalog'

  const redisUrl = readFirstEnvOptional(['REDIS_URL'])
  if (redisUrl) {
    cachedConfig = {
      url: redisUrl,
      tlsEnabled,
      tlsServername,
      catalogKeyPrefix,
    }
    return cachedConfig
  }

  const host = readFirstEnvOptional(['REDIS_HOST'])
  const port = readFirstEnvOptional(['REDIS_PORT'])
  const username = readFirstEnvOptional(['REDIS_USERNAME']) || 'default'
  const password = readFirstEnvOptional(['REDIS_PASSWORD'])

  if (!host || !password) {
    throw new Error('Missing Redis environment variables. Provide REDIS_URL or REDIS_HOST/REDIS_PASSWORD.')
  }

  cachedConfig = {
    url: buildRedisUrlFromParts({ host, port, username, password, tlsEnabled }),
    tlsEnabled,
    tlsServername,
    catalogKeyPrefix,
  }

  return cachedConfig
}

export async function getCatalogRedisClient() {
  if (!cachedClientPromise) {
    cachedClientPromise = (async () => {
      const cfg = getCatalogRedisConfig()
      const client = createClient({
        url: cfg.url,
        socket: {
          connectTimeout: 10_000,
          tls: cfg.tlsEnabled,
          servername: cfg.tlsServername || undefined,
          reconnectStrategy: (retries) => (retries < 2 ? 250 : new Error('Redis reconnect retries exceeded')),
        },
      })
      await client.connect()
      return client
    })()
  }

  return cachedClientPromise
}

export function getCatalogKeyPrefix(): string {
  return getCatalogRedisConfig().catalogKeyPrefix || 'catalog'
}
