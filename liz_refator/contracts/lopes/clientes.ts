import { asRecord, safeString, toIntOrZero, toNumberOrNullIfPresent } from './raw'

export function parseProximoCustomerIdIntegrado(input: unknown): number {
  const record = asRecord(input)
  const value = record && 'data' in record ? (record as { data?: unknown }).data : input
  const id = toIntOrZero(value)
  if (id <= 0) {
    throw new Error('Invalid response from getProximoCustomerIdIntegrado')
  }
  return id
}

export type ClienteLojaEndereco = {
  customerId: number
  codigoIbge: number
  rua: string
  bairro: string
  cep: string
  municipio: string
  uf: string
  principal: string
}

export type ClienteLoja = {
  codCli: number
  limCred: number | null
  cliente: string
  fantasia: string
  cgc: string
  inscicao: string
  email: string
  telefone: string
  status: string
  idIntegradora: number
  idTabPreco: number
  customerId: number
  enderecos: ClienteLojaEndereco[]
}

function parseClienteLojaEndereco(input: unknown): ClienteLojaEndereco {
  const record = asRecord(input)
  if (!record) throw new Error('Invalid endereco in getClienteLoja')

  return {
    customerId: toIntOrZero(record.customerId),
    codigoIbge: toIntOrZero(record.codigoIbge),
    rua: safeString(record.rua),
    bairro: safeString(record.bairro),
    cep: safeString(record.cep),
    municipio: safeString(record.municipio),
    uf: safeString(record.uf),
    principal: safeString(record.principal),
  }
}

export function parseClienteLojaData(input: unknown): ClienteLoja {
  const record = asRecord(input)
  if (!record) throw new Error('Invalid data from getClienteLoja')

  const enderecosRaw = Array.isArray(record.enderecos) ? record.enderecos : []

  return {
    codCli: toIntOrZero(record.codCli),
    limCred: toNumberOrNullIfPresent(record.limCred),
    cliente: safeString(record.cliente),
    fantasia: safeString(record.fantasia),
    cgc: safeString(record.cgc),
    inscicao: safeString(record.inscicao),
    email: safeString(record.email),
    telefone: safeString(record.telefone),
    status: safeString(record.status),
    idIntegradora: toIntOrZero(record.idIntegradora),
    idTabPreco: toIntOrZero(record.idTabPreco),
    customerId: toIntOrZero(record.customerId),
    enderecos: enderecosRaw.map(parseClienteLojaEndereco),
  }
}

export type GetClienteLojaResponseSuccess = {
  success: true
  request: unknown
  data: ClienteLoja
}

export type GetClienteLojaResponseError = {
  success: false
  message: string
  request?: unknown
  data?: unknown
}

export type GetClienteLojaResponse = GetClienteLojaResponseSuccess | GetClienteLojaResponseError

export function parseGetClienteLojaResponse(input: unknown): GetClienteLojaResponse {
  const record = asRecord(input)
  if (!record) throw new Error('Invalid response from getClienteLoja')

  const success = Boolean((record as { success?: unknown }).success)

  if (success) {
    const dataRaw = (record as { data?: unknown }).data
    return {
      success: true,
      request: (record as { request?: unknown }).request,
      data: parseClienteLojaData(dataRaw),
    }
  }

  const message = safeString((record as { message?: unknown }).message)
  if (!message) throw new Error('Invalid error response from getClienteLoja')

  return {
    success: false,
    message,
    request: (record as { request?: unknown }).request,
    data: (record as { data?: unknown }).data,
  }
}

export function parseLimCredFromGetIntegradora(input: unknown): number {
  const record = asRecord(input)
  const data = record && 'data' in record ? (record as { data?: unknown }).data : input
  const dataRecord = asRecord(data)
  if (!dataRecord) throw new Error('Invalid response from getIntegradora')

  const filialWinthor = asRecord(dataRecord.filialWinthor)
  const value = filialWinthor?.limiteCredito ?? dataRecord.limiteCredito ?? dataRecord.limCred
  const parsed = toNumberOrNullIfPresent(value)
  if (parsed === null) throw new Error('Invalid limCred from getIntegradora')
  return parsed
}
