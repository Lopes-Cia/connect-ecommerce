import { NextRequest, NextResponse } from 'next/server'

import { buildCatalogHeaders } from '@/lib/integration/catalogHeaders'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function toPosixPath(value: string): string {
  return value.replace(/\\/g, '/')
}

export async function POST(request: NextRequest) {
  const headers = buildCatalogHeaders({ origin: 'lopes', readModel: 'redis' })

  try {
    const input = (await request.json().catch(() => null)) as unknown
    const record = asRecord(input)
    if (!record) {
      return NextResponse.json({ ok: false, message: 'Body inválido' }, { status: 400, headers })
    }

    const absPathRaw = asString(record.absPath)
    if (!absPathRaw) {
      return NextResponse.json({ ok: false, message: 'absPath é obrigatório' }, { status: 400, headers })
    }

    const fs = await import('node:fs/promises')
    const path = await import('node:path')

    const repoRoot = process.cwd()
    const allowedRoot = path.resolve(repoRoot, 'MICROSERVICES', 'image-scraper', 'data', 'assets', 'images')
    const resolvedAbs = path.resolve(absPathRaw)

    const allowedLower = (allowedRoot + path.sep).toLowerCase()
    const resolvedLower = resolvedAbs.toLowerCase()
    if (!resolvedLower.startsWith(allowedLower)) {
      return NextResponse.json({ ok: false, message: 'Path não permitido' }, { status: 403, headers })
    }

    const rel = path.relative(allowedRoot, resolvedAbs)
    if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
      return NextResponse.json({ ok: false, message: 'Path inválido' }, { status: 400, headers })
    }

    const destRoot = path.resolve(repoRoot, 'public', 'assets', 'images')
    const destAbs = path.resolve(destRoot, rel)
    const destLower = (destRoot + path.sep).toLowerCase()
    if (!destAbs.toLowerCase().startsWith(destLower)) {
      return NextResponse.json({ ok: false, message: 'Destino inválido' }, { status: 400, headers })
    }

    await fs.mkdir(path.dirname(destAbs), { recursive: true })
    await fs.copyFile(resolvedAbs, destAbs)

    const url = `/assets/images/${toPosixPath(rel)}`
    return NextResponse.json({ ok: true, url, relPath: toPosixPath(rel) }, { headers })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return NextResponse.json({ ok: false, message }, { status: 500, headers })
  }
}

