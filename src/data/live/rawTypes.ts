export interface AlphaVantageGlobalQuoteResponse {
  'Global Quote'?: {
    '01. symbol': string
    '05. price': string
    '06. volume': string
    '08. previous close': string
  }
}

export interface FinnhubQuoteResponse {
  c?: number // current
  h?: number // high
  l?: number // low
  o?: number // open
  pc?: number // previous close
  t?: number // timestamp
  v?: number // volume (قد لا تكون متوفرة دائماً في quote)
}

export interface AlphaVantageNewsItem {
  title: string
  summary: string
  url: string
  ticker?: string
  time_published: string
}

export interface AlphaVantageNewsResponse {
  feed?: AlphaVantageNewsItem[]
}

export interface FinnhubNewsItem {
  category?: string
  datetime?: number
  headline?: string
  id?: number
  summary?: string
  symbol?: string
}

