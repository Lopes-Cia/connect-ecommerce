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
