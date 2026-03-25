export interface User {
  id: string
  email: string
  name?: string
}

export interface RegisterUserInput {
  responsavel: string
  cnpj: string
  email: string
  whatsapp: string
}

export interface SendLoginTokenInput {
  email?: string
  whatsapp?: string
}

export interface VerifyLoginTokenInput {
  token: string
}

export interface VerifyTokenPayload {
  idUsuario: number
  hashToken: string
  canal: string
  cnpjCliente?: string
  dtCriacao?: string
  dtExpira?: string
  usado?: boolean
  tentativas?: number
  maxTentativas?: number
}

export interface OperadorPayload {
  id: number
  nome?: string
  email?: string
  telefone?: string
  [key: string]: unknown
}

export interface AuthResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface TwoFactorVerification {
  sessionToken: string
  code: string
}

export interface Session {
  userId: string
  email: string
  token: string
  name?: string
}
