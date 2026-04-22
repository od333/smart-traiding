import { prisma } from '../db'
import { log } from '../utils/logger'
import { pollAndProcessNews } from './newsPipelineService'

const LOCK_KEY = 'cron_lock'
const LAST_RUN_KEY = 'cron_last_run'
const LAST_SUCCESS_KEY = 'cron_last_success'
const LAST_ERROR_KEY = 'cron_last_error'
const LAST_SENT_COUNT_KEY = 'cron_last_sent_count'

type PollSummary = Awaited<ReturnType<typeof pollAndProcessNews>>

function nowIso(): string {
  return new Date().toISOString()
}

async function setState(key: string, value: string): Promise<void> {
  await prisma.newsEngineState.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  })
}

async function getState(key: string): Promise<string | null> {
  const row = await prisma.newsEngineState.findUnique({ where: { key } })
  return row?.value ?? null
}

async function acquireRedisLock(ttlSec = 55): Promise<{ ok: boolean; provider: string }> {
  const base = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN
  if (!base || !token) return { ok: false, provider: 'none' }

  try {
    const key = 'od-finance:news:poll:lock'
    const val = String(Date.now())
    const url = `${base}/set/${encodeURIComponent(key)}/${encodeURIComponent(val)}?NX=true&EX=${ttlSec}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) return { ok: false, provider: 'redis' }
    const body = (await res.json().catch(() => ({}))) as { result?: string | null }
    return { ok: body.result === 'OK', provider: 'redis' }
  } catch {
    return { ok: false, provider: 'redis' }
  }
}

async function acquireDbLock(ttlSec = 55): Promise<boolean> {
  const now = Date.now()
  const lockExpiry = now + ttlSec * 1000
  const current = await getState(LOCK_KEY)
  const currentTs = current ? Number(current) : 0
  if (Number.isFinite(currentTs) && currentTs > now) {
    return false
  }
  await setState(LOCK_KEY, String(lockExpiry))
  return true
}

async function releaseDbLock(): Promise<void> {
  await setState(LOCK_KEY, '0')
}

export async function getCronRuntimeHealth(): Promise<{
  mode: 'vercel-cron'
  schedule: 'every minute'
  workerEnabled: boolean
  cronEnabled: boolean
  lastRun: string | null
  lastSuccess: string | null
  lastError: string | null
  lastSentCount: number
}> {
  const [lastRun, lastSuccess, lastError, lastSentCount] = await Promise.all([
    getState(LAST_RUN_KEY),
    getState(LAST_SUCCESS_KEY),
    getState(LAST_ERROR_KEY),
    getState(LAST_SENT_COUNT_KEY),
  ])

  return {
    mode: 'vercel-cron',
    schedule: 'every minute',
    workerEnabled: true,
    cronEnabled: true,
    lastRun,
    lastSuccess,
    lastError,
    lastSentCount: Number(lastSentCount ?? '0') || 0,
  }
}

export async function runCronPollSafe(trigger: 'cron' | 'manual'): Promise<{
  ok: boolean
  skipped?: boolean
  lockProvider?: 'redis' | 'db'
  reason?: string
  result?: PollSummary
}> {
  await setState(LAST_RUN_KEY, nowIso())

  const redisLock = await acquireRedisLock(55)
  let lockProvider: 'redis' | 'db' = 'db'
  let lockOk = redisLock.ok
  if (redisLock.provider === 'redis') {
    lockProvider = 'redis'
  }
  if (!lockOk) {
    lockOk = await acquireDbLock(55)
    lockProvider = 'db'
  }
  if (!lockOk) {
    return {
      ok: true,
      skipped: true,
      lockProvider,
      reason: 'run already in progress',
    }
  }

  try {
    const result = await pollAndProcessNews()
    await Promise.all([
      setState(LAST_SUCCESS_KEY, nowIso()),
      setState(LAST_ERROR_KEY, ''),
      setState(LAST_SENT_COUNT_KEY, String(result.sent)),
    ])
    log('info', 'Cron poll executed', { trigger, lockProvider, sent: result.sent })
    return { ok: true, lockProvider, result }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    await setState(LAST_ERROR_KEY, msg)
    log('error', 'Cron poll failed', { trigger, lockProvider, error: msg })
    return { ok: false, lockProvider, reason: msg }
  } finally {
    if (lockProvider === 'db') {
      await releaseDbLock()
    }
  }
}
