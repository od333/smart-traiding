export type ProviderRawNews = {
  source: string
  title: string
  summary: string
  url: string
  publishedAt: Date
  symbol: string
  rawCategory: string
}

export interface NewsProvider {
  name: string
  fetch(symbols: string[]): Promise<ProviderRawNews[]>
}
