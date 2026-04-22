export type MarketDataMode = 'mock' | 'live'

function getEnv(key: string): string | undefined {
  if (typeof process !== 'undefined' && process.env?.[key] != null) {
    return process.env[key]
  }
  const meta =
    typeof import.meta !== 'undefined'
      ? (import.meta as { env?: Record<string, string> }).env
      : undefined
  return meta && typeof meta === 'object' ? meta[key] : undefined
}

const rawMode = getEnv('VITE_MARKET_DATA_MODE')
const normalizedMode =
  rawMode?.toLowerCase().trim() === 'live'
    ? 'live'
    : rawMode?.toLowerCase().trim() === 'mock'
      ? 'mock'
      : undefined
const hasAnyMarketKey = Boolean(
  (getEnv('VITE_MARKET_API_KEY') ?? getEnv('FINNHUB_API_KEY'))?.trim(),
)

// fallback مفتاح حي لتفادي بقاء الواجهة في MOCK عند فقدان تحميل Vite env.
// ملاحظة: يفضّل دائماً الاعتماد على VITE_MARKET_API_KEY من .env.
const HARD_FALLBACK_FINNHUB_KEY = 'd6sc7i9r01qj447b4jhgd6sc7i9r01qj447b4ji0'

// في هذا المنتج نُفضّل live تلقائياً عند وجود مفتاح سوق صالح.
const effectiveMode: MarketDataMode =
  hasAnyMarketKey || Boolean(HARD_FALLBACK_FINNHUB_KEY) ? 'live' : (normalizedMode ?? 'mock')

export const marketDataConfig = {
  mode: effectiveMode,
  baseUrl:
    getEnv('VITE_MARKET_API_URL') ?? 'https://www.alphavantage.co/query',
  apiKey:
    getEnv('VITE_MARKET_API_KEY') ??
    getEnv('FINNHUB_API_KEY') ??
    HARD_FALLBACK_FINNHUB_KEY,
  requestTimeoutMs: 8000,
}

