import 'server-only'

interface IntegrationEnvConfig {
  authBaseUrl: string
  produto: string
  ean: string
  integrationUrlApi: string
  idIntegradora: number
  codCli: number
  key: string
}

let cachedConfig: IntegrationEnvConfig | null = null

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

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '')
}

export function getIntegrationEnvConfig(): IntegrationEnvConfig {
  if (cachedConfig) {
    return cachedConfig
  }

  cachedConfig = {
    authBaseUrl: normalizeBaseUrl(readFirstEnv(['AUTH_BASE_URL'])),
    produto: readFirstEnv(['PRODUTO']),
    ean: readFirstEnv(['EAN']),
    integrationUrlApi: normalizeBaseUrl(readFirstEnv(['INTEGRATION_URL_API'])),
    idIntegradora: parseRequiredNumber(['ID_INTEGRADORA', 'IDINTEGRADORA']),
    codCli: parseRequiredNumber(['COD_CLI', 'CODCLI']),
    key: readFirstEnv(['KEY']),
  }

  return cachedConfig
}
