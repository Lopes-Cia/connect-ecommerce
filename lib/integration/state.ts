import 'server-only'

import type {
  AuthStateBundle,
  IntegrationConfig,
  KeyBean,
  TokenResponse,
} from '@/lib/types/integration'

export interface IntegrationAuthState {
  token: TokenResponse | null
  keyBean: KeyBean | null
  integrationConfig: IntegrationConfig | null
  bootstrappedAt: string | null
}

declare global {
  var __connectIntegrationAuthState: IntegrationAuthState | undefined
}

const INITIAL_STATE: IntegrationAuthState = {
  token: null,
  keyBean: null,
  integrationConfig: null,
  bootstrappedAt: null,
}

function getStore(): IntegrationAuthState {
  if (!globalThis.__connectIntegrationAuthState) {
    globalThis.__connectIntegrationAuthState = { ...INITIAL_STATE }
  }

  return globalThis.__connectIntegrationAuthState
}

export function getIntegrationAuthState(): IntegrationAuthState {
  return getStore()
}

export function hasCompleteAuthState(state: IntegrationAuthState = getStore()): boolean {
  return Boolean(state.token && state.keyBean && state.integrationConfig)
}

export function setIntegrationAuthState(
  partial: Partial<IntegrationAuthState>
): IntegrationAuthState {
  const store = getStore()
  Object.assign(store, partial)
  return store
}

export function setIntegrationAuthBundle(bundle: AuthStateBundle): IntegrationAuthState {
  return setIntegrationAuthState({
    token: bundle.token,
    keyBean: bundle.keyBean,
    integrationConfig: bundle.integrationConfig,
    bootstrappedAt: new Date().toISOString(),
  })
}

export function clearIntegrationAuthState(): void {
  globalThis.__connectIntegrationAuthState = { ...INITIAL_STATE }
}

export function getIntegrationAuthBundle(): AuthStateBundle | null {
  const state = getStore()

  if (!state.token || !state.keyBean || !state.integrationConfig) {
    return null
  }

  return {
    token: state.token,
    keyBean: state.keyBean,
    integrationConfig: state.integrationConfig,
  }
}
