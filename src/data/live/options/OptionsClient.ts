import { optionsDataConfig } from '../../../config/optionsData'
import type { RawOptionsResponse } from './rawTypes'

async function fetchJson<T>(url: string, timeoutMs: number): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

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

export class OptionsClient {
  private baseUrl = optionsDataConfig.baseUrl
  private apiKey = optionsDataConfig.apiKey

  private ensureConfig() {
    if (!this.baseUrl || !this.apiKey) {
      throw new Error('Missing VITE_OPTIONS_API_URL or VITE_OPTIONS_API_KEY')
    }
  }

  async fetchLiveOptionsForSymbol(symbol: string): Promise<RawOptionsResponse> {
    this.ensureConfig()
    const url = `${this.baseUrl}?symbol=${encodeURIComponent(
      symbol,
    )}&apikey=${this.apiKey}`
    return fetchJson<RawOptionsResponse>(url, optionsDataConfig.requestTimeoutMs)
  }

  async fetchLiveOptionsForSymbols(
    symbols: string[],
  ): Promise<Record<string, RawOptionsResponse>> {
    const entries = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const data = await this.fetchLiveOptionsForSymbol(symbol)
          return [symbol, data] as const
        } catch (e) {
          console.warn('[OptionsClient] failed to fetch options for', symbol, e)
          return [symbol, { contracts: [] }] as const
        }
      }),
    )
    return Object.fromEntries(entries)
  }
}

export const optionsClient = new OptionsClient()

