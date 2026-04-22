import type { Trade } from './tradeTracker'
import { sendManualBroadcast } from './telegramService'

export type DailyReport = {
  totalTrades: number
  wins: number
  losses: number
  winRate: number
  bestTrade: Trade | null
  worstTrade: Trade | null
  successReasons: string[]
  failureReasons: string[]
}

export function generateDailyReport(trades: Trade[]): DailyReport {
  const completed = trades.filter((t) => t.status && t.status !== 'OPEN')
  const totalTrades = completed.length
  const wins = completed.filter((t) => t.status === 'WIN').length
  const losses = completed.filter((t) => t.status === 'LOSS').length
  const winRate = totalTrades ? Math.round((wins / totalTrades) * 100) : 0

  let bestTrade: Trade | null = null
  let worstTrade: Trade | null = null

  for (const t of completed) {
    if (typeof t.result !== 'number') continue
    if (!bestTrade || (bestTrade.result ?? -Infinity) < t.result) {
      bestTrade = t
    }
    if (!worstTrade || (worstTrade.result ?? Infinity) > t.result) {
      worstTrade = t
    }
  }

  const successReasons: string[] = []
  const failureReasons: string[] = []

  const breakoutWins = completed.filter(
    (t) => t.status === 'WIN' && t.strategy.toLowerCase().includes('breakout'),
  ).length
  const breakoutLosses = completed.filter(
    (t) => t.status === 'LOSS' && t.strategy.toLowerCase().includes('breakout'),
  ).length

  if (breakoutWins > breakoutLosses && breakoutWins > 0) {
    successReasons.push('استراتيجيات الاختراق (breakout) كانت فعّالة اليوم مع انضباط في وقف الخسارة.')
  }
  if (breakoutLosses > breakoutWins && breakoutLosses > 0) {
    failureReasons.push('جزء من خسائر اليوم جاء من اختراقات وهمية (fake breakouts) أو ضعف في الفوليوم بعد الاختراق.')
  }

  const longWins = completed.filter((t) => t.status === 'WIN' && t.direction === 'LONG').length
  const shortWins = completed.filter((t) => t.status === 'WIN' && t.direction === 'SHORT').length

  if (longWins > shortWins && longWins > 0) {
    successReasons.push('الفرص الشرائية (LONG) كانت أوضح من فرص الحماية (SHORT).')
  }
  if (shortWins > longWins && shortWins > 0) {
    successReasons.push('صفقات SHORT للحماية أدت أداءً جيداً في يوم متقلب أو هابط.')
  }

  if (!successReasons.length) {
    successReasons.push('الالتزام بإدارة المخاطر ساعد في تقليل تأثير الصفقات الخاسرة.')
  }
  if (!failureReasons.length && losses > 0) {
    failureReasons.push('بعض الصفقات تحركت ضد الاتجاه بسرعة؛ يُفضّل تقليل حجم المخاطرة في الأيام المتقلبة.')
  }

  return {
    totalTrades,
    wins,
    losses,
    winRate,
    bestTrade,
    worstTrade,
    successReasons,
    failureReasons,
  }
}

export async function sendDailyReportToTelegram(
  report: DailyReport,
  allTodayTrades?: Trade[],
): Promise<void> {
  const {
    totalTrades,
    wins,
    losses,
    winRate,
    bestTrade,
    worstTrade,
    successReasons,
    failureReasons,
  } = report

  const stockAlerts =
    allTodayTrades?.filter((t) => t.kind === 'stock').length ?? null
  const optionsAlerts =
    allTodayTrades?.filter((t) => t.kind === 'options').length ?? null

  const bestLine =
    bestTrade && typeof bestTrade.result === 'number'
      ? `${bestTrade.symbol} ${bestTrade.result >= 0 ? '+' : ''}${bestTrade.result.toFixed(2)}%`
      : 'لا توجد صفقة رابحة مغلقة اليوم.'

  const worstLine =
    worstTrade && typeof worstTrade.result === 'number'
      ? `${worstTrade.symbol} ${worstTrade.result >= 0 ? '+' : ''}${worstTrade.result.toFixed(2)}%`
      : 'لا توجد صفقة خاسرة مغلقة اليوم.'

  const successBullets = successReasons.map((r) => `* ${r}`).join('\n')
  const failureBullets = failureReasons.map((r) => `* ${r}`).join('\n')

  const message = [
    'عدد الصفقات: ' + totalTrades,
    ...(stockAlerts != null && optionsAlerts != null
      ? [`تنبيهات مرسلة اليوم — أسهم: ${stockAlerts}، أوبشن: ${optionsAlerts}`, '']
      : []),
    '',
    `✅ ناجحة: ${wins}`,
    `❌ خاسرة: ${losses}`,
    '',
    `📈 نسبة النجاح: ${winRate}%`,
    '',
    'أفضل صفقة:',
    bestLine,
    '',
    'أسوأ صفقة:',
    worstLine,
    '',
    '📌 أسباب النجاح:',
    successBullets || '* لا يوجد سبب محدد، اليوم كان متوازناً.',
    '',
    '⚠️ أسباب الخسارة:',
    failureBullets || '* لا توجد خسائر تُذكر اليوم.',
    '',
    '💡 توصية:',
    totalTrades === 0
      ? 'لم تُرسل أي صفقات اليوم؛ يمكن التركيز على تنقية شروط الدخول لأيام السيولة المرتفعة.'
      : 'استمر في الالتزام بخطة التداول وإدارة رأس المال، وقلّل أحجام الصفقات في الأيام ذات التقلب العالي.',
  ].join('\n')

  await sendManualBroadcast(message, 'تقرير نهاية اليوم — Smart Trading')
}

