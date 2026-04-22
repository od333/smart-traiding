import crypto from 'node:crypto'
import type { NormalizedNewsItem } from '../types'
import { getDefaultWatchlist } from './watchlistManagementService'
import { classifyNewsItem } from './newsClassificationService'
import { log } from '../utils/logger'
import { newsEnv } from '../env'
import type { NewsProvider, ProviderRawNews } from './newsProviders'

type FinnhubNews = {
  id?: number
  source?: string
  headline?: string
  summary?: string
  url?: string
  datetime?: number
  category?: string
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as T
}

async function fetchFinnhubNewsBySymbol(symbol: string): Promise<FinnhubNews[]> {
  const token = newsEnv.FINNHUB_API_KEY || newsEnv.VITE_MARKET_API_KEY
  if (!token) return []
  const now = new Date()
  const from = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(symbol)}&from=${fmt(from)}&to=${fmt(now)}&token=${encodeURIComponent(token)}`
  return fetchJson<FinnhubNews[]>(url)
}

async function fetchFinnhubGeneralNews(): Promise<FinnhubNews[]> {
  const token = newsEnv.FINNHUB_API_KEY || newsEnv.VITE_MARKET_API_KEY
  if (!token) return []
  const url = `https://finnhub.io/api/v1/news?category=general&token=${encodeURIComponent(token)}`
  return fetchJson<FinnhubNews[]>(url)
}

function parseRssItems(xml: string): Array<{ title: string; summary: string; url: string; publishedAt: Date }> {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? []
  return items
    .map((item) => {
      const pick = (tag: string): string =>
        (item.match(new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`))?.[1] ??
          item.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))?.[1] ??
          '')
          .trim()
      const title = pick('title')
      const url = pick('link')
      const summary = pick('description')
      const pub = pick('pubDate')
      return { title, summary, url, publishedAt: pub ? new Date(pub) : new Date() }
    })
    .filter((x) => x.title && x.url)
}

async function fetchYahooRss(symbol: string): Promise<Array<{ title: string; summary: string; url: string; publishedAt: Date }>> {
  const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol)}&region=US&lang=en-US`
  const res = await fetch(url)
  if (!res.ok) return []
  const xml = await res.text()
  return parseRssItems(xml)
}

function sourcePriority(source: string): number {
  const s = source.toLowerCase()
  if (s === 'finnhub' || s === 'yahoo') return 3
  if (s === 'yahoo-rss') return 2
  return 1
}

function normalizeTitleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function squashCrossSourceDuplicates(items: ProviderRawNews[]): ProviderRawNews[] {
  const byKey = new Map<string, ProviderRawNews>()
  for (const item of items) {
    const key = `${item.symbol}|${normalizeTitleKey(item.title)}`
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, item)
      continue
    }
    const existingScore =
      sourcePriority(existing.source) + Math.min(existing.summary.length, 400) / 400
    const candidateScore = sourcePriority(item.source) + Math.min(item.summary.length, 400) / 400
    if (candidateScore > existingScore) {
      byKey.set(key, item)
    }
  }
  return [...byKey.values()]
}

export async function ingestNewsBatch(): Promise<NormalizedNewsItem[]> {
  const symbols = getDefaultWatchlist()
  const providers: NewsProvider[] = [
    {
      name: 'finnhub-provider',
      fetch: async (watchlist: string[]) => {
        const out: ProviderRawNews[] = []
        const finnhubBySymbol = await Promise.all(watchlist.map((s) => fetchFinnhubNewsBySymbol(s)))
        for (let i = 0; i < watchlist.length; i += 1) {
          const symbol = watchlist[i]
          for (const n of finnhubBySymbol[i] ?? []) {
            if (!n.headline || !n.url) continue
            out.push({
              source: n.source ?? 'finnhub',
              title: n.headline,
              summary: n.summary ?? '',
              url: n.url,
              publishedAt: new Date((n.datetime ?? Math.floor(Date.now() / 1000)) * 1000),
              symbol,
              rawCategory: n.category ?? 'company-news',
            })
          }
        }
        const general = await fetchFinnhubGeneralNews()
        for (const n of general) {
          if (!n.headline || !n.url) continue
          out.push({
            source: n.source ?? 'finnhub',
            title: n.headline,
            summary: n.summary ?? '',
            url: n.url,
            publishedAt: new Date((n.datetime ?? Math.floor(Date.now() / 1000)) * 1000),
            symbol: 'MARKET',
            rawCategory: n.category ?? 'general',
          })
        }
        return out
      },
    },
    {
      name: 'yahoo-rss-provider',
      fetch: async (watchlist: string[]) => {
        const out: ProviderRawNews[] = []
        const yahooBySymbol = await Promise.all(watchlist.map((s) => fetchYahooRss(s)))
        for (let i = 0; i < watchlist.length; i += 1) {
          const symbol = watchlist[i]
          for (const n of yahooBySymbol[i] ?? []) {
            out.push({
              source: 'yahoo-rss',
              title: n.title,
              summary: n.summary,
              url: n.url,
              publishedAt: n.publishedAt,
              symbol,
              rawCategory: 'rss',
            })
          }
        }
        return out
      },
    },
  ]

  const providerResults = await Promise.all(
    providers.map(async (p) => {
      try {
        const items = await p.fetch(symbols)
        log('info', 'Provider fetch complete', { provider: p.name, count: items.length })
        return items
      } catch (error) {
        log('warn', 'Provider fetch failed', {
          provider: p.name,
          error: error instanceof Error ? error.message : String(error),
        })
        return []
      }
    }),
  )
  const merged = squashCrossSourceDuplicates(providerResults.flat())

  const normalized = merged.map((item) =>
    classifyNewsItem({
      id: crypto.createHash('md5').update(`${item.url}|${item.title}`).digest('hex'),
      source: item.source,
      title: item.title,
      summary: item.summary,
      url: item.url,
      publishedAt: item.publishedAt,
      symbol: item.symbol,
      rawCategory: item.rawCategory,
      sentToTelegram: false,
      createdAt: new Date(),
    }),
  )

  log('info', 'Ingested news batch', { total: normalized.length })
  return normalized
}
