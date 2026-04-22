import { evaluateStockSignals } from './signalScoring'
import { selectOptionsForSignal } from './optionsSelector'
import { buildTomorrowScenarios } from './tomorrowScenarios'
import { assessSignalPhilosophy } from './tradingPhilosophyEngine'
import { recordTrade } from '../testing/sessionTracker'
import { sendSignalAlert } from '../services/telegramService'
import type { DataSource, DataSourceMode } from '../data/dataSource'
import type {
  AnalyticalHistory,
  AnalystOpinion,
  MarketState,
  NewsItem,
  OptionContract,
  PriceSnapshot,
  ScoredSignal,
  Stock,
  StockPersonalityProfile,
  TomorrowScenario,
  Watchlist,
} from '../domain/models'
import type { OptionSuggestion } from './optionsSelector'
import { CORE_WATCHLIST } from '../config/watchlist'
import { getMarketSession, type MarketSessionStatus } from '../utils/marketSession'

function buildOptionsFlowBySymbol(
  optionContracts: OptionContract[],
): Record<string, { callVolume: number; largeOrders: number }> {
  const bySymbol: Record<string, { callVolume: number; largeOrders: number }> = {}
  for (const c of optionContracts) {
    if (!bySymbol[c.underlyingSymbol]) {
      bySymbol[c.underlyingSymbol] = { callVolume: 0, largeOrders: 0 }
    }
    if (c.type === 'call') {
      bySymbol[c.underlyingSymbol].callVolume += c.openInterest ?? 0
    }
    if ((c.openInterest ?? 0) > 100) {
      bySymbol[c.underlyingSymbol].largeOrders += 1
    }
  }
  return bySymbol
}

export type EngineSnapshot = {
  market: MarketState
  stocks: Stock[]
  watchlists: Watchlist[]
  signals: ScoredSignal[]
  scenarios: TomorrowScenario[]
  personalities: StockPersonalityProfile[]
  histories: AnalyticalHistory[]
  optionSuggestions: OptionSuggestion[]
  newsItems: NewsItem[]
  analystOpinions: AnalystOpinion[]
  priceSnapshots: PriceSnapshot[]
  marketOpen: boolean
  marketSession: MarketSessionStatus
  /** مصدر بيانات الأسعار: LIVE من Finnhub، MOCK، أو FALLBACK عند فشل live */
  dataMode: DataSourceMode
}

export type BuildEngineSnapshotOptions = {
  /** عند true لا يُستدعى recordTrade ولا sendSignalAlert (للاستخدام من الـ worker) */
  skipAlerts?: boolean
}

export async function buildEngineSnapshot(
  dataSource: DataSource,
  options?: BuildEngineSnapshotOptions,
): Promise<EngineSnapshot> {
  const skipAlerts = options?.skipAlerts === true
  const [
    marketState,
    stocks,
    watchlists,
    priceSnapshots,
    newsItems,
    analystOpinions,
    optionContracts,
    personalities,
    analyticalHistories,
  ] = await Promise.all([
    dataSource.getMarketState(),
    dataSource.getStocks(),
    dataSource.getWatchlists(),
    dataSource.getPriceSnapshots(),
    dataSource.getNews(),
    dataSource.getAnalystOpinions(),
    dataSource.getOptionContracts(),
    dataSource.getPersonalities(),
    dataSource.getAnalyticalHistories(),
  ])

  const dataMode = await dataSource.getDataMode()
  const session = getMarketSession()
  const marketOpen = session === "OPEN"

  if (typeof process !== 'undefined') {
    console.log('Current data mode:', dataMode)
    console.log('Signal source:', dataMode === 'LIVE' ? 'LIVE' : 'MOCK')
    console.log('Price source:', dataMode === 'LIVE' ? 'LIVE' : 'MOCK')
  }

  const optionsFlowBySymbol = buildOptionsFlowBySymbol(optionContracts)
  const signals: ScoredSignal[] = []

  for (const snap of priceSnapshots) {
    if (!CORE_WATCHLIST.includes(snap.symbol)) continue
    const personality = personalities.find((p) => p.symbol === snap.symbol)
    const stockSignals = evaluateStockSignals(snap, {
      market: marketState,
      news: newsItems,
      opinions: analystOpinions,
      personality,
      optionsFlowBySymbol,
    })
    signals.push(...stockSignals)
  }

  signals.sort((a, b) => b.finalScore - a.finalScore)

  const scenarios = buildTomorrowScenarios(priceSnapshots, marketState)

  const optionSuggestions: OptionSuggestion[] = []
  for (const signal of signals) {
    const contracts = optionContracts.filter(
      (c) => c.underlyingSymbol === signal.symbol,
    )
    if (!contracts.length) continue
    optionSuggestions.push(...selectOptionsForSignal(signal, contracts))
  }

  if (!marketOpen) {
    return {
      market: marketState,
      stocks,
      watchlists,
      signals,
      scenarios,
      personalities,
      histories: analyticalHistories,
      optionSuggestions,
      newsItems,
      analystOpinions,
      priceSnapshots,
      marketOpen: false,
      marketSession: session,
      dataMode,
    }
  }

  // عند ظهور إشارة A+: تسجيل الصفقة وإرسال تنبيه تيليجرام (ما لم skipAlerts للـ worker)
  // لا نرسل إشارات مبنية على mock أو fallback
  if (!skipAlerts && dataMode === 'LIVE') {
    for (const signal of signals) {
      const personality = personalities.find((p) => p.symbol === signal.symbol)
      const optionSuggestion = optionSuggestions.find(
        (o) => o.contract.underlyingSymbol === signal.symbol,
      ) ?? null
      const assessment = assessSignalPhilosophy({
        signal,
        market: marketState,
        personality,
        optionSuggestion,
      })
      if (assessment.isAPlus) {
        recordTrade(signal, true)
        sendSignalAlert(signal, { setupQuality: assessment.setupQuality })
      }
    }
  }
  if (!skipAlerts && dataMode !== 'LIVE' && signals.length > 0 && typeof process !== 'undefined') {
    console.log('Signal skipped: using mock/fallback data')
  }

  return {
    market: marketState,
    stocks,
    watchlists,
    signals,
    scenarios,
    personalities,
    histories: analyticalHistories,
    optionSuggestions,
    newsItems,
    analystOpinions,
    priceSnapshots,
    marketOpen: true,
    marketSession: session,
    dataMode,
  }
}

