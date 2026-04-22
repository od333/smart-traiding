import type { ScoredSignal } from '../domain/models'
import FakeChart from './FakeChart'
import { CandlestickSignalChart } from './CandlestickSignalChart'

type SafeSignalChartProps = {
  symbol: string
  signal: ScoredSignal | null | undefined
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function SafeSignalChart({ symbol, signal }: SafeSignalChartProps) {
  // حراسة صارمة للبيانات قبل استخدام شارت الشموع
  if (!symbol || !signal || !signal.riskReward) {
    return <FakeChart symbol={symbol} signal={signal ?? null} />
  }

  const { entry, stop, targets } = signal.riskReward

  const hasValidEntry = isFiniteNumber(entry)
  const hasValidStop = isFiniteNumber(stop)
  const hasValidTargets =
    Array.isArray(targets) && targets.every((t) => isFiniteNumber(t))

  if (!hasValidEntry || !hasValidStop || !hasValidTargets) {
    return <FakeChart symbol={symbol} signal={signal} />
  }

  return <CandlestickSignalChart symbol={symbol} signal={signal} />
}

