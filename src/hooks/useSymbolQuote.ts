import { useEffect, useState } from 'react'
import { providerSymbolForMarket } from '../config/terminalSymbols'

type FinnhubQuote = { c?: number }

function parseYahooChartPrice(raw: unknown): number | null {
  const chart = (raw as { chart?: { result?: Array<{ meta?: Record<string, number> }> } })?.chart
  const meta = chart?.result?.[0]?.meta
  if (!meta) return null
  const post = meta.postMarketPrice
  const pre = meta.preMarketPrice
  const reg = meta.regularMarketPrice
  if (typeof post === 'number' && Number.isFinite(post) && post > 0) return post
  if (typeof pre === 'number' && Number.isFinite(pre) && pre > 0) return pre
  if (typeof reg === 'number' && Number.isFinite(reg) && reg > 0) return reg
  return null
}

export type SymbolQuoteResult = {
  price: number | null
  updatedAt: number | null
  source: 'finnhub' | 'yahoo' | null
}

/**
 * سعر لحظي — Finnhub ثم Yahoo احتياطاً (مفيد عند 429 أو انقطاع).
 */
export function useSymbolQuote(symbol: string): SymbolQuoteResult {
  const [state, setState] = useState<SymbolQuoteResult>({
    price: null,
    updatedAt: null,
    source: null,
  })

  useEffect(() => {
    setState({ price: null, updatedAt: null, source: null })
    if (!symbol?.trim()) return
    const sym = symbol.trim().toUpperCase()
    const apiSym = providerSymbolForMarket(sym)
    let cancelled = false

    const tick = async () => {
      let p: number | null = null
      let src: SymbolQuoteResult['source'] = null

      try {
        const res = await fetch(`/api/finnhub/quote?symbol=${encodeURIComponent(apiSym)}`)
        if (res.ok) {
          const data = (await res.json()) as FinnhubQuote
          const v = Number(data.c)
          if (Number.isFinite(v) && v > 0) {
            p = v
            src = 'finnhub'
          }
        }
      } catch {
        /* try yahoo */
      }

      if (p == null) {
        try {
          const res = await fetch(`/api/yahoo/quote?symbol=${encodeURIComponent(apiSym)}`)
          if (res.ok) {
            const raw = await res.json()
            const y = parseYahooChartPrice(raw)
            if (y != null) {
              p = y
              src = 'yahoo'
            }
          }
        } catch {
          /* ignore */
        }
      }

      if (cancelled || p == null) return
      setState({ price: p, updatedAt: Date.now(), source: src })
    }

    void tick()
    const id = window.setInterval(tick, 4_000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [symbol])

  return state
}
