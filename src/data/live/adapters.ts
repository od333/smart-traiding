import type {
  MarketState,
  MarketMood,
  NewsItem,
  PriceSnapshot,
} from '../../domain/models'
import type {
  AlphaVantageGlobalQuoteResponse,
  AlphaVantageNewsResponse,
  FinnhubNewsItem,
  FinnhubQuoteResponse,
} from './rawTypes'

function parseNumber(value: string | undefined): number {
  const n = value ? Number(value) : NaN
  return Number.isFinite(n) ? n : 0
}

export function toPriceSnapshot(
  symbol: string,
  raw: AlphaVantageGlobalQuoteResponse | FinnhubQuoteResponse,
): PriceSnapshot {
  const quote = (raw as AlphaVantageGlobalQuoteResponse)['Global Quote']
  const finnhub = raw as FinnhubQuoteResponse
  const alphaPrice = parseNumber(quote?.['05. price'])
  const alphaVolume = parseNumber(quote?.['06. volume'])
  const price = alphaPrice > 0 ? alphaPrice : Number(finnhub.c ?? 0)
  const volume = alphaVolume > 0 ? alphaVolume : Number(finnhub.v ?? 0)
  const open = Number(finnhub.o ?? 0)
  const previousClose = Number(finnhub.pc ?? 0)
  const baseRef = open > 0 ? open : previousClose > 0 ? previousClose : price

  return {
    symbol,
    lastPrice: price,
    vwap: baseRef,
    averageVolume: volume || 1_000_000,
    currentVolume: volume,
    trendScore: 0,
    momentumScore: 0,
    distanceFromRecentSupportPct: 0.05,
    distanceFromRecentResistancePct: 0.05,
    isNearOpeningRangeBreak: false,
    hasStrongNews: false,
  }
}

export function toMarketStateFromSnapshots(
  _snapshots: PriceSnapshot[],
): MarketState {
  const mood: MarketMood = 'mixed'
  return {
    sessionLabelAr: 'جلسة سوق حية (بيانات عامة)',
    overallMood: mood,
    descriptionAr:
      'بيانات السوق الحالية مستمدة من مزود خارجي عام، مع قراءة أولية للاتجاه العام.',
    indices: [],
  }
}

export function toNewsItems(raw: AlphaVantageNewsResponse): NewsItem[] {
  if (!raw.feed || !raw.feed.length) return []

  return raw.feed.slice(0, 50).map((item, idx) => ({
    id: item.time_published + '-' + idx,
    symbol: item.ticker ?? '',
    tone: 'neutral',
    titleAr: item.title,
    bodyAr: item.summary,
  }))
}

export function toNewsItemsFromFinnhub(raw: FinnhubNewsItem[]): NewsItem[] {
  if (!raw?.length) return []
  return raw.slice(0, 50).map((item, idx) => ({
    id: String(item.id ?? `${item.datetime ?? Date.now()}-${idx}`),
    symbol: item.symbol ?? '',
    tone: 'neutral',
    titleAr: item.headline ?? 'خبر سوق',
    bodyAr: item.summary ?? 'لا يوجد ملخص متاح.',
  }))
}

