import type { NewsSentiment } from '../types'

export type MarketContextAr = {
  currentPrice: string
  changeText: string
  movement: 'صاعد' | 'هابط' | 'متذبذب'
  volumeVsAverage: 'أعلى من المتوسط' | 'قريب من المتوسط' | 'أقل من المتوسط'
  confirmation: 'مؤكد' | 'غير مؤكد'
}

function toArabicNumber(n: number, digits = 2): string {
  return n.toLocaleString('ar-SA', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

function volumeState(currentVolume: number, averageVolume: number): MarketContextAr['volumeVsAverage'] {
  if (!Number.isFinite(currentVolume) || !Number.isFinite(averageVolume) || averageVolume <= 0) {
    return 'قريب من المتوسط'
  }
  const ratio = currentVolume / averageVolume
  if (ratio > 1.15) return 'أعلى من المتوسط'
  if (ratio < 0.85) return 'أقل من المتوسط'
  return 'قريب من المتوسط'
}

function movementConfirmation(
  sentiment: NewsSentiment,
  movement: MarketContextAr['movement'],
  volumeVsAverage: MarketContextAr['volumeVsAverage'],
): MarketContextAr['confirmation'] {
  if (sentiment === 'bullish' && movement === 'صاعد' && volumeVsAverage === 'أعلى من المتوسط') {
    return 'مؤكد'
  }
  if (sentiment === 'bearish' && movement === 'هابط' && volumeVsAverage === 'أعلى من المتوسط') {
    return 'مؤكد'
  }
  if (
    (sentiment === 'bullish' && movement === 'هابط') ||
    (sentiment === 'bearish' && movement === 'صاعد')
  ) {
    return 'غير مؤكد'
  }
  return 'غير مؤكد'
}

type YahooMeta = {
  regularMarketPrice?: number
  regularMarketChange?: number
  regularMarketChangePercent?: number
  regularMarketVolume?: number
  averageDailyVolume3Month?: number
}

async function fetchYahooMeta(symbol: string): Promise<YahooMeta | null> {
  const providerSymbol = symbol === 'SPY' || symbol === 'QQQ' ? symbol : symbol
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(providerSymbol)}?range=1d&interval=1m&includePrePost=true`
  const res = await fetch(url)
  if (!res.ok) return null
  const raw = (await res.json()) as {
    chart?: { result?: Array<{ meta?: YahooMeta }> }
  }
  return raw.chart?.result?.[0]?.meta ?? null
}

function movementFromChange(changePercent: number): MarketContextAr['movement'] {
  if (changePercent >= 0.25) return 'صاعد'
  if (changePercent <= -0.25) return 'هابط'
  return 'متذبذب'
}

export async function getMarketContextMap(
  symbols: string[],
  sentimentBySymbol: Map<string, NewsSentiment>,
): Promise<Map<string, MarketContextAr>> {
  const out = new Map<string, MarketContextAr>()
  if (!symbols.length) return out

  try {
    const tasks = symbols.map(async (symbol) => {
      const meta = await fetchYahooMeta(symbol)
      if (!meta) return null
      const price = Number(meta.regularMarketPrice)
      const changeAbs = Number(meta.regularMarketChange)
      const changePct = Number(meta.regularMarketChangePercent)
      if (!Number.isFinite(price) || !Number.isFinite(changeAbs) || !Number.isFinite(changePct)) {
        return null
      }

      const currentVolume = Number(meta.regularMarketVolume ?? 0)
      const averageVolume = Number(meta.averageDailyVolume3Month ?? 0)
      const movement = movementFromChange(changePct)
      const volumeVsAverage = volumeState(currentVolume, averageVolume)
      const sentiment = sentimentBySymbol.get(symbol) ?? 'neutral'
      const confirmation = movementConfirmation(sentiment, movement, volumeVsAverage)

      return {
        symbol,
        context: {
          currentPrice: toArabicNumber(price, 2),
          changeText: `${changeAbs >= 0 ? '+' : ''}${toArabicNumber(changeAbs, 2)} (${changePct >= 0 ? '+' : ''}${toArabicNumber(changePct, 2)}%)`,
          movement,
          volumeVsAverage,
          confirmation,
        } satisfies MarketContextAr,
      }
    })
    const results = await Promise.all(tasks)
    for (const row of results) {
      if (!row) continue
      out.set(row.symbol, row.context)
    }
  } catch {
    // optional enrichment: ignore failures and keep original alert flow
    return out
  }

  return out
}
