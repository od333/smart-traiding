// Core domain models for the analytical engine (stocks, options, signals, market state)

export type TimeFrame = 'intra' | 'daily' | 'swing'

export type TradeStyle = 'scalp' | 'day' | 'swing'

export type Direction = 'long' | 'short'

export type ConfidenceLevel = 'low' | 'medium' | 'high'

export type SignalStrategyType =
  | 'confirmed_breakout'
  | 'breakout_retest'
  | 'support_bounce'
  | 'trend_continuation'
  | 'failed_breakout'
  | 'opening_range'

export type OptionUsage = 'quick_trade' | 'balanced_trade'

export type MarketMood = 'bullish' | 'bearish' | 'neutral' | 'mixed'

export type NewsTone = 'positive' | 'negative' | 'neutral'

export interface Stock {
  symbol: string
  nameAr: string
  sectorAr: string
  isInWatchlist: boolean
}

export interface OptionContract {
  id: string
  underlyingSymbol: string
  type: 'call' | 'put'
  strike: number
  expiry: string
  liquidityScore: number // 0–1
  spreadQuality: number // 0–1 (كلما ارتفع كان أفضل)
  openInterest: number
  usage: OptionUsage
}

export interface MarketPulse {
  indexName: string
  changePercent: number
  mood: MarketMood
  descriptionAr: string
}

export interface MarketState {
  sessionLabelAr: string
  overallMood: MarketMood
  descriptionAr: string
  indices: MarketPulse[]
}

export interface NewsItem {
  id: string
  symbol: string
  tone: NewsTone
  titleAr: string
  bodyAr: string
}

export interface AnalystOpinion {
  id: string
  symbol: string
  tone: NewsTone
  summaryAr: string
}

export interface PriceSnapshot {
  symbol: string
  lastPrice: number
  vwap: number
  averageVolume: number
  currentVolume: number
  trendScore: number // -1 (هابط بقوة) إلى +1 (صاعد بقوة)
  momentumScore: number // -1 إلى +1
  distanceFromRecentSupportPct: number
  distanceFromRecentResistancePct: number
  isNearOpeningRangeBreak: boolean
  hasStrongNews: boolean
}

export interface SignalRiskReward {
  entry: number
  stop: number
  targets: number[]
  riskRewardRatio: number
}

export interface SignalExplanation {
  titleAr: string
  bodyAr: string
  strengthsAr?: string
  risksAr?: string
  contextAr?: string
}

export interface SignalCandidate {
  id: string
  symbol: string
  direction: Direction
  strategy: SignalStrategyType
  strategyName?: string
  strategySourceBook?: string
  timeFrame: TimeFrame
  tradeStyle: TradeStyle
  riskReward: SignalRiskReward
  baseScore: number // 0–1 من الاستراتيجية نفسها
  confidence: ConfidenceLevel
  explanation: SignalExplanation
}

export interface SignalScoreBreakdown {
  structureScore: number
  momentumScore: number
  volumeScore: number
  marketContextScore: number
  newsScore: number
  personalityFitScore: number
  executionQualityScore: number
  smartMoneyScore: number
  unusualVolume?: boolean
  optionsFlow?: boolean
  finalScore: number
}

export interface ScoredSignal extends SignalCandidate, SignalScoreBreakdown {}

export type TomorrowScenarioType =
  | 'trend_continuation'
  | 'gap_up'
  | 'gap_down'
  | 'range_chop'
  | 'critical_reversal'
  | 'no_trade_zone'

export interface TomorrowScenario {
  symbol: string
  type: TomorrowScenarioType
  confidence: ConfidenceLevel
  reasonAr: string
}

export type StockPersonalityBias =
  | 'breakout_lover'
  | 'reversion_lover'
  | 'momentum_runner'
  | 'gap_player'
  | 'range_choppy'

export interface StrategyPerformance {
  strategy: SignalStrategyType
  winRate: number // 0–1
  avgRiskReward: number
  notesAr: string
}

export interface StockPersonalityProfile {
  symbol: string
  summaryAr: string
  preferredBias: StockPersonalityBias
  bestStrategies: StrategyPerformance[]
  weakStrategies: StrategyPerformance[]
  bestSessionsAr: string
  newsSensitivityAr: string
}

export interface HistoricalSignalRecord {
  id: string
  symbol: string
  openedAt: string
  closedAt?: string
  strategy: SignalStrategyType
  result: 'win' | 'loss' | 'breakeven' | 'open'
  riskRewardAchieved?: number
  notesAr?: string
  entryPrice?: number
  stopLoss?: number
  exitPrice?: number
  targets?: number[]
  successReasonAr?: string
  failureReasonAr?: string
}

export interface AnalyticalHistory {
  symbol: string
  records: HistoricalSignalRecord[]
}

export interface Watchlist {
  id: string
  nameAr: string
  symbols: string[]
}

