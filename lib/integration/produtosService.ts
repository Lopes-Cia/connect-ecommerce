import 'server-only'

import { getIntegrationEnvConfig } from './config'
import { fetchWithRetry, HttpError, readResponseData } from './network'

import type { Brand, BrandByIdPayload, Categoria, CategoriaNode, Produto } from '@/lib/types/produtos'

type SuccessResponse<T> = {
  success: true
  data: T
}

type ErrorResponse = {
  success: false
  message?: string
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
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
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
  const response = await fetchWithRetry(
    url,
    { method: 'GET', headers: { Accept: 'application/json' } },
    { maxAttempts: 3 }
  )
  const data = await readResponseData<T>(response)

  if (!response.ok) {
    throw new HttpError('Integration request failed', response.status, url, data)
  }

  return (data ?? ({} as T)) as T
}

export async function getCategoriasTree(): Promise<SuccessResponse<CategoriaNode[]>> {
  const payload = await integrationGet<unknown>('/Servidor/webservice/integration/produtos/categorias')
  const data = unwrapData<CategoriaNode[]>(payload)
  return { success: true, data }
}

export async function getCategoriaByIdWithChildren(
  idCategoria: number
): Promise<SuccessResponse<{ category: Categoria; children: Categoria[] }>> {
  const payload = await integrationGet<unknown>(
    `/Servidor/webservice/integration/produtos/categorias/${idCategoria}`
  )
  const data = unwrapData<{ category: Categoria; children: Categoria[] }>(payload)
  return { success: true, data }
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
    `/Servidor/webservice/integration/produtos/categorias/by-slug/${safeSlug}`
  )
  const data = unwrapData<{ category: CategoriaNode }>(payload)
  return { success: true, data }
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
    `/Servidor/webservice/integration/produtos/by-categoria/${idCategoria}`,
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
  const payload = await integrationGet<unknown>(`/Servidor/webservice/integration/produtos/by-id/${idProduto}`)
  const data = unwrapData<Produto>(payload)
  return { success: true, data }
}

export async function getProdutoBySlug(slug: string): Promise<SuccessResponse<Produto>> {
  const safeSlug = encodeURIComponent(slug)
  const payload = await integrationGet<unknown>(`/Servidor/webservice/integration/produtos/by-slug/${safeSlug}`)
  const data = unwrapData<Produto>(payload)
  return { success: true, data }
}

export async function getBrands(): Promise<SuccessResponse<Brand[]>> {
  const payload = await integrationGet<unknown>('/Servidor/webservice/integration/produtos/brands')
  const data = unwrapData<Brand[]>(payload)
  return { success: true, data }
}

export async function getBrandById(
  idBrand: number,
  options?: { page?: number; pageSize?: number }
): Promise<SuccessResponse<BrandByIdPayload>> {
  const payload = await integrationGet<unknown>(`/Servidor/webservice/integration/produtos/brands/${idBrand}`, {
    page: options?.page ?? 1,
    pageSize: options?.pageSize ?? 24,
  })
  const data = unwrapData<BrandByIdPayload>(payload)
  return { success: true, data }
}

export type ProdutosUpstreamError = ErrorResponse
