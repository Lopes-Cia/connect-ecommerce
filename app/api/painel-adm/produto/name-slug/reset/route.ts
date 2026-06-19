import { NextRequest, NextResponse } from 'next/server'

import { buildCatalogHeaders } from '@/lib/integration/catalogHeaders'
import { HttpError } from '@/lib/integration/network'

import { asNumber, readRawNameSlug, readRedisNameSlug, writeRedisNameSlug } from '../_lib'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const headers = buildCatalogHeaders({ origin: 'lopes', readModel: 'redis' })

  try {
    const idProduto = asNumber(request.nextUrl.searchParams.get('idProduto'))
    if (!idProduto || idProduto <= 0 || !Number.isInteger(idProduto)) {
      return NextResponse.json({ ok: false, message: 'idProduto inválido' }, { status: 400, headers })
    }

    const raw = await readRawNameSlug(idProduto)
    if (!raw) {
      return NextResponse.json({ ok: false, message: 'Produto não encontrado no raw' }, { status: 404, headers })
    }

    const result = await writeRedisNameSlug({
      idProduto,
      name: raw.name,
      slug: raw.slug,
    })

    if (!result.redis) {
      return NextResponse.json({ ok: false, message: 'Chave não encontrada', key: result.key }, { status: 404, headers })
    }

    return NextResponse.json(
      {
        reset: true,
        raw,
        redis: await readRedisNameSlug(idProduto),
      },
      { headers }
    )
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        error.data ?? { ok: false, message: 'Erro na integração (lopes back)' },
        { status: error.status, headers }
      )
    }

    const message = error instanceof Error ? error.message : 'Unexpected reset error'
    return NextResponse.json({ ok: false, message }, { status: 500, headers })
  }
}
