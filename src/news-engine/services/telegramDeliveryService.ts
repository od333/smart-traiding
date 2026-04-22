import type { AlertPriority, NormalizedNewsItem } from '../types'
import { newsEnv } from '../env'
import { log } from '../utils/logger'
import type { MarketContextAr } from './marketContextService'

function sentimentAr(value: string): string {
  if (value === 'bullish' || value === 'صاعد') return 'صاعد'
  if (value === 'bearish' || value === 'هابط') return 'هابط'
  return 'محايد'
}

function impactAr(value: string): string {
  if (value === 'high' || value === 'عالية') return 'عالية'
  if (value === 'medium' || value === 'متوسطة') return 'متوسطة'
  return 'منخفضة'
}

function categoryAr(value: string): string {
  if (value === 'earnings') return 'نتائج مالية'
  if (value === 'guidance') return 'توجيه مستقبلي'
  if (value === 'analyst action' || value === 'analyst_action') return 'تقييم محللين'
  if (value === 'macro') return 'خبر اقتصادي'
  if (value === 'AI' || value === 'ai') return 'ذكاء اصطناعي'
  if (value === 'regulation') return 'تنظيم / تشريع'
  if (value === 'lawsuit') return 'دعوى / قضية'
  if (value === 'product launch' || value === 'product_launch') return 'إطلاق منتج'
  if (value === 'acquisition') return 'استحواذ'
  if (value === 'market-wide' || value === 'market_wide') return 'خبر مؤثر على السوق'
  return 'أخرى'
}

function actionAr(value: string): string {
  if (value === 'watch for call setups' || value === 'راقب فرص كول') return 'راقب فرص كول'
  if (value === 'watch for put setups' || value === 'راقب فرص بوت') return 'راقب فرص بوت'
  if (value === 'monitor only' || value === 'متابعة فقط') return 'متابعة فقط'
  if (value === 'no action' || value === 'لا يوجد إجراء') return 'لا يوجد إجراء'
  return 'متابعة فقط'
}

type TradingFit = 'عالية' | 'متوسطة' | 'ضعيفة'
type TimingWindow = 'لحظي اليوم' | 'خلال جلسة إلى جلستين' | 'غير واضح'
type NearDirection = 'كول' | 'بوت' | 'متابعة فقط'
type MarketStateAr = 'قبل الافتتاح' | 'أثناء التداول' | 'بعد الإغلاق' | 'خارج وقت السوق'
type ExecutionReadinessAr =
  | 'مناسب الآن'
  | 'راقب الافتتاح'
  | 'مناسب للجلسة القادمة'
  | 'غير مناسب للتنفيذ الفوري'
type FinalVerdictAr = 'جاهز للتنفيذ' | 'جاهز للمراقبة' | 'متابعة فقط' | 'تجاهل'

function detectImmediateCatalyst(news: NormalizedNewsItem): boolean {
  const text = `${news.title} ${news.summary}`.toLowerCase()
  return /breaking|urgent|now|immediate|surge|plunge|after hours|premarket/.test(text)
}

function expectedTiming(news: NormalizedNewsItem): TimingWindow {
  const immediate = detectImmediateCatalyst(news)
  if (news.urgencyScore >= 85 || (news.impactScore >= 85 && immediate)) {
    return 'لحظي اليوم'
  }
  if (
    news.impactScore >= 65 ||
    news.urgencyScore >= 65 ||
    news.detectedCategory === 'earnings' ||
    news.detectedCategory === 'guidance' ||
    news.detectedCategory === 'analyst action'
  ) {
    return 'خلال جلسة إلى جلستين'
  }
  return 'غير واضح'
}

function inferNearDirection(news: NormalizedNewsItem, timing: TimingWindow): NearDirection {
  const macroLike = news.detectedCategory === 'macro' || news.detectedCategory === 'market-wide'
  const strong = news.impactLevel === 'high' || news.urgencyScore >= 80

  if (timing === 'غير واضح') return 'متابعة فقط'

  if (news.sentiment === 'bullish' && strong) return 'كول'
  if (news.sentiment === 'bearish' && strong) return 'بوت'

  if (macroLike && strong) {
    if (news.sentiment === 'bullish') return 'كول'
    if (news.sentiment === 'bearish') return 'بوت'
  }

  if (news.impactLevel === 'medium') return 'متابعة فقط'
  return 'متابعة فقط'
}

function tradingFit(news: NormalizedNewsItem, timing: TimingWindow, dir: NearDirection): TradingFit {
  if (dir !== 'متابعة فقط' && timing === 'لحظي اليوم' && news.impactLevel === 'high') {
    return 'عالية'
  }
  if (dir !== 'متابعة فقط' && timing !== 'غير واضح' && news.impactScore >= 65) {
    return 'متوسطة'
  }
  return 'ضعيفة'
}

function rationaleAr(news: NormalizedNewsItem, timing: TimingWindow, dir: NearDirection): string {
  const category = categoryAr(news.detectedCategory)
  if (dir === 'كول') {
    return `النبرة صاعدة مع خبر ${category} وتأثير ملحوظ، ما يدعم فرص الصعود قصير الأجل ضمن إطار ${timing}.`
  }
  if (dir === 'بوت') {
    return `النبرة هابطة مع خبر ${category} وضغط متوقع على السعر، ما يرجّح فرص الهبوط قصير الأجل ضمن إطار ${timing}.`
  }
  return `التأثير الحالي للخبر ${category} غير كافٍ لبناء دخول أوبشن مباشر، والأفضل المتابعة حتى تظهر إشارة أوضح.`
}

function buildTradingRelevance(news: NormalizedNewsItem): {
  fit: TradingFit
  timing: TimingWindow
  nearDirection: NearDirection
  reason: string
} {
  const timing = expectedTiming(news)
  const nearDirection = inferNearDirection(news, timing)
  const fit = tradingFit(news, timing, nearDirection)
  const reason = rationaleAr(news, timing, nearDirection)
  return { fit, timing, nearDirection, reason }
}

function marketStateByUsTime(date: Date): MarketStateAr {
  const ny = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const day = ny.getDay()
  if (day === 0 || day === 6) return 'خارج وقت السوق'

  const minutes = ny.getHours() * 60 + ny.getMinutes()
  const preOpen = 4 * 60
  const open = 9 * 60 + 30
  const close = 16 * 60
  const afterHoursEnd = 20 * 60

  if (minutes >= preOpen && minutes < open) return 'قبل الافتتاح'
  if (minutes >= open && minutes <= close) return 'أثناء التداول'
  if (minutes > close && minutes < afterHoursEnd) return 'بعد الإغلاق'
  return 'خارج وقت السوق'
}

function buildExecutionTiming(news: NormalizedNewsItem): {
  marketState: MarketStateAr
  readiness: ExecutionReadinessAr
  reason: string
} {
  const marketState = marketStateByUsTime(news.publishedAt)
  const urgent = news.urgencyScore >= 80
  const strong = news.impactLevel === 'high' || news.impactScore >= 80
  const unclear = news.impactLevel === 'low' || (news.urgencyScore < 60 && news.impactScore < 60)

  if (marketState === 'أثناء التداول' && urgent) {
    return {
      marketState,
      readiness: 'مناسب الآن',
      reason: 'الخبر عاجل أثناء الجلسة مع محفز واضح، ما يدعم تنفيذًا سريعًا بإدارة مخاطرة مشددة.',
    }
  }

  if (marketState === 'قبل الافتتاح' && urgent) {
    return {
      marketState,
      readiness: 'راقب الافتتاح',
      reason: 'الخبر صدر قبل الافتتاح وبنبرة قوية؛ الأفضل متابعة أول دقائق الجلسة قبل التنفيذ.',
    }
  }

  if (marketState === 'بعد الإغلاق' && strong) {
    return {
      marketState,
      readiness: 'مناسب للجلسة القادمة',
      reason: 'الخبر قوي لكنه بعد الإغلاق، لذلك الأرجح أن يظهر أثره العملي مع افتتاح الجلسة التالية.',
    }
  }

  if (unclear || marketState === 'خارج وقت السوق') {
    return {
      marketState,
      readiness: 'غير مناسب للتنفيذ الفوري',
      reason: 'التأثير الحالي غير كافٍ أو توقيت السوق لا يدعم دخولًا مباشرًا الآن.',
    }
  }

  return {
    marketState,
    readiness: 'مناسب للجلسة القادمة',
    reason: 'الخبر قابل للتسعير لكن ليس بلحظة تنفيذ مباشرة، لذا الأنسب التحضير لأقرب جلسة.',
  }
}

function buildFinalVerdict(params: {
  priority: AlertPriority
  sentiment: NormalizedNewsItem['sentiment']
  impact: NormalizedNewsItem['impactLevel']
  urgencyScore: number
  tradingFit: TradingFit
  expectedTiming: TimingWindow
  marketState: MarketStateAr
  executionReadiness: ExecutionReadinessAr
  nearestDirection: NearDirection
  movementConfirmation?: 'مؤكد' | 'غير مؤكد'
}): { verdict: FinalVerdictAr; reason: string } {
  const hasDirection = params.nearestDirection === 'كول' || params.nearestDirection === 'بوت'
  const confirmed = params.movementConfirmation === 'مؤكد'
  const urgentPriority = params.priority === 'عاجل جدًا' || params.priority === 'مهم'

  if (
    urgentPriority &&
    hasDirection &&
    confirmed &&
    (params.executionReadiness === 'مناسب الآن' || params.expectedTiming === 'لحظي اليوم')
  ) {
    return {
      verdict: 'جاهز للتنفيذ',
      reason: 'الإشارات متوافقة: أولوية مرتفعة، اتجاه واضح، وتأكيد حركة يدعم دخولًا فعليًا الآن.',
    }
  }

  if (
    urgentPriority &&
    hasDirection &&
    (params.executionReadiness === 'راقب الافتتاح' ||
      params.executionReadiness === 'مناسب للجلسة القادمة' ||
      params.expectedTiming === 'خلال جلسة إلى جلستين')
  ) {
    return {
      verdict: 'جاهز للمراقبة',
      reason: 'السيناريو واعد لكن التوقيت الأنسب يحتاج متابعة الافتتاح أو انتظار تأكيد أقوى قبل الدخول.',
    }
  }

  if (
    params.tradingFit === 'ضعيفة' ||
    params.nearestDirection === 'متابعة فقط' ||
    params.executionReadiness === 'غير مناسب للتنفيذ الفوري'
  ) {
    // نميّز بين متابعة فقط وتجاهل حسب الضعف/التضارب
    const contradictory =
      hasDirection &&
      params.movementConfirmation === 'غير مؤكد' &&
      params.urgencyScore < 65 &&
      params.impact === 'low'
    const tooWeak =
      params.impact === 'low' &&
      params.urgencyScore < 60 &&
      params.expectedTiming === 'غير واضح' &&
      params.marketState === 'خارج وقت السوق'

    if (tooWeak || contradictory) {
      return {
        verdict: 'تجاهل',
        reason: 'الإشارة ضعيفة أو متضاربة ولا توفر ميزة تنفيذية واضحة في المدى القصير.',
      }
    }
    return {
      verdict: 'متابعة فقط',
      reason: 'الخبر مهم للسياق لكنه لا يمنح جودة كافية لدخول مباشر الآن.',
    }
  }

  return {
    verdict: 'متابعة فقط',
    reason: 'المعطيات الحالية لا تكفي لحسم دخول تنفيذي؛ الأفضل المتابعة حتى اكتمال الإشارة.',
  }
}

function sourceAr(value: string): string {
  const v = value.toLowerCase().trim()
  if (v === 'finnhub') return 'فينهب'
  if (v === 'yahoo-rss') return 'ياهو (خلاصة الأخبار)'
  if (v === 'manual-test' || v === 'اختبار يدوي') return 'اختبار يدوي'
  if (v === 'yahoo') return 'ياهو'
  return 'مصدر خارجي'
}

function titleLooksArabic(title: string): boolean {
  return /[\u0600-\u06FF]/.test(title)
}

function arabicHeadline(news: NormalizedNewsItem): string {
  if (titleLooksArabic(news.title)) return news.title
  const category = categoryAr(news.detectedCategory)
  return `تحديث ${category} على ${news.symbol}`
}

function formatArabicTime(date: Date): string {
  const riyadh = new Date(
    date.toLocaleString('en-US', {
      timeZone: 'Asia/Riyadh',
    }),
  )
  const y = riyadh.getFullYear()
  const m = String(riyadh.getMonth() + 1).padStart(2, '0')
  const d = String(riyadh.getDate()).padStart(2, '0')
  const hh = String(riyadh.getHours()).padStart(2, '0')
  const mm = String(riyadh.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${hh}:${mm} بتوقيت غرينتش +3`
}

export function buildTelegramAlertMessage(news: NormalizedNewsItem): string {
  return buildTelegramAlertMessageWithPriority(news, 'مهم')
}

export function buildTelegramAlertMessageWithPriority(
  news: NormalizedNewsItem,
  priority: AlertPriority,
  marketContext?: MarketContextAr,
): string {
  const relevance = buildTradingRelevance(news)
  const execution = buildExecutionTiming(news)
  const finalVerdict = buildFinalVerdict({
    priority,
    sentiment: news.sentiment,
    impact: news.impactLevel,
    urgencyScore: news.urgencyScore,
    tradingFit: relevance.fit,
    expectedTiming: relevance.timing,
    marketState: execution.marketState,
    executionReadiness: execution.readiness,
    nearestDirection: relevance.nearDirection,
    movementConfirmation: marketContext?.confirmation,
  })
  const marketLines =
    marketContext == null
      ? []
      : [
          `السعر الحالي: ${marketContext.currentPrice}`,
          `التغير: ${marketContext.changeText}`,
          `اتجاه الحركة الحالية: ${marketContext.movement}`,
          `حجم التداول مقارنة بالمتوسط: ${marketContext.volumeVsAverage}`,
          `تأكيد الحركة: ${marketContext.confirmation}`,
        ]
  return [
    '🚨 تنبيه أخبار سمارت تريدنق',
    '',
    '━━━ الملخص السريع ━━━',
    `• الرمز: ${news.symbol}`,
    `• الأولوية: ${priority}`,
    `• نوع الخبر: ${categoryAr(news.detectedCategory)}`,
    `• العنوان: ${arabicHeadline(news)}`,
    `• الملخص: ${news.arabicSummary}`,
    '',
    '━━━ قراءة الخبر ━━━',
    `• التصنيف: ${sentimentAr(news.sentiment)}`,
    `• قوة الخبر: ${impactAr(news.impactLevel)}`,
    `• الإجراء: ${actionAr(news.actionNote)}`,
    `• ملاءمة الخبر للتداول: ${relevance.fit}`,
    `• التوقيت المتوقع للتأثير: ${relevance.timing}`,
    `• الاتجاه الأقرب: ${relevance.nearDirection}`,
    `• سبب الترجيح: ${relevance.reason}`,
    '',
    '━━━ توقيت التنفيذ ━━━',
    `• حالة السوق: ${execution.marketState}`,
    `• صلاحية التنفيذ: ${execution.readiness}`,
    `• سبب التوقيت: ${execution.reason}`,
    ...(marketLines.length
      ? ['', '━━━ سياق السوق الحي ━━━', ...marketLines.map((line) => `• ${line.split(': ')[0]}: ${line.split(': ').slice(1).join(': ')}`)]
      : []),
    '',
    '━━━ القرار النهائي ━━━',
    `• الحكم النهائي: ${finalVerdict.verdict}`,
    `• سبب الحكم: ${finalVerdict.reason}`,
    '',
    `• المصدر: ${sourceAr(news.source)}`,
    `• الوقت: ${formatArabicTime(news.publishedAt)}`,
  ].join('\n')
}

export async function sendTelegramMessageWithRetry(message: string): Promise<{ ok: boolean; error?: string; attempts: number }> {
  const token = newsEnv.TELEGRAM_BOT_TOKEN ?? newsEnv.VITE_TELEGRAM_BOT_TOKEN
  const chatId = newsEnv.TELEGRAM_CHAT_ID ?? newsEnv.VITE_TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    return { ok: false, error: 'Telegram env vars are missing', attempts: 0 }
  }

  let lastError = 'unknown'
  for (let attempt = 1; attempt <= newsEnv.NEWS_MAX_TELEGRAM_RETRIES; attempt += 1) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
        }),
      })
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string }
      if (res.ok && body.ok !== false) {
        return { ok: true, attempts: attempt }
      }
      lastError = body.description ?? `HTTP ${res.status}`
      log('warn', 'Telegram send attempt failed', { attempt, error: lastError })
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
      log('warn', 'Telegram send exception', { attempt, error: lastError })
    }
    await new Promise((r) => setTimeout(r, 750 * attempt))
  }

  return { ok: false, error: lastError, attempts: newsEnv.NEWS_MAX_TELEGRAM_RETRIES }
}
