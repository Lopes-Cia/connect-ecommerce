import 'server-only'

import { ensureAuthWebserviceToken } from './authWebserviceClient'
import { getIntegrationEnvConfig } from './config'
import { fetchWithRetry, HttpError, readResponseData } from './network'
import { toRawToken } from './token'

import type { Brand, BrandByIdPayload, Categoria, CategoriaNode, Produto } from '@/lib/types/produtos'

type SuccessResponse<T> = {
  success: true
  data: T
}

type ErrorResponse = {
  success: false
  message?: string
}

function isMockFonte(): boolean {
  return String(process.env.NEXT_PUBLIC_FONTE ?? '').toLowerCase() === 'mock'
}

function rewriteMockAssetUrl(value: unknown): unknown {
  if (!isMockFonte()) return value
  if (typeof value !== 'string' || !value) return value
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return value
  }
  if (parsed.hostname !== 'localhost' || parsed.port !== '4000') return value
  const { integrationUrlApi } = getIntegrationEnvConfig()
  let base: URL
  try {
    base = new URL(integrationUrlApi)
  } catch {
    return value
  }
  parsed.protocol = base.protocol
  parsed.hostname = base.hostname
  parsed.port = base.port
  return parsed.toString()
}

function rewriteMockCategoriaNode(node: CategoriaNode): CategoriaNode {
  const children = Array.isArray((node as unknown as { children?: unknown }).children)
    ? (((node as unknown as { children: unknown[] }).children as unknown[]).filter(Boolean) as CategoriaNode[])
    : []
  return {
    ...node,
    image: rewriteMockAssetUrl((node as unknown as { image?: unknown }).image) as string,
    children: children.map(rewriteMockCategoriaNode),
  }
}

function unwrapData<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const obj = payload as Record<string, unknown>
    if ('data' in obj) {
      return obj.data as T
    }
  }
  return payload as T
}

function buildIntegrationUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, string | number | boolean | null | undefined>
): string {
  const normalizedBase = baseUrl.replace(/\/+$/, '')
  let normalizedPath = path.startsWith('/') ? path : `/${path}`

  if (/\/Servidor$/i.test(normalizedBase) && /^\/Servidor\//i.test(normalizedPath)) {
    normalizedPath = normalizedPath.slice('/Servidor'.length)
  }
  const url = new URL(`${normalizedBase}${normalizedPath}`)

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== null && value !== undefined) {
        url.searchParams.set(key, String(value))
      }
    }
  }

  return url.toString()
}

async function integrationGet<T>(
  path: string,
  query?: Record<string, string | number | boolean | null | undefined>
): Promise<T> {
  const { integrationUrlApi } = getIntegrationEnvConfig()
  const url = buildIntegrationUrl(integrationUrlApi, path, query)
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (!isMockFonte()) {
    const token = await ensureAuthWebserviceToken({ backgroundRefresh: true })
    headers.Authorization = toRawToken(token.hashToken)
  }
  const response = await fetchWithRetry(url, { method: 'GET', headers }, { maxAttempts: 3 })
  const data = await readResponseData<T>(response)

  if (!response.ok) {
    throw new HttpError('Integration request failed', response.status, url, data)
  }

  return (data ?? ({} as T)) as T
}

export async function getCategoriasTree(): Promise<SuccessResponse<CategoriaNode[]>> {
  const payload = await integrationGet<unknown>(
    isMockFonte() ? '/produtos/categorias' : '/Servidor/webservice/integration/produtos/categorias'
  )
  const data = unwrapData<CategoriaNode[]>(payload)
  const normalized = isMockFonte() ? data.map(rewriteMockCategoriaNode) : data
  return { success: true, data: normalized }
}

export async function getCategoriaByIdWithChildren(
  idCategoria: number
): Promise<SuccessResponse<{ category: Categoria; children: Categoria[] }>> {
  const payload = await integrationGet<unknown>(
    isMockFonte()
      ? `/produtos/categorias/${idCategoria}`
      : `/Servidor/webservice/integration/produtos/categorias/${idCategoria}`
  )
  const data = unwrapData<{ category: Categoria; children: Categoria[] }>(payload)
  if (!isMockFonte()) return { success: true, data }
  const category = {
    ...data.category,
    image: rewriteMockAssetUrl((data.category as unknown as { image?: unknown }).image) as string,
  }
  const children = data.children.map((c) => ({
    ...c,
    image: rewriteMockAssetUrl((c as unknown as { image?: unknown }).image) as string,
  }))
  return { success: true, data: { category, children } }
}

export async function getCategoriaBySlug(
  slug: string
): Promise<SuccessResponse<{ category: CategoriaNode }>> {
  const safeSlug = String(slug ?? '')
    .trim()
    .replace(/^\/+/, '')
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  const payload = await integrationGet<unknown>(
    isMockFonte()
      ? `/produtos/categorias/by-slug/${safeSlug}`
      : `/Servidor/webservice/integration/produtos/categorias/by-slug/${safeSlug}`
  )
  const data = unwrapData<{ category: CategoriaNode }>(payload)
  const normalized = isMockFonte() ? { category: rewriteMockCategoriaNode(data.category) } : data
  return { success: true, data: normalized }
}

export async function getProdutosByCategoria(
  idCategoria: number,
  options?: { includeDescendants?: 0 | 1; page?: number; pageSize?: number }
): Promise<
  SuccessResponse<Produto[]> & {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
> {
  const payload = await integrationGet<unknown>(
    isMockFonte()
      ? `/produtos/by-categoria/${idCategoria}`
      : `/Servidor/webservice/integration/produtos/by-categoria/${idCategoria}`,
    {
      includeDescendants: options?.includeDescendants ?? 1,
      page: options?.page ?? 1,
      pageSize: options?.pageSize ?? 24,
    }
  )

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      success: true,
      data: (payload ?? []) as Produto[],
      page: options?.page ?? 1,
      pageSize: options?.pageSize ?? 24,
      total: Array.isArray(payload) ? payload.length : 0,
      totalPages: 1,
    }
  }

  const obj = payload as Record<string, unknown>
  const data = (obj.data ?? []) as Produto[]
  return {
    success: true,
    data,
    page: Number(obj.page ?? options?.page ?? 1),
    pageSize: Number(obj.pageSize ?? options?.pageSize ?? 24),
    total: Number(obj.total ?? data.length),
    totalPages: Number(obj.totalPages ?? 1),
  }
}

export async function getProdutoById(idProduto: number): Promise<SuccessResponse<Produto>> {
  const payload = await integrationGet<unknown>(
    isMockFonte() ? `/produtos/by-id/${idProduto}` : `/Servidor/webservice/integration/produtos/by-id/${idProduto}`
  )
  const data = unwrapData<Produto>(payload)
  return { success: true, data }
}

export async function getProdutoBySlug(slug: string): Promise<SuccessResponse<Produto>> {
  const safeSlug = encodeURIComponent(slug)
  const payload = await integrationGet<unknown>(
    isMockFonte()
      ? `/produtos/by-slug/${safeSlug}`
      : `/Servidor/webservice/integration/produtos/by-slug/${safeSlug}`
  )
  const data = unwrapData<Produto>(payload)
  return { success: true, data }
}

export async function getBrands(): Promise<SuccessResponse<Brand[]>> {
  const payload = await integrationGet<unknown>(
    isMockFonte() ? '/produtos/brands' : '/Servidor/webservice/integration/produtos/brands'
  )
  const data = unwrapData<Brand[]>(payload)
  return { success: true, data }
}

export async function getBrandById(
  idBrand: number,
  options?: { page?: number; pageSize?: number }
): Promise<SuccessResponse<BrandByIdPayload>> {
  const payload = await integrationGet<unknown>(
    isMockFonte() ? `/produtos/brands/${idBrand}` : `/Servidor/webservice/integration/produtos/brands/${idBrand}`,
    { page: options?.page ?? 1, pageSize: options?.pageSize ?? 24 }
  )
  const data = unwrapData<BrandByIdPayload>(payload)
  return { success: true, data }
}

export type ProdutosUpstreamError = ErrorResponse
