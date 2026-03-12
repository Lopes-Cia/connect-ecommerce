export interface User {
  id: string
  email: string
  name?: string
}

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
  user?: User
  message?: string
}

export interface Session {
  userId: string
  email: string
  token: string
}
