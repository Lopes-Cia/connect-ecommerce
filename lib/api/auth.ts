import { apiClient } from './client'

export interface LoginCredentials {
  email: string
  password: string
}

export interface TwoFactorVerification {
  sessionToken: string
  code: string
}

export interface AuthResponse {
  success: boolean
  sessionToken?: string
  message?: string
}

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  // TODO: Implement actual login API call
  return apiClient<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}

export async function verifyTwoFactor(verification: TwoFactorVerification): Promise<AuthResponse> {
  // TODO: Implement actual 2FA verification API call
  return apiClient<AuthResponse>('/auth/verify-2fa', {
    method: 'POST',
    body: JSON.stringify(verification),
  })
}

export async function logout(): Promise<void> {
  // TODO: Implement actual logout API call
  return apiClient<void>('/auth/logout', {
    method: 'POST',
  })
}
