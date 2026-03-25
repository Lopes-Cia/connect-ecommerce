import 'server-only'

import type { Product } from '@/lib/types/product'

import { getIntegrationEnvConfig } from './config'
import { businessGet } from './httpClient'

function isProduct(value: unknown): value is Product {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.codProd === 'number' &&
    typeof candidate.idIntegradora === 'number' &&
    typeof candidate.indiceEstoque === 'number' &&
    typeof candidate.qtUnit === 'number'
  )
}

function parseProductList(payload: unknown): Product[] {
  if (Array.isArray(payload)) {
    return payload as Product[]
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid product list response payload')
  }

  const objectPayload = payload as Record<string, unknown>
  const candidates = ['data', 'produtos', 'products', 'lista', 'itens']

  for (const key of candidates) {
    const value = objectPayload[key]
    if (Array.isArray(value)) {
      return value as Product[]
    }
  }

  throw new Error('Could not locate product list in response payload')
}

function parseProduct(payload: unknown): Product {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid product response payload')
  }

  if (isProduct(payload)) {
    return payload
  }

  const objectPayload = payload as Record<string, unknown>
  const candidates = ['data', 'produto', 'product', 'item']

  for (const key of candidates) {
    const value = objectPayload[key]
    if (isProduct(value)) {
      return value
    }
  }

  throw new Error('Could not locate product in response payload')
}

export async function getIntegratedProducts(idIntegradora?: number): Promise<Product[]> {
  const env = getIntegrationEnvConfig()

  const payload = await businessGet<unknown>('/Servidor/webservice/integration/getListProdutoLoja', {
    idIntegradora: idIntegradora ?? env.idIntegradora,
  })

  return parseProductList(payload)
}

export async function getIntegratedProductByCode(
  codProd: number,
  idIntegradora?: number
): Promise<Product> {
  const env = getIntegrationEnvConfig()

  const payload = await businessGet<unknown>('/Servidor/webservice/integration/getProdutoLoja', {
    idIntegradora: idIntegradora ?? env.idIntegradora,
    codProd,
  })

  return parseProduct(payload)
}
