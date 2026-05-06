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

function readHtmlDataset(key: 'fonte' | 'catalog-fonte'): string {
  if (typeof document === 'undefined') return ''
  return String(document.documentElement.getAttribute(`data-${key}`) ?? '').trim()
}

function produtosBasePath(): '/produtos' | '/lopes/produtos' | '/catalog/produtos' {
  const fonte = String(
    typeof window === 'undefined' ? process.env.NEXT_PUBLIC_FONTE ?? '' : readHtmlDataset('fonte')
  )
    .trim()
    .toLowerCase()
  const catalogFonte = String(
    typeof window === 'undefined'
      ? process.env.NEXT_PUBLIC_CATALOGO_FONTE ?? ''
      : readHtmlDataset('catalog-fonte')
  )
    .trim()
    .toLowerCase()

  if (catalogFonte === 'redis' || fonte === 'redis') return '/catalog/produtos'
  return fonte === 'lopes' ? '/lopes/produtos' : '/produtos'
}

export async function getCategoriasTree(): Promise<CategoriaNode[]> {
  const response = await apiClient<ApiSuccess<CategoriaNode[]>>(`${produtosBasePath()}/categorias`)
  return response.data
}

export async function getCategoriaById(idCategoria: number): Promise<CategoriaByIdResponse['data']> {
  const response = await apiClient<CategoriaByIdResponse>(`${produtosBasePath()}/categorias/${idCategoria}`)
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
  const response = await apiClient<CategoriaBySlugResponse>(`${produtosBasePath()}/categorias/by-slug/${safeSlug}`)
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
  const endpoint = query
    ? `${produtosBasePath()}/by-categoria/${idCategoria}?${query}`
    : `${produtosBasePath()}/by-categoria/${idCategoria}`

  return apiClient<ProdutosByCategoriaResponse>(endpoint)
}

export async function getProdutoById(idProduto: number): Promise<Produto> {
  const response = await apiClient<ApiSuccess<Produto>>(`${produtosBasePath()}/by-id/${idProduto}`)
  return response.data
}

export async function getProdutoBySlug(slug: string): Promise<Produto> {
  const raw = String(slug ?? '').trim()
  const withoutLeading = raw.startsWith('/') ? raw.slice(1) : raw
  const baseSlug = withoutLeading.startsWith('produtos/')
    ? withoutLeading.slice('produtos/'.length)
    : withoutLeading

  const safeSlug = encodeURIComponent(baseSlug)
  const response = await apiClient<ApiSuccess<Produto>>(`${produtosBasePath()}/by-slug/${safeSlug}`)
  return response.data
}

export async function getBrands(): Promise<Brand[]> {
  const response = await apiClient<ApiSuccess<Brand[]>>(`${produtosBasePath()}/brands`)
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
  const endpoint = query
    ? `${produtosBasePath()}/brands/${idBrand}?${query}`
    : `${produtosBasePath()}/brands/${idBrand}`

  const response = await apiClient<BrandByIdResponse>(endpoint)
  return response.data
}
