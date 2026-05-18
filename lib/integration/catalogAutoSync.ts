import 'server-only'

import { ensureCatalogIndex, syncCatalogToRedis } from '@/lib/integration/catalogAdminService'
import { getCatalogKeyPrefix, getCatalogRedisClient } from '@/lib/integration/catalogRedis'

type EnsureCatalogSyncedResult = {
  ok: true
  synced: boolean
  lockAcquired: boolean
  lastSyncAt: number | null
  maxAgeMs: number
}

function toIntOrNull(value: unknown): number | null {
  const n = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(n) ? n : null
}

async function releaseLock(input: { key: string; value: string }) {
  const client = await getCatalogRedisClient()
  const script = 'if redis.call("GET", KEYS[1]) == ARGV[1] then return redis.call("DEL", KEYS[1]) else return 0 end'
  await client.sendCommand(['EVAL', script, '1', input.key, input.value])
}

export async function ensureCatalogSynced(input?: {
  maxAgeMs?: number
  lockTtlMs?: number
}): Promise<EnsureCatalogSyncedResult> {
  const maxAgeMs = input?.maxAgeMs ?? 5 * 60_000
  const lockTtlMs = input?.lockTtlMs ?? 4 * 60_000

  const client = await getCatalogRedisClient()
  const prefix = getCatalogKeyPrefix()

  const lastSyncKey = `${prefix}:meta:lastSyncAt`
  const lockKey = `${prefix}:meta:syncLock`

  const now = Date.now()
  const lastRaw = await client.sendCommand(['GET', lastSyncKey])
  const lastSyncAt = toIntOrNull(lastRaw)

  if (lastSyncAt && now - lastSyncAt < maxAgeMs) {
    return { ok: true, synced: false, lockAcquired: false, lastSyncAt, maxAgeMs }
  }

  const lockValue = `${process.pid}-${now}-${Math.random().toString(16).slice(2)}`
  const lockResult = await client.sendCommand(['SET', lockKey, lockValue, 'NX', 'PX', String(lockTtlMs)])
  const lockAcquired = typeof lockResult === 'string' && lockResult === 'OK'

  if (!lockAcquired) {
    return { ok: true, synced: false, lockAcquired: false, lastSyncAt, maxAgeMs }
  }

  try {
    await syncCatalogToRedis({})
    await ensureCatalogIndex()
    await client.sendCommand(['SET', lastSyncKey, String(Date.now())])
    return { ok: true, synced: true, lockAcquired: true, lastSyncAt, maxAgeMs }
  } finally {
    await releaseLock({ key: lockKey, value: lockValue }).catch(() => null)
  }
}
