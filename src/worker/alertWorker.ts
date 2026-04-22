/**
 * عامل التنبيهات — إرسال تلقائي إلى Telegram لفرص الأسهم والأوبشن (محطة NVDA/AMZN/GOOGL).
 * يعمل في Node فقط؛ لا يعتمد على المتصفح.
 */

import { createDataSource } from '../data/dataSource'
import { buildEngineSnapshot } from '../engine'
import { fetchLiveCandles } from '../services/candleService'
import { OPTIONS_TERMINAL_SYMBOLS, STOCK_TERMINAL_SYMBOLS } from '../config/terminalSymbols'
import { buildAllTerminalStockSetups } from '../terminal/stockSetupEngine'
import { buildTerminalOptionsSetup } from '../terminal/optionsSetupEngine'
import { sendAutoStockTerminalAlert, sendAutoOptionsTerminalAlert } from '../services/telegramService'
import {
  addTerminalStockTrade,
  addTerminalOptionsTrade,
  getTodayTrades,
  getLastReportDateKey,
  markReportSentForToday,
  updateTradeOutcome,
} from '../services/tradeTracker'
import { generateDailyReport, sendDailyReportToTelegram } from '../services/dailyReport'
import { getMarketSession } from '../utils/marketSession'
import { marketDataConfig } from '../config/marketData'
import type { TerminalStockSetup } from '../terminal/stockSetupEngine'
import type { TerminalOptionsSetup } from '../terminal/optionsSetupEngine'
import { pickOptionSuggestionForBias, pickOptionSuggestionForSignal } from '../terminal/optionSuggestionPick'

function isTelegramEnabled(): boolean {
  if (typeof process !== 'undefined') {
    const token = process.env.TELEGRAM_BOT_TOKEN ?? process.env.VITE_TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID ?? process.env.VITE_TELEGRAM_CHAT_ID
    return Boolean(token && chatId)
  }
  return false
}

const INTERVAL_MS = 90 * 1000
const STOCK_COOLDOWN_MS = 30 * 60 * 1000
const OPTIONS_COOLDOWN_MS = 45 * 60 * 1000

const lastStockSent = new Map<string, number>()
const lastOptionsSent = new Map<string, number>()

function stockSymbolsForWorker(): string[] {
  return [...STOCK_TERMINAL_SYMBOLS]
}

function optionsSymbolsForWorker(): string[] {
  return [...OPTIONS_TERMINAL_SYMBOLS]
}

function stockDedupKey(setup: TerminalStockSetup): string {
  return `${setup.symbol}|${setup.setupTypeAr}|${setup.direction}|${setup.strategyKey}`
}

function optionsDedupKey(setup: TerminalOptionsSetup): string {
  return `${setup.symbol}|${setup.id}`
}

async function handleMarketOpen(): Promise<void> {
  const dataSource = createDataSource()
  const snapshot = await buildEngineSnapshot(dataSource, { skipAlerts: true })

  if (snapshot.dataMode !== 'LIVE') {
    if (typeof process !== 'undefined') {
      console.log('[AlertWorker] Skip alerts: dataMode is not LIVE')
    }
    return
  }

  if (!snapshot.marketOpen) {
    return
  }

  const syms = optionsSymbolsForWorker()
  const candles60BySymbol: Record<string, Awaited<ReturnType<typeof fetchLiveCandles>>> = {}
  const dailyBySymbol: Record<string, Awaited<ReturnType<typeof fetchLiveCandles>>> = {}

  await Promise.all(
    syms.map(async (sym) => {
      try {
        candles60BySymbol[sym] = await fetchLiveCandles(sym, '60')
      } catch {
        candles60BySymbol[sym] = null
      }
      try {
        dailyBySymbol[sym] = await fetchLiveCandles(sym, 'D')
      } catch {
        dailyBySymbol[sym] = null
      }
    }),
  )

  const signals = snapshot.signals.filter((s) => stockSymbolsForWorker().includes(s.symbol))
  const stockSetups = buildAllTerminalStockSetups(signals, snapshot.priceSnapshots, candles60BySymbol)

  const now = Date.now()
  for (const setup of stockSetups) {
    if (setup.state !== 'قابلة للتنفيذ') continue
    const key = stockDedupKey(setup)
    const prev = lastStockSent.get(key)
    if (prev != null && now - prev < STOCK_COOLDOWN_MS) continue

    const optStock = pickOptionSuggestionForSignal(snapshot.optionSuggestions, setup.signal.id)
    const res = await sendAutoStockTerminalAlert(setup, optStock)
    if (res.ok) {
      addTerminalStockTrade(setup)
      lastStockSent.set(key, now)
      console.log('[AlertWorker] Stock Telegram sent:', setup.symbol, setup.setupTypeAr)
    }
  }

  for (const sym of syms) {
    const snap = snapshot.priceSnapshots.find((p) => p.symbol === sym)
    const lastPrice =
      snap && Number.isFinite(snap.lastPrice) && snap.lastPrice > 0 ? snap.lastPrice : 0
    const optSetup = buildTerminalOptionsSetup(sym, dailyBySymbol[sym] ?? null, lastPrice)
    if (!optSetup.executable || optSetup.bias === 'NONE') continue

    const okey = optionsDedupKey(optSetup)
    const prevO = lastOptionsSent.get(okey)
    if (prevO != null && now - prevO < OPTIONS_COOLDOWN_MS) continue

    const optPick = pickOptionSuggestionForBias(snapshot.optionSuggestions, sym, optSetup.bias)
    const res = await sendAutoOptionsTerminalAlert(optSetup, optPick)
    if (res.ok) {
      addTerminalOptionsTrade(optSetup)
      lastOptionsSent.set(okey, now)
      console.log('[AlertWorker] Options Telegram sent:', sym, optSetup.setupTypeAr)
    }
  }
}

async function handleMarketClosed(): Promise<void> {
  const todayKeyFromTracker = getLastReportDateKey()
  const trades = getTodayTrades()
  if (!trades.length) {
    return
  }

  const now = new Date()
  const ny = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const todayKey = `${ny.getFullYear()}-${String(ny.getMonth() + 1).padStart(2, '0')}-${String(
    ny.getDate(),
  ).padStart(2, '0')}`

  if (todayKeyFromTracker === todayKey) {
    return
  }

  const dataSource = createDataSource()
  const snapshot = await buildEngineSnapshot(dataSource, { skipAlerts: true })
  const lastPricesBySymbol = new Map<string, number>()
  for (const p of snapshot.priceSnapshots) {
    if (!Number.isFinite(p.lastPrice)) continue
    lastPricesBySymbol.set(p.symbol, p.lastPrice)
  }

  for (const t of trades) {
    const currentPrice = lastPricesBySymbol.get(t.symbol)
    if (currentPrice != null) {
      updateTradeOutcome(t, currentPrice)
    }
  }

    const report = generateDailyReport(trades)
    await sendDailyReportToTelegram(report, trades)
  markReportSentForToday()
}

async function tick(): Promise<void> {
  const session = getMarketSession()

  if (session === 'OPEN') {
    await handleMarketOpen()
    return
  }

  if (session === 'CLOSED') {
    await handleMarketClosed()
  }
}

export function runAlertWorker(): void {
  const run = (): void => {
    tick().catch((err) => {
      console.error('[AlertWorker] tick error', err)
    })
  }

  const dataSourceLabel = marketDataConfig.mode === 'live' ? 'LIVE' : 'MOCK'
  const telegramLabel = isTelegramEnabled() ? 'ENABLED' : 'DISABLED'

  console.log('-------------------------------------------')
  console.log('Alert worker — أسهم: NVDA/AMZN/GOOGL | أوبشن: +SPX')
  console.log('Data source: ' + dataSourceLabel)
  console.log('Telegram: ' + telegramLabel)
  console.log('Interval: ' + INTERVAL_MS / 1000 + 's')
  console.log('-------------------------------------------')

  run()
  setInterval(run, INTERVAL_MS)
}
