import { NextResponse } from 'next/server'

import { importMockHomeToRedis } from '@/lib/integration/catalogHomeService'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST() {
  try {
    const result = await importMockHomeToRedis()
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return NextResponse.json({ ok: false, message }, { status: 500 })
  }
}

