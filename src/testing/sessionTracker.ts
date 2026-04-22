import type { ScoredSignal } from '../domain/models'

export interface SessionTradeRecord {
  symbol: string
  strategy: string
  entry: number
  stop: number
  targets: number[]
  timestamp: number
  isAPlus?: boolean
  hitTarget1?: boolean
  hitStop?: boolean
}

export const sessionTrades: SessionTradeRecord[] = []

export function recordTrade(signal: ScoredSignal, isAPlus?: boolean): void {
  sessionTrades.push({
    symbol: signal.symbol,
    strategy: signal.strategy,
    entry: signal.riskReward.entry,
    stop: signal.riskReward.stop,
    targets: signal.riskReward.targets,
    timestamp: Date.now(),
    isAPlus: isAPlus ?? true,
  })
}
