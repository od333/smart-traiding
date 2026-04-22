import type { ScoredSignal, NewsItem } from '../domain/models'
import type { SetupQuality } from '../engine/tradingPhilosophyEngine'
import type { TerminalStockSetup } from '../terminal/stockSetupEngine'
import type { TerminalOptionsSetup } from '../terminal/optionsSetupEngine'
import type { OptionSuggestion } from '../engine/optionsSelector'
import { formatContractExpiryAr } from '../terminal/optionSuggestionPick'
import { isUSMarketOpen } from '../utils/marketSession'

function getTelegramEnv(key: string): string | undefined {
  if (typeof process !== 'undefined' && process.env?.[key] != null) {
    return process.env[key]
  }
  const meta = (import.meta as unknown as { env?: Record<string, string> })?.env
  return meta?.[key]
}

function getToken(): string | undefined {
  return getTelegramEnv('VITE_TELEGRAM_BOT_TOKEN') ?? getTelegramEnv('TELEGRAM_BOT_TOKEN')
}

function getChatId(): string | undefined {
  return getTelegramEnv('VITE_TELEGRAM_CHAT_ID') ?? getTelegramEnv('TELEGRAM_CHAT_ID')
}

/** للوحة الإدارة: التحقق من أن البوت والقناة مضبوطان قبل الإرسال اليدوي */
export function isTelegramConfigured(): boolean {
  if (typeof window !== 'undefined') {
    // في الواجهة نعتمد proxy محلي للإرسال، فلا نحتاج كشف التوكن للعميل.
    return true
  }
  const token = getToken()
  const chatId = getChatId()

  // Debug داخل الواجهة لمعرفة حالة المتغيرات البيئية
  if (typeof window !== 'undefined') {
    const meta = (import.meta as unknown as { env?: Record<string, string> })?.env ?? {}
    console.log('[Admin][Telegram] VITE_TELEGRAM_BOT_TOKEN present:', !!meta.VITE_TELEGRAM_BOT_TOKEN)
    console.log('[Admin][Telegram] VITE_TELEGRAM_CHAT_ID present:', !!meta.VITE_TELEGRAM_CHAT_ID)
    console.log('[Admin][Telegram] isTelegramConfigured result:', Boolean(token && chatId))
  }

  return Boolean(token && chatId)
}

export type SendTelegramResult = { ok: boolean; error?: string }

/** يدعم @channel_username أو channel id مثل -100xxxxxxxxxx دون تغيير القيمة */
async function sendTelegramMessage(
  text: string,
  options?: { verbose?: boolean },
): Promise<boolean> {
  const result = await sendTelegramMessageWithResult(text, options)
  return result.ok
}

/** إرسال رسالة تيليجرام مع إرجاع سبب الفشل إن وُجد */
async function sendTelegramMessageWithResult(
  text: string,
  options?: { verbose?: boolean },
): Promise<SendTelegramResult> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string; error?: string }
      if (!res.ok || data.ok === false) {
        return { ok: false, error: data.description ?? data.error ?? `HTTP ${res.status}` }
      }
      return { ok: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { ok: false, error: message }
    }
  }

  const token = getToken()
  const chatId = getChatId()

  const verbose = options?.verbose === true

  if (verbose) {
    console.log('Using BOT TOKEN:', token ? 'OK' : 'MISSING')
    console.log('Using CHAT ID:', chatId ?? 'MISSING')
  }

  if (!token || !chatId) {
    console.error('Telegram not configured correctly')
    return { ok: false, error: 'لم يتم ضبط البوت أو معرف القناة (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID)' }
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`

  if (verbose) {
    console.log('Sending request to Telegram...')
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    })

    const data = await res.json().catch(() => ({})) as { ok?: boolean; description?: string }

    if (!res.ok) {
      console.log('Telegram response:', data)
      const desc = (data.description ?? res.statusText ?? 'خطأ غير معروف')
      return { ok: false, error: desc }
    }

    if (verbose) {
      console.log('Telegram response:', data)
    }
    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Telegram error:', error)
    return { ok: false, error: message }
  }
}

/**
 * إرسال تنبيه يدوي للمشتركين إلى نفس قناة Telegram.
 * للاستخدام من لوحة الإدارة فقط.
 * @param message نص الرسالة
 * @param title عنوان اختياري؛ إن لم يُمرَّر يُستخدم "تنبيه للمشتركين"
 */
export async function sendManualBroadcast(
  message: string,
  title?: string,
): Promise<SendTelegramResult> {
  const header = title?.trim() ? title.trim() : 'تنبيه للمشتركين'
  const text = `📢 ${header}\n\n${message.trim()}`
  return sendTelegramMessageWithResult(text)
}

/**
 * إرسال تنبيه صفقة — يُرسل فقط عندما تكون جودة الإعداد A+
 * تنسيق مختصر بالعربي.
 */
export async function sendSignalAlert(
  signal: ScoredSignal,
  assessment?: { setupQuality: SetupQuality },
) {
  if (!signal) return
  if (!isUSMarketOpen()) return
  if (assessment?.setupQuality !== 'A_PLUS') return

  const directionAr = signal.direction === 'long' ? 'شراء' : 'بيع'
  const targetsStr = signal.riskReward.targets.map((t) => String(t)).join(' ، ')
  const currentTime = new Date().toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' })
  const quality = assessment?.setupQuality === 'A_PLUS' ? 'A+' : (assessment?.setupQuality ?? '—')
  const smartMoneyScore = typeof signal.smartMoneyScore === 'number' ? signal.smartMoneyScore.toFixed(2) : '—'

  const lines: string[] = [
    '📊 سمارت تريدنق | تنبيه تجريبي',
    '',
    `${signal.symbol} | ${directionAr}`,
    `الدخول: ${signal.riskReward.entry}`,
    `وقف الخسارة: ${signal.riskReward.stop}`,
    `الأهداف: ${targetsStr}`,
    '',
    `الاستراتيجية: ${signal.strategyName ?? signal.strategy}`,
    `جودة الإعداد: ${quality === 'A+' ? 'ممتاز جدًا' : quality}`,
    `درجة السيولة الذكية: ${smartMoneyScore}`,
    `وقت الإرسال: ${currentTime}`,
  ]

  await sendTelegramMessage(lines.join('\n'))
}

/**
 * إرسال رسالة اختبار فورية — لا تعتمد على جلسة السوق.
 * للتحقق من أن البوت يرسل إلى القناة بنجاح.
 */
export async function sendTestTelegramMessage(): Promise<boolean> {
  const now = new Date().toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' })
  const text = [
    '🚀 رسالة اختبار من سمارت تريدنق',
    '',
    'تم تفعيل البوت بنجاح.',
    'مصدر البيانات: حي',
    'تنبيهات تيليجرام: مفعلة',
    'وقت الإرسال: ' + now,
  ].join('\n')
  return sendTelegramMessage(text, { verbose: true })
}

/**
 * إرسال توصية تجريبية فورية — لا تعتمد على جلسة السوق.
 * للتحقق من شكل رسالة الإشارة في القناة.
 */
export async function sendTestSignalAlert(): Promise<boolean> {
  const text = [
    '📊 توصية تجريبية من سمارت تريدنق',
    '',
    'السهم: NVDA',
    'الاستراتيجية: اختراق مع تأكيد الحجم',
    'المصدر: التحليل الفني للأسواق المالية - جون ميرفي',
    '',
    'الاتجاه: شراء',
    'الدخول: 880',
    'وقف الخسارة: 860',
    'الأهداف:',
    '920',
    '950',
    '',
    'أوبشن مقترح (تجريبي):',
    'السترايك: 175',
    'تاريخ انتهاء العقد: 2026-04-18',
    '',
    'التقييم: ممتاز',
    'ملاحظة: هذه رسالة اختبار للتأكد من أن تيليجرام يعمل.',
  ].join('\n')
  return sendTelegramMessage(text, { verbose: true })
}

/**
 * بناء نص رسالة "أفضل إشارة" للعرض المسبق أو للإرسال.
 * للاستخدام من لوحة الإدارة.
 */
export function buildBestSignalMessageText(
  signal: ScoredSignal,
  quality?: string,
): string {
  const directionAr = signal.direction === 'long' ? 'شراء' : 'بيع'
  const targetsStr = signal.riskReward.targets.map((t) => String(t)).join(' ، ')
  const qualityStr = quality ?? '—'
  const smartMoneyStr =
    typeof signal.smartMoneyScore === 'number'
      ? signal.smartMoneyScore.toFixed(2)
      : '—'

  const lines = [
    '📊 أفضل إشارة حالية من سمارت تريدنق',
    '',
    `السهم: ${signal.symbol}`,
    `الاستراتيجية: ${signal.strategyName ?? signal.strategy}`,
    `الاتجاه: ${directionAr}`,
    `الدخول: ${signal.riskReward.entry}`,
    `وقف الخسارة: ${signal.riskReward.stop}`,
    `الأهداف: ${targetsStr}`,
    `التقييم: ${qualityStr}`,
    `درجة السيولة الذكية: ${smartMoneyStr}`,
  ]

  return lines.join('\n')
}

/**
 * إرسال أفضل إشارة حالية إلى قناة Telegram.
 * للاستخدام من لوحة الإدارة فقط — يُستدعى فقط عندما يكون مصدر البيانات LIVE.
 */
export async function sendBestSignalAlert(
  signal: ScoredSignal,
  quality?: string,
): Promise<SendTelegramResult> {
  const text = buildBestSignalMessageText(signal, quality)
  return sendTelegramMessageWithResult(text)
}

/**
 * إرسال صفقة من \"مناطق الدخول\" إلى تيليجرام بصيغة مختصرة.
 */
export async function sendExecutionZoneTrade(
  signal: ScoredSignal,
): Promise<SendTelegramResult> {
  const { entry, stop, targets } = signal.riskReward
  if (!targets.length) {
    return { ok: false, error: 'لا توجد أهداف محددة للإشارة' }
  }

  const primaryTarget = targets[0]
  const directionAr = signal.direction === 'long' ? 'شراء' : 'بيع'

  const lines = [
    `📌 ${signal.symbol} | ${directionAr}`,
    `الدخول: ${entry.toFixed(2)}`,
    `الوقف: ${stop.toFixed(2)}`,
    `الهدف: ${primaryTarget.toFixed(2)}`,
  ]

  return sendTelegramMessageWithResult(lines.join('\n'))
}

/** تنبيه تلقائي — محطة التداول (سهم) — عند التنفيذ فقط ووضع LIVE */
export async function sendAutoStockTerminalAlert(
  setup: TerminalStockSetup,
  optionPick?: OptionSuggestion | null,
): Promise<SendTelegramResult> {
  const t = setup.targets
  const entryZone = `${setup.entryMin.toFixed(2)} - ${setup.entryMax.toFixed(2)}`
  const lines = [
    '📊 فرصة جديدة',
    '',
    `السهم: ${setup.symbol}`,
    `النوع: ${setup.setupTypeAr}`,
    `الاتجاه: ${setup.directionAr}`,
    `الدخول: ${entryZone}`,
    `الوقف: ${setup.stop.toFixed(2)}`,
    `الأهداف: ${t[0].toFixed(2)} / ${t[1].toFixed(2)} / ${t[2].toFixed(2)}`,
    `الحالة: ${setup.state}`,
    `الجودة: ${setup.confidenceAr}`,
  ]
  if (optionPick) {
    lines.push(
      '',
      'أوبشن مرتبط:',
      `السترايك: ${optionPick.contract.strike}`,
      `انتهاء العقد: ${formatContractExpiryAr(optionPick.contract.expiry)}`,
      `النوع: ${optionPick.contract.type === 'call' ? 'كول' : 'بوت'}`,
    )
  }
  return sendTelegramMessageWithResult(lines.join('\n'))
}

/** تنبيه تلقائي — أوبشن NVDA / AMZN / GOOGL */
export async function sendAutoOptionsTerminalAlert(
  setup: TerminalOptionsSetup,
  optionPick?: OptionSuggestion | null,
): Promise<SendTelegramResult> {
  const icon = setup.bias === 'PUT' ? '📉' : '📈'
  const lines = [
    `${icon} فرصة أوبشن`,
    '',
    `السهم: ${setup.symbol}`,
    `نوع العقد: ${setup.contractTypeAr}`,
    `الاستراتيجية: ${setup.setupTypeAr}`,
  ]
  if (optionPick) {
    lines.push(
      `السترايك: ${optionPick.contract.strike}`,
      `انتهاء العقد: ${formatContractExpiryAr(optionPick.contract.expiry)}`,
    )
  }
  lines.push(
    `الدخول: ${setup.entryZoneAr}`,
    `الإلغاء: ${setup.invalidationAr}`,
    `الهدف: ${setup.targetAr}`,
    `الثقة: ${setup.confidenceAr}`,
    `السبب: ${setup.rationaleAr.slice(0, 200)}`,
  )
  return sendTelegramMessageWithResult(lines.join('\n'))
}

/**
 * إرسال تنبيه خبر
 */
export async function sendNewsAlert(news: NewsItem) {
  if (!news) return
  if (!isUSMarketOpen()) return

  const lines: string[] = []
  lines.push('📰 خبر سوق مهم')
  lines.push('')
  lines.push(`السهم: ${news.symbol}`)
  lines.push('')
  lines.push('العنوان:')
  lines.push(news.titleAr)
  lines.push('')
  lines.push('التأثير:')
  lines.push(news.bodyAr)

  await sendTelegramMessage(lines.join('\n'))
}
