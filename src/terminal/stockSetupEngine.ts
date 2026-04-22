import type { PriceSnapshot, ScoredSignal } from '../domain/models'
import type { Candle } from '../services/candleService'

export type SetupCategoryAr = 'سوينغ' | 'يومي / داخل اليوم' | 'اختراق' | 'بعد الافتتاح'

export type TerminalSetupState = 'تحت المراقبة' | 'قابلة للتنفيذ' | 'ملغاة'

export type PositionSizeAr = 'حجم صغير' | 'حجم متوسط' | 'حجم كبير'

export type TerminalStockSetup = {
  id: string
  symbol: string
  setupTypeAr: SetupCategoryAr
  strategyKey: string
  direction: 'long' | 'short'
  directionAr: 'شراء' | 'بيع'
  state: TerminalSetupState
  entryMin: number
  entryMax: number
  stop: number
  targets: [number, number, number]
  target1Pct: number
  /** قريب من الهدف 1 (سنتات) — يُفضّل رفع الوقف للدخول */
  nearTarget1TrailRule: boolean
  rr: number
  positionSizeAr: PositionSizeAr
  confidenceAr: string
  rationaleAr: string
  dailyAmountNoteAr: string
  stopLogicAr: string
  signal: ScoredSignal
}

function confidenceToAr(c: string): string {
  if (c === 'high') return 'مرتفع'
  if (c === 'medium') return 'متوسط'
  return 'منخفض'
}

function mapCategory(signal: ScoredSignal): SetupCategoryAr {
  if (signal.strategy === 'opening_range') return 'بعد الافتتاح'
  if (
    signal.strategy === 'confirmed_breakout' ||
    signal.strategy === 'breakout_retest' ||
    signal.strategy === 'failed_breakout'
  ) {
    return 'اختراق'
  }
  if (signal.timeFrame === 'swing' || signal.tradeStyle === 'swing') return 'سوينغ'
  return 'يومي / داخل اليوم'
}

function positionSize(category: SetupCategoryAr): PositionSizeAr {
  if (category === 'سوينغ') return 'حجم كبير'
  if (category === 'يومي / داخل اليوم') return 'حجم صغير'
  return 'حجم متوسط'
}

function stopLogicForCategory(category: SetupCategoryAr): string {
  if (category === 'سوينغ') return 'وقف السوينغ: عند إغلاق شمعة 3 دقائق أسفل منطقة الدخول/الوقف.'
  if (category === 'بعد الافتتاح') return 'بعد الافتتاح: وقف عند كسر شمعة 1 دقيقة أو كسر مباشر للمستوى.'
  return 'وقف حسب الإشارة الأصلية مع احترام مستوى الإبطال.'
}

/** هدف 1 بين 8% و 11% من نقطة وسط الدخول */
function buildTargets(
  direction: 'long' | 'short',
  entryMid: number,
): { targets: [number, number, number]; target1Pct: number } {
  const t1Pct = 0.095
  const t2Pct = 0.13
  const t3Pct = 0.17
  if (direction === 'long') {
    return {
      target1Pct: t1Pct * 100,
      targets: [
        entryMid * (1 + t1Pct),
        entryMid * (1 + t2Pct),
        entryMid * (1 + t3Pct),
      ] as [number, number, number],
    }
  }
  return {
    target1Pct: t1Pct * 100,
    targets: [
      entryMid * (1 - t1Pct),
      entryMid * (1 - t2Pct),
      entryMid * (1 - t3Pct),
    ] as [number, number, number],
  }
}

function applyBreakoutEntryPadding(signal: ScoredSignal, entry: number): number {
  const isBreakout =
    signal.strategy === 'confirmed_breakout' ||
    signal.strategy === 'breakout_retest' ||
    signal.strategy === 'failed_breakout'
  if (!isBreakout) return entry
  if (signal.direction === 'long') return entry + 0.01
  return entry - 0.01
}

function volumeOk(snap: PriceSnapshot): boolean {
  if (snap.averageVolume <= 0) return true
  const r = snap.currentVolume / snap.averageVolume
  return r >= 0.85
}

function isCancelled(
  direction: 'long' | 'short',
  entry: number,
  lastPrice: number,
  candles60: Candle[] | null,
): boolean {
  if (!Number.isFinite(lastPrice) || lastPrice <= 0) return false
  if (direction === 'long') {
    if (lastPrice <= entry * 0.85) return true
    if (!candles60 || candles60.length < 2) return false
    const sorted = [...candles60].sort((a, b) => a.time - b.time)
    const a = sorted[sorted.length - 2]
    const b = sorted[sorted.length - 1]
    if (a && b && a.close < entry && b.close < entry) return true
    return false
  }
  if (lastPrice >= entry * 1.15) return true
  if (!candles60 || candles60.length < 2) return false
  const sorted = [...candles60].sort((a, b) => a.time - b.time)
  const a = sorted[sorted.length - 2]
  const b = sorted[sorted.length - 1]
  if (a && b && a.close > entry && b.close > entry) return true
  return false
}

function nearTarget1(
  direction: 'long' | 'short',
  lastPrice: number,
  t1: number,
): boolean {
  const d = Math.abs(lastPrice - t1)
  if (d > 0.03) return false
  if (direction === 'long') return lastPrice < t1
  return lastPrice > t1
}

function executableRules(
  signal: ScoredSignal,
  snap: PriceSnapshot,
  category: SetupCategoryAr,
): { ok: boolean; reasonAr: string } {
  if (!volumeOk(snap)) {
    return { ok: false, reasonAr: 'سيولة الحالي أقل من المطلوب؛ انتظر تأكيد الحجم.' }
  }
  const rr = signal.riskReward.riskRewardRatio
  if (!Number.isFinite(rr) || rr < 1.1) {
    return { ok: false, reasonAr: 'نسبة عائد/مخاطرة غير مقبولة بعد.' }
  }
  const isBreakoutType = category === 'اختراق'
  const scoreCut = isBreakoutType ? 0.58 : 0.52
  if (signal.finalScore < scoreCut) {
    return { ok: false, reasonAr: 'لم يكتمل تأكيد الاستراتيجية بعد (نتيجة المحرك).' }
  }
  if (signal.confidence === 'low') {
    return { ok: false, reasonAr: 'ثقة منخفضة — إبقاء الفرصة تحت المراقبة فقط.' }
  }
  return { ok: true, reasonAr: 'شروط التنفيذ متوفرة.' }
}

export function buildTerminalStockSetup(
  signal: ScoredSignal,
  snap: PriceSnapshot,
  candles60: Candle[] | null,
): TerminalStockSetup {
  const category = mapCategory(signal)
  const positionSizeAr = positionSize(category)
  const paddedEntry = applyBreakoutEntryPadding(signal, signal.riskReward.entry)
  const spread = Math.max(0.01, paddedEntry * 0.001)
  const entryMin = signal.direction === 'long' ? paddedEntry : paddedEntry - spread
  const entryMax = signal.direction === 'long' ? paddedEntry + spread : paddedEntry
  const entryMid = (entryMin + entryMax) / 2
  const { targets, target1Pct } = buildTargets(signal.direction, entryMid)
  const risk =
    signal.direction === 'long'
      ? entryMid - signal.riskReward.stop
      : signal.riskReward.stop - entryMid
  const reward =
    signal.direction === 'long' ? targets[0] - entryMid : entryMid - targets[0]
  const rr = risk > 0 && reward > 0 ? reward / risk : signal.riskReward.riskRewardRatio

  const lastPrice = snap.lastPrice
  const cancelled = isCancelled(signal.direction, entryMid, lastPrice, candles60)
  const exec = executableRules(signal, snap, category)

  let state: TerminalSetupState
  let rationaleAr: string

  if (cancelled) {
    state = 'ملغاة'
    rationaleAr =
      signal.direction === 'long'
        ? 'إلغاء: هبوط 15% من منطقة الدخول أو إغلاق شمعتين 60م تحت الدخول.'
        : 'إلغاء: صعود 15% ضد الصفقة أو إغلاق شمعتين 60م فوق الدخول.'
  } else if (exec.ok) {
    state = 'قابلة للتنفيذ'
    rationaleAr = exec.reasonAr + ' ' + signal.explanation.bodyAr.slice(0, 120)
  } else {
    state = 'تحت المراقبة'
    rationaleAr = exec.reasonAr
  }

  const trail = nearTarget1(signal.direction, lastPrice, targets[0])

  const dailyNote =
    category === 'يومي / داخل اليوم'
      ? 'يومي: استخدم مبلغ تداول يومي ثابت ومحدد مسبقاً (حجم صغير).'
      : category === 'سوينغ'
        ? 'سوينغ: يسمح بحجم أكبر مع وقف أوسع وفق خطتك.'
        : 'حجم متوسط: التزم بخطة المخاطرة دون مبالغة.'

  return {
    id: `${signal.symbol}-${signal.strategy}-${signal.direction}`,
    symbol: signal.symbol,
    setupTypeAr: category,
    strategyKey: signal.strategyName ?? signal.strategy,
    direction: signal.direction,
    directionAr: signal.direction === 'long' ? 'شراء' : 'بيع',
    state,
    entryMin,
    entryMax,
    stop: signal.riskReward.stop,
    targets,
    target1Pct,
    nearTarget1TrailRule: trail,
    rr,
    positionSizeAr,
    confidenceAr: confidenceToAr(signal.confidence),
    rationaleAr,
    dailyAmountNoteAr: dailyNote,
    stopLogicAr: stopLogicForCategory(category),
    signal,
  }
}

export function buildAllTerminalStockSetups(
  signals: ScoredSignal[],
  snapshots: PriceSnapshot[],
  candles60BySymbol: Record<string, Candle[] | null>,
): TerminalStockSetup[] {
  const bySym = new Map(snapshots.map((p) => [p.symbol, p]))
  const out: TerminalStockSetup[] = []
  for (const s of signals) {
    const snap = bySym.get(s.symbol)
    if (!snap) continue
    out.push(buildTerminalStockSetup(s, snap, candles60BySymbol[s.symbol] ?? null))
  }
  return out.sort((a, b) => b.signal.finalScore - a.signal.finalScore)
}
