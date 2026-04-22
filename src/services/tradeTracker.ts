import type { ScoredSignal } from '../domain/models'
import type { TerminalStockSetup } from '../terminal/stockSetupEngine'
import type { TerminalOptionsSetup } from '../terminal/optionsSetupEngine'

export type TrackedDirection = 'LONG' | 'SHORT'

export type TradeKind = 'stock' | 'options'

export type Trade = {
  symbol: string
  strategy: string
  direction: TrackedDirection
  entry: number
  stop: number
  targets: number[]
  timestamp: number
  status?: 'WIN' | 'LOSS' | 'OPEN'
  result?: number
  kind: TradeKind
  optionsBias?: 'CALL' | 'PUT'
  setupCategoryAr?: string
}

const trades: Trade[] = []
let lastReportDateKey: string | null = null

function getTodayKey(): string {
  const now = new Date()
  const ny = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const y = ny.getFullYear()
  const m = String(ny.getMonth() + 1).padStart(2, '0')
  const d = String(ny.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addTrade(signal: ScoredSignal): void {
  const direction: TrackedDirection = signal.direction === 'long' ? 'LONG' : 'SHORT'
  trades.push({
    symbol: signal.symbol,
    strategy: signal.strategyName ?? signal.strategy,
    direction,
    entry: signal.riskReward.entry,
    stop: signal.riskReward.stop,
    targets: [...signal.riskReward.targets],
    timestamp: Date.now(),
    status: 'OPEN',
    kind: 'stock',
  })
}

export function addTerminalStockTrade(setup: TerminalStockSetup): void {
  const direction: TrackedDirection = setup.direction === 'long' ? 'LONG' : 'SHORT'
  const entry = (setup.entryMin + setup.entryMax) / 2
  trades.push({
    symbol: setup.symbol,
    strategy: setup.setupTypeAr,
    direction,
    entry,
    stop: setup.stop,
    targets: [...setup.targets],
    timestamp: Date.now(),
    status: 'OPEN',
    kind: 'stock',
    setupCategoryAr: setup.setupTypeAr,
  })
}

export function addTerminalOptionsTrade(setup: TerminalOptionsSetup): void {
  trades.push({
    symbol: setup.symbol,
    strategy: setup.setupTypeAr,
    direction: setup.bias === 'PUT' ? 'SHORT' : 'LONG',
    entry: 0,
    stop: 0,
    targets: [],
    timestamp: Date.now(),
    status: 'OPEN',
    kind: 'options',
    optionsBias: setup.bias === 'PUT' ? 'PUT' : 'CALL',
    setupCategoryAr: setup.setupTypeAr,
  })
}

export function updateTradeOutcome(trade: Trade, currentPrice: number): Trade {
  if (trade.kind === 'options') {
    return trade
  }
  const { entry, stop, targets, direction } = trade
  const primaryTarget = targets[0]

  if (!primaryTarget || !Number.isFinite(currentPrice)) {
    return trade
  }

  const isLong = direction === 'LONG'
  const hitTarget = isLong ? currentPrice >= primaryTarget : currentPrice <= primaryTarget
  const hitStop = isLong ? currentPrice <= stop : currentPrice >= stop

  let status: Trade['status'] = trade.status ?? 'OPEN'
  let result = trade.result

  if (hitTarget) {
    status = 'WIN'
  } else if (hitStop) {
    status = 'LOSS'
  } else {
    status = 'OPEN'
  }

  if (status !== 'OPEN' && entry > 0) {
    const move = isLong ? currentPrice - entry : entry - currentPrice
    result = (move / entry) * 100
  }

  trade.status = status
  trade.result = result
  return trade
}

export function getTodayTrades(): Trade[] {
  const key = getTodayKey()
  return trades.filter((t) => {
    const d = new Date(t.timestamp)
    const ny = new Date(d.toLocaleString('en-US', { timeZone: 'America/New_York' }))
    const y = ny.getFullYear()
    const m = String(ny.getMonth() + 1).padStart(2, '0')
    const day = String(ny.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}` === key
  })
}

export function getLastReportDateKey(): string | null {
  return lastReportDateKey
}

export function markReportSentForToday(): void {
  lastReportDateKey = getTodayKey()
}
