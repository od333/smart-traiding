import type { Candle } from '../services/candleService'

const EMA_PERIOD = 50

export type OptionsBias = 'CALL' | 'PUT' | 'NONE'

export type TerminalOptionsSetup = {
  id: string
  symbol: string
  bias: OptionsBias
  contractTypeAr: 'كول' | 'بوت' | 'لا إعداد'
  setupTypeAr: string
  entryZoneAr: string
  invalidationAr: string
  targetAr: string
  confidenceAr: string
  rationaleAr: string
  /** جاهز لإرسال تيليجرام تلقائي */
  executable: boolean
}

function emaSeries(closes: number[], period: number): number[] {
  const out: number[] = new Array(closes.length).fill(NaN)
  if (closes.length < period) return out
  const k = 2 / (period + 1)
  let sum = 0
  for (let i = 0; i < period; i += 1) sum += closes[i]
  let ema = sum / period
  out[period - 1] = ema
  for (let i = period; i < closes.length; i += 1) {
    ema = closes[i] * k + ema * (1 - k)
    out[i] = ema
  }
  return out
}

/** رفض EMA50 من الأسفل → بوت */
function detectEma50RejectionPut(
  candles: Candle[],
  ema50: number[],
): { ok: boolean; detail: string } {
  const n = Math.min(candles.length, ema50.length)
  if (n < EMA_PERIOD + 5) return { ok: false, detail: 'بيانات يومية غير كافية لـ EMA50.' }
  const lastIdx = n - 1
  const lastClose = candles[lastIdx].close
  const lastE = ema50[lastIdx]
  if (!Number.isFinite(lastE) || lastClose >= lastE) {
    return { ok: false, detail: 'السعر لم يكسر EMA50 هبوطاً بشكل حاسم.' }
  }

  let retest = false
  for (let i = Math.max(EMA_PERIOD, lastIdx - 18); i < lastIdx; i += 1) {
    const e = ema50[i]
    const c = candles[i]
    if (!Number.isFinite(e)) continue
    const touched = c.high >= e * 0.997 && c.high <= e * 1.025
    const rejected = c.close < e
    if (touched && rejected) {
      retest = true
      break
    }
  }
  if (!retest) return { ok: false, detail: 'لا يوجد اختبار واضح ثم رفض لـ EMA50.' }

  let reclaim = false
  for (let j = lastIdx - 2; j <= lastIdx; j += 1) {
    if (j < 0) continue
    if (candles[j].close > (ema50[j] ?? 0) * 1.002) {
      reclaim = true
      break
    }
  }
  if (reclaim) return { ok: false, detail: 'يوجد إغلاق فوق EMA50 — نمط الرفض غير مكتمل.' }

  return { ok: true, detail: 'كسر تحت EMA50 ثم إعادة اختبار ورفض — ميل هبوطي لعقود Put.' }
}

function detectSupportBounceCall(
  candles: Candle[],
  ema50: number[],
): { ok: boolean; detail: string } {
  const n = candles.length
  if (n < 15) return { ok: false, detail: '' }
  const lastIdx = n - 1
  const e = ema50[lastIdx]
  const c = candles[lastIdx]
  if (!Number.isFinite(e)) return { ok: false, detail: '' }
  const near = c.low <= e * 1.02 && c.low >= e * 0.97
  const bounce = c.close > e && c.close > c.open
  if (near && bounce) {
    return { ok: true, detail: 'ارتداد من منطقة EMA50 مع إغلاق إيجابي — ميل لعقود Call.' }
  }
  return { ok: false, detail: '' }
}

function detectBreakoutContinuationCall(
  candles: Candle[],
  ema50: number[],
): { ok: boolean; detail: string } {
  const n = candles.length
  if (n < 12) return { ok: false, detail: '' }
  const lastIdx = n - 1
  const prev = candles[lastIdx - 1]
  const cur = candles[lastIdx]
  const e = ema50[lastIdx]
  if (!Number.isFinite(e)) return { ok: false, detail: '' }
  const above = cur.close > e && prev.close > e * 0.998
  const hh = cur.close > prev.high * 1.002
  if (above && hh) {
    return { ok: true, detail: 'استمرار فوق EMA50 مع قمة أعلى — متابعة صاعدة لـ Call.' }
  }
  return { ok: false, detail: '' }
}

function detectFailedBreakoutPut(
  candles: Candle[],
  ema50: number[],
): { ok: boolean; detail: string } {
  const n = candles.length
  if (n < 8) return { ok: false, detail: '' }
  const lastIdx = n - 1
  const prev = candles[lastIdx - 1]
  const cur = candles[lastIdx]
  const e = ema50[lastIdx]
  if (!Number.isFinite(e)) return { ok: false, detail: '' }
  const fake =
    prev.high > e * 1.01 &&
    prev.close < e &&
    cur.close < prev.low &&
    cur.close < e
  if (fake) {
    return { ok: true, detail: 'اختراق فاشل فوق EMA50 ثم إغلاق ضعيف — ميل لـ Put.' }
  }
  return { ok: false, detail: '' }
}

export function buildTerminalOptionsSetup(
  symbol: string,
  daily: Candle[] | null,
  lastPrice: number,
): TerminalOptionsSetup {
  if (!daily || daily.length < EMA_PERIOD + 3) {
    return {
      id: `${symbol}-opt-none`,
      symbol,
      bias: 'NONE',
      contractTypeAr: 'لا إعداد',
      setupTypeAr: 'انتظار بيانات',
      entryZoneAr: '—',
      invalidationAr: '—',
      targetAr: '—',
      confidenceAr: '—',
      rationaleAr:
        'لا تتوفر شموع يومية كافية لتحليل الأوبشن بعد.' +
        (lastPrice > 0 ? ` مرجع السعر الحي ~ ${lastPrice.toFixed(2)}.` : ''),
      executable: false,
    }
  }

  const sorted = [...daily].sort((a, b) => a.time - b.time)
  const closes = sorted.map((c) => c.close)
  const ema50 = emaSeries(closes, EMA_PERIOD)

  const putEma = detectEma50RejectionPut(sorted, ema50)
  if (putEma.ok) {
    const e = ema50[ema50.length - 1]
    return {
      id: `${symbol}-opt-put-ema50`,
      symbol,
      bias: 'PUT',
      contractTypeAr: 'بوت',
      setupTypeAr: 'رفض EMA50 يومي',
      entryZoneAr: `دخول عند ضعف واضح تحت ${e.toFixed(2)} مع تأكيد`,
      invalidationAr: 'إلغاء: إغلاق يومي فوق EMA50 بشكل حاسم.',
      targetAr: 'هدف فكرة: امتداد هبوطي نحو آخر قاع يومي مهم.',
      confidenceAr: putEma.detail.includes('غير') ? 'متوسط' : 'مرتفع',
      rationaleAr: putEma.detail,
      executable: true,
    }
  }

  const failed = detectFailedBreakoutPut(sorted, ema50)
  if (failed.ok) {
    return {
      id: `${symbol}-opt-put-failed`,
      symbol,
      bias: 'PUT',
      contractTypeAr: 'بوت',
      setupTypeAr: 'اختراق فاشل',
      entryZoneAr: 'دخول عند كسر قاع تأكيد الاختراق الفاشل',
      invalidationAr: 'إلغاء: عودة فوق أعلى نقطة الاختراق الوهمي.',
      targetAr: 'هدف: عودة نحو متوسط الحركة الأخير.',
      confidenceAr: 'متوسط',
      rationaleAr: failed.detail,
      executable: true,
    }
  }

  const bounce = detectSupportBounceCall(sorted, ema50)
  if (bounce.ok) {
    const e = ema50[ema50.length - 1]
    return {
      id: `${symbol}-opt-call-bounce`,
      symbol,
      bias: 'CALL',
      contractTypeAr: 'كول',
      setupTypeAr: 'ارتداد من دعم / EMA50',
      entryZoneAr: `زخم شرائي فوق ${e.toFixed(2)} بعد الارتداد`,
      invalidationAr: 'إلغاء: إغلاق يومي تحت أدنى شمعة الارتداد.',
      targetAr: 'هدف: امتداد نحو آخر قمة يومية.',
      confidenceAr: 'متوسط',
      rationaleAr: bounce.detail,
      executable: true,
    }
  }

  const cont = detectBreakoutContinuationCall(sorted, ema50)
  if (cont.ok) {
    return {
      id: `${symbol}-opt-call-cont`,
      symbol,
      bias: 'CALL',
      contractTypeAr: 'كول',
      setupTypeAr: 'استمرار بعد اختراق',
      entryZoneAr: 'دخول على متابعة فوق آخر قمة يومية مع تأكيد',
      invalidationAr: 'إلغاء: إغلاق يومي تحت EMA50.',
      targetAr: 'هدف: موجة امتداد نحو مقاومة أعلى.',
      confidenceAr: 'متوسط',
      rationaleAr: cont.detail,
      executable: true,
    }
  }

  return {
    id: `${symbol}-opt-neutral`,
    symbol,
    bias: 'NONE',
    contractTypeAr: 'لا إعداد',
    setupTypeAr: 'محايد',
    entryZoneAr: '—',
    invalidationAr: '—',
    targetAr: '—',
    confidenceAr: 'منخفض',
    rationaleAr:
      'لا يوجد نمط أوبشن واضح (EMA50 / اختراق / ارتداد) حالياً.' +
      (lastPrice > 0 ? ` مرجع السعر ~ ${lastPrice.toFixed(2)}.` : ''),
    executable: false,
  }
}
