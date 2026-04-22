import { apiClient } from './client'

import type { ApiSuccess } from '@/lib/types/produtos'
import type { HomeCollections } from '@/lib/types/ecommerce'

export async function getHome(): Promise<HomeCollections> {
  const response = await apiClient<ApiSuccess<HomeCollections>>('/ecommerce/home')
  return response.data
}
