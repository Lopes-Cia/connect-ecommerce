import 'server-only'

import { getIntegrationEnvConfig } from '@/lib/integration/config'

export function getAuthWebserviceBaseUrl(): string {
  return getIntegrationEnvConfig().authBaseUrl
}

export function getActivationKey(): string {
  return getIntegrationEnvConfig().key
}
