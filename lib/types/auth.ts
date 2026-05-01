export interface RegisterUserInput {
  responsavel: string
  fantasia?: string
  cnpj: string
  inscicao?: string
  email: string
  whatsapp: string
  cep?: string
  rua?: string
  numero?: string | null
  complemento?: string | null
  bairro?: string
  municipio?: string
  uf?: string
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
