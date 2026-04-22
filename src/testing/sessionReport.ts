import { sessionTrades } from './sessionTracker'

export interface SessionReportSummary {
  totalSignals: number
  aPlusCount: number
  strategiesUsed: string[]
  /** ما سنقيسه غدًا */
  target1Hits: number
  stopHits: number
  bestStrategy: string | null
}

export function buildSessionReport(): SessionReportSummary {
  const strategies = new Set(sessionTrades.map((t) => t.strategy))
  const target1Hits = sessionTrades.filter((t) => t.hitTarget1 === true).length
  const stopHits = sessionTrades.filter((t) => t.hitStop === true).length

  const strategyCount: Record<string, number> = {}
  for (const t of sessionTrades) {
    strategyCount[t.strategy] = (strategyCount[t.strategy] ?? 0) + 1
  }
  const bestStrategy =
    Object.keys(strategyCount).length > 0
      ? Object.entries(strategyCount).sort((a, b) => b[1] - a[1])[0][0]
      : null

  return {
    totalSignals: sessionTrades.length,
    aPlusCount: sessionTrades.filter((t) => t.isAPlus === true).length,
    strategiesUsed: Array.from(strategies),
    target1Hits,
    stopHits,
    bestStrategy,
  }
}

/**
 * لتحديث نتيجة صفقة عند معرفة النتيجة لاحقًا (غدًا).
 */
export function updateTradeOutcome(
  index: number,
  outcome: { hitTarget1?: boolean; hitStop?: boolean },
): void {
  const t = sessionTrades[index]
  if (!t) return
  if (outcome.hitTarget1 !== undefined) t.hitTarget1 = outcome.hitTarget1
  if (outcome.hitStop !== undefined) t.hitStop = outcome.hitStop
}
