import { marketDataConfig } from '../config/marketData'
import { providerSymbolForMarket } from '../config/terminalSymbols'

export type Candle = {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  synthetic?: boolean
}

export type CandleResolution = '1' | '5' | '15' | '60' | 'D'

function toUnixSeconds(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 1000)
}

function mapYahooInterval(resolution: CandleResolution): { range: string; interval: string } {
  if (resolution === '1') return { range: '1d', interval: '1m' }
  if (resolution === '5') return { range: '5d', interval: '5m' }
  if (resolution === '15') return { range: '5d', interval: '15m' }
  if (resolution === '60') return { range: '1mo', interval: '60m' }
  return { range: '6mo', interval: '1d' }
}

async function fetchFromYahoo(symbol: string, resolution: CandleResolution): Promise<Candle[] | null> {
  const { range, interval } = mapYahooInterval(resolution)
  const url = typeof window !== 'undefined'
    ? `/api/yahoo/candle?symbol=${encodeURIComponent(symbol)}&range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}`
    : `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}&includePrePost=true`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Yahoo HTTP ${res.status}`)
  }
  const raw = (await res.json()) as {
    chart?: {
      result?: Array<{
        timestamp?: number[]
        indicators?: {
          quote?: Array<{
            open?: Array<number | null>
            high?: Array<number | null>
            low?: Array<number | null>
            close?: Array<number | null>
            volume?: Array<number | null>
          }>
        }
      }>
    }
  }
  const result = raw.chart?.result?.[0]
  const ts = result?.timestamp ?? []
  const q = result?.indicators?.quote?.[0]
  const open = q?.open ?? []
  const high = q?.high ?? []
  const low = q?.low ?? []
  const close = q?.close ?? []
  const volume = q?.volume ?? []
  const candles: Candle[] = []
  for (let i = 0; i < ts.length; i += 1) {
    const o = open[i]
    const h = high[i]
    const l = low[i]
    const c = close[i]
    const v = volume[i]
    if (
      !Number.isFinite(o as number) ||
      !Number.isFinite(h as number) ||
      !Number.isFinite(l as number) ||
      !Number.isFinite(c as number)
    ) {
      continue
    }
    candles.push({
      time: ts[i],
      open: Number(o),
      high: Number(h),
      low: Number(l),
      close: Number(c),
      volume: Number.isFinite(v as number) ? Number(v) : 0,
    })
  }
  return candles.length ? candles : null
}

async function fetchFromAlphaVantage(symbol: string): Promise<Candle[] | null> {
  const key = marketDataConfig.apiKey
  if (!key) return null
  const url =
    `${marketDataConfig.baseUrl}?function=TIME_SERIES_INTRADAY` +
    `&symbol=${encodeURIComponent(symbol)}&interval=5min&outputsize=compact&apikey=${encodeURIComponent(key)}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`AlphaVantage HTTP ${res.status}`)
  }
  const raw = (await res.json()) as Record<string, unknown>
  const series = raw['Time Series (5min)'] as Record<string, Record<string, string>> | undefined
  if (!series) {
    throw new Error('AlphaVantage: missing OHLC series')
  }
  const candles = Object.entries(series)
    .map(([ts, values]) => ({
      time: toUnixSeconds(ts),
      open: Number(values['1. open']),
      high: Number(values['2. high']),
      low: Number(values['3. low']),
      close: Number(values['4. close']),
      volume: Number(values['5. volume']),
    }))
    .filter((c) => Number.isFinite(c.open) && Number.isFinite(c.close))
    .sort((a, b) => a.time - b.time)
  return candles.length ? candles : null
}

async function fetchFromFinnhub(symbol: string, resolution: CandleResolution): Promise<Candle[] | null> {
  const key = marketDataConfig.apiKey
  if (!key) return null
  const nowSec = Math.floor(Date.now() / 1000)
  const fromSec =
    resolution === '1'
      ? nowSec - 60 * 60 * 24
      : resolution === '5'
        ? nowSec - 60 * 60 * 24 * 3
        : resolution === '15'
          ? nowSec - 60 * 60 * 24 * 7
          : resolution === '60'
            ? nowSec - 60 * 60 * 24 * 30
            : nowSec - 60 * 60 * 24 * 180
  const finnhubResolution = resolution === 'D' ? 'D' : resolution
  const url = typeof window !== 'undefined'
    ? `/api/finnhub/candle?symbol=${encodeURIComponent(symbol)}&resolution=${encodeURIComponent(finnhubResolution)}&from=${fromSec}&to=${nowSec}`
    : `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=${encodeURIComponent(finnhubResolution)}&from=${fromSec}&to=${nowSec}&token=${encodeURIComponent(key)}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Finnhub HTTP ${res.status}`)
  }
  const raw = (await res.json()) as {
    s?: string
    t?: number[]
    o?: number[]
    h?: number[]
    l?: number[]
    c?: number[]
    v?: number[]
  }
  if (raw.s === 'no_data') {
    const dailyFrom = nowSec - 60 * 60 * 24 * 120
    const dailyUrl = typeof window !== 'undefined'
      ? `/api/finnhub/candle?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${dailyFrom}&to=${nowSec}`
      : `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${dailyFrom}&to=${nowSec}&token=${encodeURIComponent(key)}`
    const dailyRes = await fetch(dailyUrl)
    if (!dailyRes.ok) {
      throw new Error(`Finnhub daily HTTP ${dailyRes.status}`)
    }
    const dailyRaw = (await dailyRes.json()) as typeof raw
    if (
      dailyRaw.s !== 'ok' ||
      !dailyRaw.t ||
      !dailyRaw.o ||
      !dailyRaw.h ||
      !dailyRaw.l ||
      !dailyRaw.c ||
      !dailyRaw.v
    ) {
      throw new Error(`Finnhub candle unavailable (${dailyRaw.s ?? 'unknown'})`)
    }
    const dailyCandles: Candle[] = dailyRaw.t.map((t, i) => ({
      time: t,
      open: dailyRaw.o![i],
      high: dailyRaw.h![i],
      low: dailyRaw.l![i],
      close: dailyRaw.c![i],
      volume: dailyRaw.v![i],
    }))
    return dailyCandles.length ? dailyCandles : null
  }
  if (raw.s !== 'ok' || !raw.t || !raw.o || !raw.h || !raw.l || !raw.c || !raw.v) {
    throw new Error(`Finnhub candle unavailable (${raw.s ?? 'unknown'})`)
  }
  const candles: Candle[] = raw.t.map((t, i) => ({
    time: t,
    open: raw.o![i],
    high: raw.h![i],
    low: raw.l![i],
    close: raw.c![i],
    volume: raw.v![i],
  }))
  return candles.length ? candles : null
}

export async function fetchLiveCandles(symbol: string, resolution: CandleResolution = '5'): Promise<Candle[] | null> {
  const apiSymbol = providerSymbolForMarket(symbol)
  // الشارت يحتاج شموع حقيقية حتى لو مصدر quote الرئيسي تعطل.
  try {
    return await fetchFromYahoo(apiSymbol, resolution)
  } catch (e) {
    console.warn('[candleService] yahoo candle failed, trying finnhub/alpha', e)
  }
  if (!marketDataConfig.apiKey) return null
  try {
    return await fetchFromFinnhub(apiSymbol, resolution)
  } catch (e) {
    console.warn('[candleService] finnhub candle failed, trying alpha intraday', e)
  }
  try {
    return await fetchFromAlphaVantage(apiSymbol)
  } catch (e) {
    console.warn('[candleService] alpha intraday failed', e)
    return null
  }
}

