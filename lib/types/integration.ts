export interface TokenResponse {
  hashToken: string
  refreshToken: string
  dtExpira: string
  [key: string]: unknown
}

export interface KeyBean {
  urlApi: string
  [key: string]: unknown
}

export interface IntegrationConfig {
  [key: string]: unknown
}

export interface AuthStateBundle {
  token: TokenResponse
  keyBean: KeyBean
  integrationConfig: IntegrationConfig
}
