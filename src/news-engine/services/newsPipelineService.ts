import { prisma } from '../db'
import { newsEnv } from '../env'
import type { AlertPriority, NormalizedNewsItem, PollResult } from '../types'
import { log } from '../utils/logger'
import { isDuplicateStory } from './newsDeduplicationService'
import { ingestNewsBatch } from './newsIngestionService'
import { getMarketContextMap } from './marketContextService'
import { getActiveWatchlistSymbols, ensureDefaultWatchlist } from './watchlistManagementService'
import { buildTelegramAlertMessageWithPriority, sendTelegramMessageWithRetry } from './telegramDeliveryService'

function mapCategoryForDb(category: NormalizedNewsItem['detectedCategory']):
  | 'earnings'
  | 'guidance'
  | 'analyst_action'
  | 'macro'
  | 'ai'
  | 'regulation'
  | 'lawsuit'
  | 'product_launch'
  | 'acquisition'
  | 'market_wide'
  | 'other' {
  if (category === 'analyst action') return 'analyst_action'
  if (category === 'product launch') return 'product_launch'
  if (category === 'market-wide') return 'market_wide'
  if (category === 'AI') return 'ai'
  return category
}

function shouldKeep(item: NormalizedNewsItem, watchlist: string[]): boolean {
  if (watchlist.includes(item.symbol)) return true
  if (item.detectedCategory === 'market-wide' && newsEnv.NEWS_INCLUDE_MARKET_WIDE) {
    const text = `${item.title} ${item.summary}`.toLowerCase()
    const marketRelevant =
      /spy|qqq|nasdaq|s&p|sp500|fomc|fed|rates|yield|inflation|cpi/.test(text)
    return marketRelevant && (item.impactScore >= 65 || item.urgencyScore >= 70)
  }
  return false
}

function evaluatePriority(item: NormalizedNewsItem): AlertPriority {
  const keyCategory = new Set([
    'earnings',
    'guidance',
    'analyst action',
    'macro',
    'regulation',
    'lawsuit',
    'acquisition',
    'market-wide',
  ])
  const strongSentiment = item.sentiment === 'bullish' || item.sentiment === 'bearish'

  if (
    item.impactScore >= 85 ||
    item.urgencyScore >= 85 ||
    ((item.detectedCategory === 'market-wide' || item.detectedCategory === 'macro') &&
      (item.impactScore >= 75 || item.urgencyScore >= 80))
  ) {
    return 'عاجل جدًا'
  }

  if (
    item.impactScore >= newsEnv.NEWS_IMPACT_THRESHOLD ||
    item.urgencyScore >= 75 ||
    (strongSentiment && (item.impactLevel === 'high' || item.impactLevel === 'medium')) ||
    (keyCategory.has(item.detectedCategory) && item.impactScore >= 60)
  ) {
    return 'مهم'
  }

  return 'متابعة'
}

function shouldSendByStrength(item: NormalizedNewsItem, priority: AlertPriority): boolean {
  const meaningfulCategory = new Set([
    'earnings',
    'guidance',
    'analyst action',
    'macro',
    'regulation',
    'lawsuit',
    'acquisition',
    'market-wide',
  ])
  const strongSentiment = item.sentiment === 'bullish' || item.sentiment === 'bearish'

  const passesStrength =
    item.impactLevel === 'high' ||
    item.urgencyScore >= 75 ||
    (strongSentiment && item.impactLevel === 'medium') ||
    (meaningfulCategory.has(item.detectedCategory) && item.impactScore >= 60)

  if (!passesStrength) return false
  if (priority === 'متابعة') return false
  if (item.sentToTelegram) return false
  return true
}

export async function pollAndProcessNews(): Promise<PollResult> {
  await ensureDefaultWatchlist()
  const watchlist = await getActiveWatchlistSymbols()
  const raw = await ingestNewsBatch()
  const ordered = [...raw].sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
  const symbols = [...new Set(ordered.map((x) => x.symbol).filter((s) => s !== 'MARKET'))]
  const sentimentBySymbol = new Map<string, NormalizedNewsItem['sentiment']>()
  for (const item of ordered) {
    if (item.symbol === 'MARKET') continue
    if (!sentimentBySymbol.has(item.symbol)) {
      sentimentBySymbol.set(item.symbol, item.sentiment)
    }
  }
  const marketContextBySymbol = await getMarketContextMap(symbols, sentimentBySymbol)

  let kept = 0
  let duplicates = 0
  let sent = 0
  let failedSends = 0

  let sendBudget = newsEnv.NEWS_MAX_ALERTS_PER_POLL
  for (const item of ordered) {
    if (!shouldKeep(item, watchlist)) continue
    kept += 1

    const duplicate = await isDuplicateStory({
      dedupeHash: item.dedupeHash,
      url: item.url,
      title: item.title,
      summary: item.summary,
      symbol: item.symbol,
      windowMinutes: newsEnv.NEWS_DEDUPE_WINDOW_MINUTES,
      impactScore: item.impactScore,
      urgencyScore: item.urgencyScore,
    })
    if (duplicate) {
      duplicates += 1
      continue
    }

    const dbItem = await prisma.newsItem.create({
      data: {
        source: item.source,
        title: item.title,
        summary: item.summary,
        arabicSummary: item.arabicSummary,
        actionNote: item.actionNote,
        url: item.url,
        publishedAt: item.publishedAt,
        symbol: item.symbol,
        rawCategory: item.rawCategory,
        detectedCategory: mapCategoryForDb(item.detectedCategory),
        sentiment: item.sentiment,
        impactLevel: item.impactLevel,
        impactScore: item.impactScore,
        urgencyScore: item.urgencyScore,
        dedupeHash: item.dedupeHash,
        sentToTelegram: false,
      },
    })

    const priority = evaluatePriority(item)
    if (!shouldSendByStrength(item, priority) || sendBudget <= 0) continue
    const payload = buildTelegramAlertMessageWithPriority(
      item,
      priority,
      marketContextBySymbol.get(item.symbol),
    )
    const result = await sendTelegramMessageWithRetry(payload)
    await prisma.newsAlertLog.create({
      data: {
        newsItemId: dbItem.id,
        status: result.ok ? 'sent' : 'failed',
        error: result.error,
        attempt: Math.max(result.attempts, 1),
        payload,
        deliveredAt: result.ok ? new Date() : null,
      },
    })
    if (result.ok) {
      sent += 1
      sendBudget -= 1
      await prisma.newsItem.update({
        where: { id: dbItem.id },
        data: { sentToTelegram: true },
      })
    } else {
      failedSends += 1
    }
  }

  const summary: PollResult = { fetched: raw.length, kept, duplicates, sent, failedSends }
  log('info', 'Poll completed', summary)
  return summary
}

export async function sendTestTelegram(): Promise<{ ok: boolean; error?: string }> {
  const msg = buildTelegramAlertMessageWithPriority({
    id: 'test-news',
    source: 'اختبار يدوي',
    title: 'خبر تجريبي للتحقق من قالب تيليجرام العربي',
    summary: 'ملخص تجريبي',
    url: 'https://example.com/test-news',
    publishedAt: new Date(),
    symbol: 'NVDA',
    rawCategory: 'manual-test',
    detectedCategory: 'earnings',
    sentiment: 'bullish',
    impactScore: 85,
    impactLevel: 'high',
    urgencyScore: 85,
    dedupeHash: 'test',
    sentToTelegram: false,
    createdAt: new Date(),
    arabicSummary: 'هذه رسالة اختبار للتأكد من أن التنبيه العربي يظهر بشكل واضح داخل تيليجرام.',
    actionNote: 'راقب فرص كول',
  }, 'مهم')
  const res = await sendTelegramMessageWithRetry(msg)
  return { ok: res.ok, error: res.error }
}
