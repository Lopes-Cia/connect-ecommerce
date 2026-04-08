import { apiClient } from './client'
import type {
  AuthResponse,
  OperadorPayload,
  RegisterUserInput,
  SendLoginTokenInput,
  VerifyLoginTokenInput,
  VerifyTokenPayload,
} from '@/lib/types/auth'
import type { Session } from '@/lib/auth/session'

export async function registerUser(
  payload: RegisterUserInput
): Promise<AuthResponse<unknown>> {
  return apiClient<AuthResponse<unknown>>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function sendLoginToken(
  payload: SendLoginTokenInput
): Promise<AuthResponse<boolean>> {
  return apiClient<AuthResponse<boolean>>('/auth/send-token', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function verifyLoginToken(
  payload: VerifyLoginTokenInput
): Promise<AuthResponse<{ verification: VerifyTokenPayload; operador: OperadorPayload }>> {
  return apiClient<AuthResponse<{ verification: VerifyTokenPayload; operador: OperadorPayload }>>(
    '/auth/verify-token',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  )
}

export async function logout(): Promise<AuthResponse<undefined>> {
  return apiClient<AuthResponse<undefined>>('/auth/logout', {
    method: 'POST',
  })
}

export async function getCurrentSession(): Promise<AuthResponse<Session>> {
  return apiClient<AuthResponse<Session>>('/auth/me', {
    method: 'GET',
  })
}
