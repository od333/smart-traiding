/* eslint-disable react-hooks/set-state-in-effect -- مزامنة شموع المحرك، وقت التحديث، وإعادة ضبط الإعداد عند تغيير الرمز */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEngineSnapshot } from './useEngineSnapshot'
import { useMarketSession } from './useMarketSession'
import { useSymbolQuote } from './useSymbolQuote'
import { buildAllTerminalStockSetups } from '../terminal/stockSetupEngine'
import { buildTerminalOptionsSetup } from '../terminal/optionsSetupEngine'
import type { TerminalStockSetup } from '../terminal/stockSetupEngine'
import type { TerminalOptionsSetup } from '../terminal/optionsSetupEngine'
import { fetchLiveCandles } from '../services/candleService'
import type { Candle } from '../services/candleService'

export type TerminalBasePath = '/stocks' | '/options'

export function useTradingTerminalState(
  symbols: readonly string[],
  basePath: TerminalBasePath,
  routeSymbol: string | undefined,
) {
  const navigate = useNavigate()
  const { snapshot, loading, error } = useEngineSnapshot()
  const symbolList = symbols as readonly string[]

  const normalize = (s: string | undefined): string | null => {
    if (s === undefined || s === '') return null
    const u = s.trim().toUpperCase()
    return symbolList.includes(u) ? u : null
  }

  const fromRoute = normalize(routeSymbol)
  const routeInvalid = Boolean(
    routeSymbol !== undefined && routeSymbol !== '' && fromRoute === null,
  )
  const selectedSymbol = fromRoute ?? symbolList[0]!

  const liveSession = useMarketSession()
  const { price: polledPrice, updatedAt: quoteUpdatedAt, source: quoteSource } =
    useSymbolQuote(selectedSymbol)

  const [candles60BySymbol, setCandles60BySymbol] = useState<Record<string, Candle[] | null>>({})
  const [dailyBySymbol, setDailyBySymbol] = useState<Record<string, Candle[] | null>>({})
  const [lastRefreshAt, setLastRefreshAt] = useState(0)
  const [selectedSetupId, setSelectedSetupId] = useState<string | null>(null)

  useEffect(() => {
    setLastRefreshAt(Date.now())
  }, [])

  useEffect(() => {
    if (snapshot) setLastRefreshAt(Date.now())
  }, [snapshot])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const c60: Record<string, Candle[] | null> = {}
      const d: Record<string, Candle[] | null> = {}
      for (const s of symbolList) {
        try {
          c60[s] = await fetchLiveCandles(s, '60')
        } catch {
          c60[s] = null
        }
        try {
          d[s] = await fetchLiveCandles(s, 'D')
        } catch {
          d[s] = null
        }
      }
      if (!cancelled) {
        setCandles60BySymbol(c60)
        setDailyBySymbol(d)
      }
    }
    void load()
    const id = window.setInterval(load, 120_000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [symbolList])

  const stockSetupsAll = useMemo(() => {
    if (!snapshot) return []
    return buildAllTerminalStockSetups(
      snapshot.signals,
      snapshot.priceSnapshots,
      candles60BySymbol,
    )
  }, [snapshot, candles60BySymbol])

  const stockSetups = useMemo(
    () => stockSetupsAll.filter((x) => symbolList.includes(x.symbol)),
    [stockSetupsAll, symbolList],
  )

  const optionSuggestions = snapshot?.optionSuggestions ?? []

  const optionsBySymbol = useMemo((): Record<string, TerminalOptionsSetup> => {
    const out: Record<string, TerminalOptionsSetup> = {}
    for (const s of symbolList) {
      if (!snapshot) {
        out[s] = buildTerminalOptionsSetup(s, null, 0)
        continue
      }
      const snap = snapshot.priceSnapshots.find((p) => p.symbol === s)
      const px =
        snap && Number.isFinite(snap.lastPrice) && snap.lastPrice > 0 ? snap.lastPrice : 0
      out[s] = buildTerminalOptionsSetup(s, dailyBySymbol[s] ?? null, px)
    }
    return out
  }, [snapshot, dailyBySymbol, symbolList])

  const setupsForSymbol = stockSetups.filter((x) => x.symbol === selectedSymbol)
  const activeSetup: TerminalStockSetup | null =
    setupsForSymbol.find((x) => x.id === selectedSetupId) ?? setupsForSymbol[0] ?? null

  useEffect(() => {
    setSelectedSetupId(null)
  }, [selectedSymbol])

  const chartExecutionSetup = useMemo(() => {
    if (!activeSetup) return null
    const mid = (activeSetup.entryMin + activeSetup.entryMax) / 2
    return {
      direction: activeSetup.direction,
      entry: mid,
      stop: activeSetup.stop,
      targets: [...activeSetup.targets],
      analysisAr: activeSetup.rationaleAr,
    }
  }, [activeSetup])

  const selectedPriceSnapshot =
    snapshot?.priceSnapshots.find((p) => p.symbol === selectedSymbol) ?? null
  const chartLivePrice =
    polledPrice ??
    (selectedPriceSnapshot &&
    Number.isFinite(selectedPriceSnapshot.lastPrice) &&
    selectedPriceSnapshot.lastPrice > 0
      ? selectedPriceSnapshot.lastPrice
      : null)

  const dataMode = snapshot?.dataMode ?? 'MOCK'
  const sessionLabel =
    liveSession === 'OPEN'
      ? 'جلسة مفتوحة (9:30–16:00 نيويورك)'
      : liveSession === 'CLOSED'
        ? 'جلسة مغلقة'
        : 'ما قبل الافتتاح (Pre-Market)'

  const goToSymbol = (s: string) => {
    navigate(`${basePath}/${s}`)
  }

  return {
    routeInvalid,
    snapshot,
    loading,
    error,
    selectedSymbol,
    liveSession,
    quoteUpdatedAt,
    quoteSource,
    lastRefreshAt,
    stockSetups,
    optionSuggestions,
    optionsBySymbol,
    activeSetup,
    chartExecutionSetup,
    chartLivePrice,
    dataMode,
    sessionLabel,
    selectedSetupId,
    setSelectedSetupId,
    goToSymbol,
    basePath,
    defaultSymbol: symbolList[0]!,
  }
}
