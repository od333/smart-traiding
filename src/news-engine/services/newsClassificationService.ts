import crypto from 'node:crypto'
import type { NewsDetectedCategory, NewsImpactLevel, NewsSentiment, NormalizedNewsItem } from '../types'
import { NEWS_ENGINE_WATCHLIST } from '../watchlistSymbols'

const CATEGORY_RULES: Array<{ category: NewsDetectedCategory; words: string[] }> = [
  { category: 'earnings', words: ['earnings', 'eps', 'revenue', 'results'] },
  { category: 'guidance', words: ['guidance', 'forecast', 'outlook'] },
  { category: 'analyst action', words: ['upgraded', 'downgraded', 'price target', 'analyst'] },
  { category: 'macro', words: ['cpi', 'inflation', 'fomc', 'fed', 'rates', 'yield'] },
  { category: 'AI', words: ['ai', 'artificial intelligence', 'model', 'chip'] },
  { category: 'regulation', words: ['regulator', 'regulation', 'sec', 'antitrust'] },
  { category: 'lawsuit', words: ['lawsuit', 'sues', 'court', 'legal'] },
  { category: 'product launch', words: ['launch', 'released', 'announced product'] },
  { category: 'acquisition', words: ['acquire', 'acquisition', 'merger', 'buyout'] },
  { category: 'market-wide', words: ['nasdaq', 's&p 500', 'market', 'wall street'] },
]

const POSITIVE_WORDS = ['beat', 'surge', 'rise', 'up', 'growth', 'bullish', 'record']
const NEGATIVE_WORDS = ['miss', 'drop', 'down', 'decline', 'cut', 'bearish', 'risk']

function normalizeText(input: string): string {
  return input.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

export function detectSymbol(title: string, summary: string, fallback = ''): string {
  const txt = ` ${normalizeText(title)} ${normalizeText(summary)} `
  const candidates = NEWS_ENGINE_WATCHLIST
  for (const c of candidates) {
    if (txt.includes(` ${c.toLowerCase()} `)) return c
  }
  if (/nasdaq|s&p|market|wall street|fed|fomc/.test(txt)) return 'MARKET'
  return fallback || 'MARKET'
}

function detectCategory(text: string): NewsDetectedCategory {
  for (const rule of CATEGORY_RULES) {
    if (rule.words.some((w) => text.includes(w))) return rule.category
  }
  return 'other'
}

function detectSentiment(text: string): NewsSentiment {
  const pos = POSITIVE_WORDS.reduce((a, w) => (text.includes(w) ? a + 1 : a), 0)
  const neg = NEGATIVE_WORDS.reduce((a, w) => (text.includes(w) ? a + 1 : a), 0)
  if (pos > neg) return 'bullish'
  if (neg > pos) return 'bearish'
  return 'neutral'
}

function computeImpact(category: NewsDetectedCategory, sentiment: NewsSentiment, text: string): {
  level: NewsImpactLevel
  score: number
  urgency: number
} {
  let score = 35
  if (category === 'earnings' || category === 'guidance' || category === 'market-wide') score += 25
  if (category === 'acquisition' || category === 'regulation' || category === 'lawsuit') score += 20
  if (sentiment !== 'neutral') score += 10
  if (text.includes('breaking') || text.includes('urgent')) score += 15
  const bounded = Math.max(0, Math.min(100, score))
  const level: NewsImpactLevel = bounded >= 75 ? 'high' : bounded >= 50 ? 'medium' : 'low'
  const urgency = Math.max(0, Math.min(100, bounded + (text.includes('breaking') ? 10 : 0)))
  return { level, score: bounded, urgency }
}

function makeArabicSummary(symbol: string, sentiment: NewsSentiment, category: NewsDetectedCategory): string {
  const sentimentAr = sentiment === 'bullish' ? 'إيجابية' : sentiment === 'bearish' ? 'سلبية' : 'محايدة'
  if (category === 'earnings') {
    return `نتائج ${symbol} تحمل نبرة ${sentimentAr} وقد تؤثر على حركة السهم في الجلسات القريبة.`
  }
  if (category === 'guidance') {
    return `التوجيه المستقبلي المرتبط بـ ${symbol} جاء بنبرة ${sentimentAr} ويستحق المتابعة.`
  }
  if (category === 'market-wide') {
    return `خبر عام على السوق بنبرة ${sentimentAr} وقد ينعكس على أسهم النمو والمؤشرات.`
  }
  return `خبر متعلق بـ ${symbol} بنبرة ${sentimentAr}. الأفضل انتظار تأكيد الحركة قبل الدخول.`
}

function makeActionNote(sentiment: NewsSentiment, impact: NewsImpactLevel): string {
  if (impact === 'low') return 'لا يوجد إجراء'
  if (sentiment === 'bullish') return 'راقب فرص كول'
  if (sentiment === 'bearish') return 'راقب فرص بوت'
  return 'متابعة فقط'
}

export function classifyNewsItem(input: Omit<NormalizedNewsItem, 'detectedCategory' | 'sentiment' | 'impactScore' | 'impactLevel' | 'urgencyScore' | 'arabicSummary' | 'actionNote' | 'dedupeHash'>): NormalizedNewsItem {
  const text = normalizeText(`${input.title} ${input.summary}`)
  const symbol = detectSymbol(input.title, input.summary, input.symbol)
  const detectedCategory = detectCategory(text)
  const sentiment = detectSentiment(text)
  const impact = computeImpact(detectedCategory, sentiment, text)
  const dedupeRaw = `${input.url}|${normalizeText(input.title)}|${symbol}`
  const dedupeHash = crypto.createHash('sha1').update(dedupeRaw).digest('hex')

  return {
    ...input,
    symbol,
    detectedCategory,
    sentiment,
    impactScore: impact.score,
    impactLevel: impact.level,
    urgencyScore: impact.urgency,
    arabicSummary: makeArabicSummary(symbol, sentiment, detectedCategory),
    actionNote: makeActionNote(sentiment, impact.level),
    dedupeHash,
  }
}
