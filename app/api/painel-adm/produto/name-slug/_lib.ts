import { getCatalogKeyPrefix, getCatalogRedisClient } from '@/lib/integration/catalogRedis'
import { getBackProdutoLoja } from '@/lib/integration/lopesBackClient'
import type { Brand, Categoria } from '@/lib/types/produtos'
import { slugify } from '@/lib/utils'
import { buildBrandsById, translateLopesProdutoToProduto } from '@/liz_refator/contracts/lopes/translate'

export function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

export function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

async function readJsonArray<T>(relativeParts: string[]): Promise<T[]> {
  const fs = await import('node:fs/promises')
  const path = await import('node:path')

  const filePath = path.join(process.cwd(), ...relativeParts)
  const raw = await fs.readFile(filePath, 'utf8')
  const parsed = JSON.parse(raw) as unknown
  return Array.isArray(parsed) ? (parsed as T[]) : []
}

function buildCategoriasById(categorias: Categoria[]): Map<number, Categoria> {
  const byId = new Map<number, Categoria>()
  for (const c of categorias) {
    byId.set(Number(c.id), c)
  }
  return byId
}

export function normalizeProductSlug(input: { idProduto: number; name: string; slug: string }): string {
  const provided = input.slug.trim()
  if (provided) {
    const withoutLeading = provided.replace(/^\/+/, '')
    if (withoutLeading.startsWith('produtos/')) return `/${withoutLeading}`
    return `/produtos/${withoutLeading}`
  }

  const baseSlug = slugify(input.name)
  return `/produtos/${baseSlug || `produto-${input.idProduto}`}-${input.idProduto}`
}

export async function readRawNameSlug(idProduto: number) {
  const categorias = await readJsonArray<Categoria>(['lib', 'mockups', 'data', 'categorias.json'])
  const brands = await readJsonArray<Brand>(['lib', 'mockups', 'data', 'brands.json'])

  const raw = await getBackProdutoLoja({ codProd: idProduto })
  const produto = translateLopesProdutoToProduto(raw, {
    categoriasById: buildCategoriasById(categorias),
    brandsById: buildBrandsById(brands),
  })

  if (!produto) return null
  return {
    name: produto.name,
    slug: produto.slug,
  }
}

export async function readRedisDocument(idProduto: number) {
  const client = await getCatalogRedisClient()
  const prefix = getCatalogKeyPrefix()
  const key = `${prefix}:product:${idProduto}`
  const raw = await client.sendCommand(['JSON.GET', key])
  if (typeof raw !== 'string' || !raw) {
    return { key, doc: null as Record<string, unknown> | null }
  }

  return {
    key,
    doc: JSON.parse(raw) as Record<string, unknown>,
  }
}

export async function readRedisNameSlug(idProduto: number) {
  const { doc } = await readRedisDocument(idProduto)
  if (!doc) return null
  return {
    name: asString(doc.name),
    slug: asString(doc.slug),
  }
}

export async function writeRedisNameSlug(input: { idProduto: number; name: string; slug: string }) {
  const client = await getCatalogRedisClient()
  const { key, doc } = await readRedisDocument(input.idProduto)
  if (!doc) {
    return { key, redis: null as { name: string; slug: string } | null }
  }

  doc.name = input.name
  doc.slug = normalizeProductSlug(input)

  await client.sendCommand(['JSON.SET', key, '$', JSON.stringify(doc)])

  return {
    key,
    redis: {
      name: asString(doc.name),
      slug: asString(doc.slug),
    },
  }
}
