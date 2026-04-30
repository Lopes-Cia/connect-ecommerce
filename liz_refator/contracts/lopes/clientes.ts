import { asRecord, toIntOrZero } from './raw'

export function parseProximoCustomerIdIntegrado(input: unknown): number {
  const record = asRecord(input)
  const value = record && 'data' in record ? (record as { data?: unknown }).data : input
  const id = toIntOrZero(value)
  if (id <= 0) {
    throw new Error('Invalid response from getProximoCustomerIdIntegrado')
  }
  return id
}

export function parseInsertClienteLojaResult(input: unknown): boolean {
  if (input === true) return true
  if (input === false) return false
  if (input === 'true') return true
  if (input === 'false') return false

  const record = asRecord(input)
  if (record && 'success' in record) {
    return Boolean((record as { success?: unknown }).success)
  }

  throw new Error('Unexpected response from insertClienteLoja')
}
