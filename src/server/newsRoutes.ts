import { Router } from 'express'
import { prisma } from '../news-engine/db'
import { sendTestTelegram } from '../news-engine/services/newsPipelineService'
import { getCronRuntimeHealth, runCronPollSafe } from '../news-engine/services/cronRuntimeService'
import { ensureDefaultWatchlist, getActiveWatchlistSymbols } from '../news-engine/services/watchlistManagementService'

export const newsRouter = Router()

newsRouter.get('/health', async (_req, res) => {
  const count = await prisma.newsItem.count()
  const latest = await prisma.newsItem.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  })
  const runtime = await getCronRuntimeHealth()
  res.json({
    ok: true,
    ...runtime,
    totalNews: count,
    lastNewsAt: latest?.createdAt ?? null,
    uptimeSeconds: Math.floor(process.uptime()),
  })
})

newsRouter.get('/watchlist', async (_req, res) => {
  await ensureDefaultWatchlist()
  const symbols = await getActiveWatchlistSymbols()
  res.json({ symbols })
})

newsRouter.get('/', async (req, res) => {
  const symbol = typeof req.query.symbol === 'string' ? req.query.symbol.toUpperCase() : undefined
  const sentiment = typeof req.query.sentiment === 'string' ? req.query.sentiment : undefined
  const impact = typeof req.query.impact === 'string' ? req.query.impact : undefined
  const sent = typeof req.query.sent === 'string' ? req.query.sent === 'true' : undefined
  const limit = Math.max(1, Math.min(Number(req.query.limit ?? 100), 200))

  const items = await prisma.newsItem.findMany({
    where: {
      symbol: symbol || undefined,
      sentiment: sentiment as 'bullish' | 'bearish' | 'neutral' | undefined,
      impactLevel: impact as 'high' | 'medium' | 'low' | undefined,
      sentToTelegram: sent,
    },
    orderBy: { publishedAt: 'desc' },
    take: limit,
  })
  res.json({ items })
})

newsRouter.get('/latest', async (_req, res) => {
  const items = await prisma.newsItem.findMany({
    orderBy: { publishedAt: 'desc' },
    take: 25,
  })
  res.json({ items })
})

newsRouter.post('/poll', async (_req, res) => {
  const out = await runCronPollSafe('manual')
  res.status(out.ok ? 200 : 500).json(out)
})

newsRouter.post('/test-telegram', async (_req, res) => {
  const result = await sendTestTelegram()
  res.status(result.ok ? 200 : 500).json(result)
})
