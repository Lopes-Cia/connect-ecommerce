export type LopesProdutoRaw = {
  codProd?: unknown
  descricaoEcomerce?: unknown
  descricaoErp?: unknown
  ean?: unknown
  codVol?: unknown
  preco?: unknown
  qtEstoque?: unknown
  imagem?: unknown
  categoriaPrinciapal?: unknown
  categorias?: unknown
}

export type LopesCategoriaRaw = {
  codigo?: unknown
  codPai?: unknown
  categoria?: unknown
  imagem?: unknown
  sequencia?: unknown
}

export type UnknownRecord = Record<string, unknown>

export function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as UnknownRecord
}

export function readListFrom(input: unknown): unknown[] {
  if (Array.isArray(input)) return input
  const record = asRecord(input)
  const data = record?.data
  if (Array.isArray(data)) return data
  return []
}

export function safeString(value: unknown): string {
  return String(value ?? '').trim()
}

export function normalizeText(value: unknown): string {
  return safeString(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function slugify(value: unknown): string {
  const s = normalizeText(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
  return s || 'item'
}

export function toIntOrZero(value: unknown): number {
  const n = Number.parseInt(String(value ?? '').trim(), 10)
  return Number.isFinite(n) ? n : 0
}

export function toNumberOrNull(value: unknown): number | null {
  const n = Number(String(value ?? '').trim())
  return Number.isFinite(n) ? n : null
}

