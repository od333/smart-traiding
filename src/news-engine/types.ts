export type NewsSentiment = 'bullish' | 'bearish' | 'neutral'
export type NewsImpactLevel = 'high' | 'medium' | 'low'
export type NewsDetectedCategory =
  | 'earnings'
  | 'guidance'
  | 'analyst action'
  | 'macro'
  | 'AI'
  | 'regulation'
  | 'lawsuit'
  | 'product launch'
  | 'acquisition'
  | 'market-wide'
  | 'other'

export type AlertPriority = 'عاجل جدًا' | 'مهم' | 'متابعة'

export type NormalizedNewsItem = {
  id: string
  source: string
  title: string
  summary: string
  url: string
  publishedAt: Date
  symbol: string
  rawCategory: string
  detectedCategory: NewsDetectedCategory
  sentiment: NewsSentiment
  impactScore: number
  impactLevel: NewsImpactLevel
  urgencyScore: number
  dedupeHash: string
  sentToTelegram: boolean
  createdAt: Date
  arabicSummary: string
  actionNote: string
}

export type PollResult = {
  fetched: number
  kept: number
  duplicates: number
  sent: number
  failedSends: number
}
