import { marketDataConfig } from '../../config/marketData'
import { providerSymbolForMarket } from '../../config/terminalSymbols'
import type {
  AlphaVantageGlobalQuoteResponse,
  AlphaVantageNewsResponse,
  FinnhubNewsItem,
  FinnhubQuoteResponse,
} from './rawTypes'

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(),
    marketDataConfig.requestTimeoutMs,
  )

  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    return (await res.json()) as T
  } finally {
    clearTimeout(timeout)
  }
}

export class LiveMarketClient {
  private baseUrl = marketDataConfig.baseUrl
  private apiKey = marketDataConfig.apiKey

  private ensureApiKey() {
    if (!this.apiKey) {
      throw new Error('Missing VITE_MARKET_API_KEY for live market data')
    }
  }

  async fetchLivePrice(symbol: string): Promise<AlphaVantageGlobalQuoteResponse> {
    this.ensureApiKey()
    const url = `${this.baseUrl}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${this.apiKey}`
    return fetchJson<AlphaVantageGlobalQuoteResponse>(url)
  }

  async fetchFinnhubQuote(symbol: string): Promise<FinnhubQuoteResponse> {
    this.ensureApiKey()
    const url =
      typeof window !== 'undefined'
        ? `/api/finnhub/quote?symbol=${encodeURIComponent(symbol)}`
        : `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(this.apiKey)}`
    return fetchJson<FinnhubQuoteResponse>(url)
  }

  async fetchLivePrices(
    symbols: string[],
  ): Promise<Record<string, AlphaVantageGlobalQuoteResponse | FinnhubQuoteResponse>> {
    const entries = await Promise.all(
      symbols.map(async (symbol) => {
        const apiSymbol = providerSymbolForMarket(symbol)
        try {
          // نفضّل Finnhub quotes أولاً
          try {
            const finnhubData = await this.fetchFinnhubQuote(apiSymbol)
            if (Number.isFinite(finnhubData.c) && Number(finnhubData.c) > 0) {
              return [symbol, finnhubData] as const
            }
          } catch (finnhubErr) {
            console.warn('[LiveMarketClient] finnhub quote failed for', symbol, finnhubErr)
          }
          // fallback إلى AlphaVantage quote إن توفّر
          const alphaData = await this.fetchLivePrice(apiSymbol)
          return [symbol, alphaData] as const
        } catch (e) {
          console.warn('[LiveMarketClient] failed to fetch quote for', symbol, e)
          return [symbol, {} as FinnhubQuoteResponse] as const
        }
      }),
    )
    return Object.fromEntries(entries)
  }

  async fetchLiveNews(): Promise<AlphaVantageNewsResponse> {
    this.ensureApiKey()
    // Finnhub general market news
    if (this.baseUrl.includes('finnhub.io') || this.apiKey) {
      const url =
        typeof window !== 'undefined'
          ? '/api/finnhub/news'
          : `https://finnhub.io/api/v1/news?category=general&token=${encodeURIComponent(this.apiKey)}`
      const data = await fetchJson<FinnhubNewsItem[]>(url)
      return {
        feed: data.map((n) => ({
          title: n.headline ?? 'خبر سوق',
          summary: n.summary ?? 'لا يوجد ملخص متاح.',
          url: '',
          ticker: n.symbol,
          time_published: String(n.datetime ?? Date.now()),
        })),
      }
    }
    const url = `${this.baseUrl}?function=NEWS_SENTIMENT&apikey=${this.apiKey}`
    return fetchJson<AlphaVantageNewsResponse>(url)
  }
}

export const liveMarketClient = new LiveMarketClient()

