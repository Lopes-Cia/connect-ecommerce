import { apiClient } from './client'

import type {
  ApiSuccess,
  Brand,
  BrandByIdPayload,
  Categoria,
  CategoriaNode,
  Produto,
} from '@/lib/types/produtos'

export type CategoriaByIdResponse = ApiSuccess<{ category: Categoria; children: Categoria[] }>
export type CategoriaBySlugResponse = ApiSuccess<{ category: CategoriaNode }>

export type ProdutosByCategoriaResponse = ApiSuccess<Produto[]> & {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type BrandByIdResponse = ApiSuccess<BrandByIdPayload>

export async function getCategoriasTree(): Promise<CategoriaNode[]> {
  const response = await apiClient<ApiSuccess<CategoriaNode[]>>('/produtos/categorias')
  return response.data
}

export async function getCategoriaById(idCategoria: number): Promise<CategoriaByIdResponse['data']> {
  const response = await apiClient<CategoriaByIdResponse>(`/produtos/categorias/${idCategoria}`)
  return response.data
}

export async function getCategoriaBySlug(slug: string): Promise<CategoriaBySlugResponse['data']> {
  const raw = String(slug ?? '').trim()
  const withoutLeading = raw.replace(/^\/+/, '')
  const safeSlug = withoutLeading
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  const response = await apiClient<CategoriaBySlugResponse>(`/produtos/categorias/by-slug/${safeSlug}`)
  return response.data
}

export async function getProdutosByCategoria(
  idCategoria: number,
  params?: { includeDescendants?: 0 | 1; page?: number; pageSize?: number }
): Promise<ProdutosByCategoriaResponse> {
  const queryParams = new URLSearchParams()

  if (params?.includeDescendants !== undefined) {
    queryParams.set('includeDescendants', String(params.includeDescendants))
  }
  if (params?.page !== undefined) {
    queryParams.set('page', String(params.page))
  }
  if (params?.pageSize !== undefined) {
    queryParams.set('pageSize', String(params.pageSize))
  }

  const query = queryParams.toString()
  const endpoint = query ? `/produtos/by-categoria/${idCategoria}?${query}` : `/produtos/by-categoria/${idCategoria}`

  return apiClient<ProdutosByCategoriaResponse>(endpoint)
}

export async function getProdutoById(idProduto: number): Promise<Produto> {
  const response = await apiClient<ApiSuccess<Produto>>(`/produtos/by-id/${idProduto}`)
  return response.data
}

export async function getProdutoBySlug(slug: string): Promise<Produto> {
  const raw = String(slug ?? '').trim()
  const withoutLeading = raw.startsWith('/') ? raw.slice(1) : raw
  const baseSlug = withoutLeading.startsWith('produtos/')
    ? withoutLeading.slice('produtos/'.length)
    : withoutLeading

  const safeSlug = encodeURIComponent(baseSlug)
  const response = await apiClient<ApiSuccess<Produto>>(`/produtos/by-slug/${safeSlug}`)
  return response.data
}

export async function getBrands(): Promise<Brand[]> {
  const response = await apiClient<ApiSuccess<Brand[]>>('/produtos/brands')
  return response.data
}

export async function getBrandById(
  idBrand: number,
  params?: { page?: number; pageSize?: number }
): Promise<BrandByIdResponse['data']> {
  const queryParams = new URLSearchParams()

  if (params?.page !== undefined) {
    queryParams.set('page', String(params.page))
  }
  if (params?.pageSize !== undefined) {
    queryParams.set('pageSize', String(params.pageSize))
  }

  const query = queryParams.toString()
  const endpoint = query ? `/produtos/brands/${idBrand}?${query}` : `/produtos/brands/${idBrand}`

  const response = await apiClient<BrandByIdResponse>(endpoint)
  return response.data
}
