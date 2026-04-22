import { runCronPollSafe } from '../../../src/news-engine/services/cronRuntimeService'

type VercelReq = {
  method?: string
  headers: Record<string, string | string[] | undefined>
}
type VercelRes = {
  status: (code: number) => VercelRes
  json: (data: unknown) => void
}

export default async function handler(req: VercelReq, res: VercelRes): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method not allowed' })
    return
  }

  // Accept manual and cron invocations; no persistent loop.
  const out = await runCronPollSafe('cron')
  res.status(out.ok ? 200 : 500).json(out)
}
