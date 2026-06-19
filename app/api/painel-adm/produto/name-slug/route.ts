import { NextRequest, NextResponse } from 'next/server'

import { buildCatalogHeaders } from '@/lib/integration/catalogHeaders'
import { HttpError } from '@/lib/integration/network'
import { asNumber, asRecord, asString, readRawNameSlug, readRedisNameSlug, writeRedisNameSlug } from './_lib'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const headers = buildCatalogHeaders({ origin: 'lopes', readModel: 'redis' })

  try {
    const idProduto = asNumber(request.nextUrl.searchParams.get('idProduto'))
    if (!idProduto || idProduto <= 0 || !Number.isInteger(idProduto)) {
      return NextResponse.json({ ok: false, message: 'idProduto inválido' }, { status: 400, headers })
    }

    const [raw, redis] = await Promise.all([readRawNameSlug(idProduto), readRedisNameSlug(idProduto)])
    if (!raw) {
      return NextResponse.json({ ok: false, message: 'Produto não encontrado no raw' }, { status: 404, headers })
    }

    return NextResponse.json({ raw, redis }, { headers })
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        error.data ?? { ok: false, message: 'Erro na integração (lopes back)' },
        { status: error.status, headers }
      )
    }

    const message = error instanceof Error ? error.message : 'Unexpected error'
    return NextResponse.json({ ok: false, message }, { status: 500, headers })
  }
}

export async function POST(request: NextRequest) {
  const headers = buildCatalogHeaders({ origin: 'lopes', readModel: 'redis' })

  try {
    const input = (await request.json().catch(() => null)) as unknown
    const record = asRecord(input)
    if (!record) {
      return NextResponse.json({ ok: false, message: 'Body inválido' }, { status: 400, headers })
    }

    const idProduto = asNumber(record.idProduto)
    const name = asString(record.name)
    const slug = asString(record.slug)

    if (!idProduto || idProduto <= 0 || !Number.isInteger(idProduto)) {
      return NextResponse.json({ ok: false, message: 'idProduto inválido' }, { status: 400, headers })
    }

    if (!name) {
      return NextResponse.json({ ok: false, message: 'name inválido' }, { status: 400, headers })
    }

    const result = await writeRedisNameSlug({
      idProduto,
      name,
      slug,
    })
    if (!result.redis) {
      return NextResponse.json({ ok: false, message: 'Chave não encontrada', key: result.key }, { status: 404, headers })
    }

    return NextResponse.json(
      {
        redis: result.redis,
      },
      { headers }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected Redis error'
    return NextResponse.json({ ok: false, message }, { status: 500, headers })
  }
}
