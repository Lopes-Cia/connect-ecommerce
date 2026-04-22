import 'server-only'

import type { Brand, CategoriaNode, Produto } from '@/liz_refator/adapters/produtos-types'

import { integrationGetJson, integrationGetJsonAuth } from './client'

type SuccessResponse<T> = {
  success: true
  data: T
}

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as UnknownRecord
}

function unwrapData<T>(payload: unknown): T {
  /**
   * Muitos endpoints da integração retornam:
   * - `{ data: ... }` (envelope)
   * - ou retornam o objeto diretamente.
   * Aqui padronizamos para retornar sempre o "miolo".
   */
  const record = asRecord(payload)
  if (record && 'data' in record) return record.data as T
  return payload as T
}

function encodePathSegments(value: string): string {
  /**
   * Normaliza paths do tipo "categoria/cervejas" ou "produtos/minha-marca/xyz"
   * sem encode duplo e sem vazar barras.
   */
  return String(value ?? '')
    .trim()
    .replace(/^\/+/, '')
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

function isMockFonte(): boolean {
  return String(process.env.NEXT_PUBLIC_FONTE ?? '').toLowerCase() === 'mock'
}

export async function getCategoriaBySlug(slugPath: string): Promise<SuccessResponse<{ category: CategoriaNode }>> {
  const safeSlug = encodePathSegments(slugPath)

  const payload = await (isMockFonte() ? integrationGetJson<unknown> : integrationGetJsonAuth<unknown>)(
    isMockFonte()
      ? `/produtos/categorias/by-slug/${safeSlug}`
      : `/Servidor/webservice/integration/produtos/categorias/by-slug/${safeSlug}`
  )

  const data = unwrapData<{ category: CategoriaNode }>(payload)
  return { success: true, data }
}

export async function getProdutoBySlug(slug: string): Promise<SuccessResponse<Produto>> {
  const safeSlug = encodePathSegments(slug)

  const payload = await (isMockFonte() ? integrationGetJson<unknown> : integrationGetJsonAuth<unknown>)(
    isMockFonte()
      ? `/produtos/by-slug/${safeSlug}`
      : `/Servidor/webservice/integration/produtos/by-slug/${safeSlug}`
  )

  const data = unwrapData<Produto>(payload)
  return { success: true, data }
}

export async function getBrands(): Promise<SuccessResponse<Brand[]>> {
  const payload = await (isMockFonte() ? integrationGetJson<unknown> : integrationGetJsonAuth<unknown>)(
    isMockFonte() ? '/produtos/brands' : '/Servidor/webservice/integration/produtos/brands'
  )
  const data = unwrapData<Brand[]>(payload)
  return { success: true, data }
}
