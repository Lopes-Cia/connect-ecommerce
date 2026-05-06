import { NextRequest, NextResponse } from 'next/server'

import { getCatalogKeyPrefix, getCatalogRedisClient } from '@/lib/integration/catalogRedis'
import type { Categoria } from '@/lib/types/produtos'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function parseBool(value: string | null, defaultValue: boolean): boolean {
  if (!value) return defaultValue
  const v = value.trim().toLowerCase()
  if (v === '1' || v === 'true' || v === 'yes' || v === 'on') return true
  if (v === '0' || v === 'false' || v === 'no' || v === 'off') return false
  return defaultValue
}

async function readLocalCategorias(): Promise<Categoria[]> {
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  const filePath = path.join(process.cwd(), 'lib', 'mockups', 'data', 'categorias.json')
  const raw = await fs.readFile(filePath, 'utf8')
  const parsed = JSON.parse(raw) as unknown
  return Array.isArray(parsed) ? (parsed as Categoria[]) : []
}

export async function POST(request: NextRequest) {
  try {
    const usp = request.nextUrl.searchParams
    const prune = parseBool(usp.get('prune'), true)
    const batchSize = Math.min(2000, Math.max(50, Number.parseInt(String(usp.get('batch') ?? ''), 10) || 500))
    const scanCount = Math.min(100000, Math.max(1000, Number.parseInt(String(usp.get('scanCount') ?? ''), 10) || 5000))

    const categorias = await readLocalCategorias()
    const prefix = getCatalogKeyPrefix()
    const client = await getCatalogRedisClient()

    const keepIds = new Set<string>()
    for (const c of categorias) {
      const id = Number((c as { id?: unknown } | null)?.id ?? 0)
      if (!Number.isFinite(id)) continue
      keepIds.add(String(id))
    }

    let written = 0
    let batch: Array<{ key: string; doc: Categoria }> = []

    const flush = async () => {
      if (!batch.length) return
      const multi = client.multi()
      for (const item of batch) {
        multi.sendCommand(['JSON.SET', item.key, '$', JSON.stringify(item.doc)])
      }
      await multi.exec()
      written += batch.length
      batch = []
    }

    for (const c of categorias) {
      const id = Number((c as { id?: unknown } | null)?.id ?? 0)
      if (!Number.isFinite(id)) continue
      const key = `${prefix}:category:${id}`
      batch.push({ key, doc: c })
      if (batch.length >= batchSize) await flush()
    }

    await flush()

    const pruned = { scanned: 0, deleted: 0 }
    if (prune) {
      let deleteBatch: string[] = []
      const flushDeletes = async () => {
        if (!deleteBatch.length) return
        const multi = client.multi()
        for (const k of deleteBatch) multi.sendCommand(['UNLINK', k])
        await multi.exec()
        pruned.deleted += deleteBatch.length
        deleteBatch = []
      }

      const match = `${prefix}:category:*`
      for await (const chunk of client.scanIterator({ MATCH: match, COUNT: scanCount })) {
        const keys = Array.isArray(chunk) ? chunk : [chunk]
        for (const rawKey of keys) {
          pruned.scanned += 1
          const key = String(rawKey)
          const id = key.slice(`${prefix}:category:`.length)
          if (!keepIds.has(id)) {
            deleteBatch.push(key)
            if (deleteBatch.length >= batchSize) await flushDeletes()
          }
        }
      }
      await flushDeletes()
    }

    return NextResponse.json({
      ok: true,
      prefix,
      source: 'lib/mockups/data/categorias.json',
      total: categorias.length,
      written,
      prune: { enabled: prune, ...pruned },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return NextResponse.json({ ok: false, message }, { status: 500 })
  }
}
