import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useEngineSnapshot } from '../hooks/useEngineSnapshot'
import {
  sendManualBroadcast,
  sendBestSignalAlert,
  buildBestSignalMessageText,
  isTelegramConfigured,
} from '../services/telegramService'
import { assessSignalPhilosophy } from '../engine/tradingPhilosophyEngine'

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
}

const BROADCAST_COOLDOWN_MS = 10_000
const BEST_SIGNAL_COOLDOWN_MS = 10 * 60 * 1000 // 10 دقائق

type BroadcastStatus = 'idle' | 'sending' | 'success' | 'error'
type BestSignalStatus = 'idle' | 'sending' | 'success' | 'error'

type SentMessageType = 'manual' | 'best_signal' | 'auto'

interface SentLogEntry {
  id: string
  time: string
  type: SentMessageType
  status: 'success' | 'error'
  detail?: string
}

const MAX_SENT_LOG = 5

function qualityLabel(setupQuality: string): string {
  if (setupQuality === 'A_PLUS') return 'A+'
  if (setupQuality === 'GOOD') return 'جيد'
  if (setupQuality === 'ACCEPTABLE') return 'مقبول'
  return setupQuality
}

const BROADCAST_TEMPLATES: { id: string; title: string; message: string }[] = [
  {
    id: '1',
    title: '🚨 تنبيه مهم',
    message:
      'نرجو من المشتركين الاستعداد، توجد أسهم تحت المراقبة وقد تظهر فرص قوية قريبًا.',
  },
  {
    id: '2',
    title: '📊 تنبيه قبل الافتتاح',
    message:
      'نراقب السوق حاليًا، وقد يتم نشر فرص جديدة مع افتتاح الجلسة.',
  },
  {
    id: '3',
    title: '⚠️ تنبيه تقلبات',
    message:
      'السوق يشهد تقلبًا مرتفعًا، يرجى الحذر والالتزام بإدارة المخاطر.',
  },
  {
    id: '4',
    title: '✅ تنبيه للمشتركين',
    message:
      'تم رصد تحركات مهمة على بعض الأسهم، تابعوا القناة استعدادًا للتوصيات القادمة.',
  },
]

const QUICK_BUTTONS: { label: string; templateIndex: number }[] = [
  { label: 'تنبيه قبل الافتتاح', templateIndex: 1 },
  { label: 'تنبيه تقلبات', templateIndex: 2 },
  { label: 'تنبيه فرصة قريبة', templateIndex: 3 },
  { label: 'تنبيه مهم الآن', templateIndex: 0 },
]

export default function AdminDashboardPage() {
  const { snapshot } = useEngineSnapshot()
  const [symbolInput, setSymbolInput] = useState('')
  const [watchedSymbols, setWatchedSymbols] = useState<string[]>([])

  const [broadcastTitle, setBroadcastTitle] = useState('')
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcastStatus, setBroadcastStatus] = useState<BroadcastStatus>('idle')
  const [broadcastError, setBroadcastError] = useState('')
  const [lastBroadcastAt, setLastBroadcastAt] = useState(0)
  const [lastBroadcastMessage, setLastBroadcastMessage] = useState('')

  const [lastSentMessages, setLastSentMessages] = useState<SentLogEntry[]>([])
  const [bestSignalStatus, setBestSignalStatus] = useState<BestSignalStatus>('idle')
  const [bestSignalError, setBestSignalError] = useState('')
  const [lastBestSignalAt, setLastBestSignalAt] = useState(0)
  const [lastBestSignalKey, setLastBestSignalKey] = useState('')

  const addSentLog = useCallback(
    (type: SentMessageType, status: 'success' | 'error', detail?: string) => {
      const time = new Date().toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' })
      setLastSentMessages((prev) => {
        const next = [
          { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, time, type, status, detail },
          ...prev,
        ]
        return next.slice(0, MAX_SENT_LOG)
      })
    },
    [],
  )

  useEffect(() => {
    if (snapshot?.watchlists?.[0]?.symbols?.length && watchedSymbols.length === 0) {
      setWatchedSymbols(snapshot.watchlists[0].symbols)
    }
  }, [snapshot, watchedSymbols.length])

  const handleAddSymbol = () => {
    const trimmed = symbolInput.trim().toUpperCase()
    if (!trimmed) return
    if (watchedSymbols.includes(trimmed)) {
      setSymbolInput('')
      return
    }
    setWatchedSymbols((prev) => [...prev, trimmed])
    setSymbolInput('')
  }

  const handleRemoveSymbol = (symbol: string) => {
    setWatchedSymbols((prev) => prev.filter((s) => s !== symbol))
  }

  const moveSymbol = (symbol: string, direction: 'up' | 'down') => {
    setWatchedSymbols((prev) => {
      const index = prev.indexOf(symbol)
      if (index === -1) return prev
      const newArr = [...prev]
      const newIndex = direction === 'up' ? index - 1 : index + 1
      if (newIndex < 0 || newIndex >= newArr.length) return prev
      const [removed] = newArr.splice(index, 1)
      newArr.splice(newIndex, 0, removed)
      return newArr
    })
  }

  const applyTemplate = useCallback((index: number) => {
    const t = BROADCAST_TEMPLATES[index]
    if (t) {
      setBroadcastTitle(t.title)
      setBroadcastMessage(t.message)
      setBroadcastError('')
      setBroadcastStatus('idle')
    }
  }, [])

  const handleSendBroadcast = useCallback(async () => {
    const msg = broadcastMessage.trim()
    if (!msg) return
    if (broadcastStatus === 'sending') return
    const now = Date.now()
    if (lastBroadcastMessage === msg && now - lastBroadcastAt < BROADCAST_COOLDOWN_MS) return

    setBroadcastStatus('sending')
    setBroadcastError('')
    const result = await sendManualBroadcast(msg, broadcastTitle.trim() || undefined)
    if (result.ok) {
      setBroadcastStatus('success')
      setLastBroadcastAt(now)
      setLastBroadcastMessage(msg)
      setBroadcastTitle('')
      setBroadcastMessage('')
      addSentLog('manual', 'success')
      setTimeout(() => setBroadcastStatus('idle'), 3000)
    } else {
      setBroadcastStatus('error')
      setBroadcastError(result.error ?? 'فشل الإرسال')
      addSentLog('manual', 'error', result.error)
    }
  }, [
    broadcastMessage,
    broadcastTitle,
    broadcastStatus,
    lastBroadcastAt,
    lastBroadcastMessage,
    addSentLog,
  ])

  const broadcastSending = broadcastStatus === 'sending'
  const canSendBroadcast =
    broadcastMessage.trim().length > 0 &&
    !broadcastSending &&
    !(
      lastBroadcastMessage === broadcastMessage.trim() &&
      Date.now() - lastBroadcastAt < BROADCAST_COOLDOWN_MS
    )

  const topSignal = snapshot?.signals?.[0] ?? null
  const dataMode = snapshot?.dataMode ?? 'MOCK'
  const isLive = dataMode === 'LIVE'
  const bestSignalSending = bestSignalStatus === 'sending'
  const bestSignalKey = topSignal
    ? `${topSignal.symbol}|${topSignal.strategy}|${topSignal.riskReward.entry}`
    : ''
  const bestSignalCooldownActive =
    bestSignalKey &&
    lastBestSignalKey === bestSignalKey &&
    Date.now() - lastBestSignalAt < BEST_SIGNAL_COOLDOWN_MS
  const assessment = topSignal && snapshot?.market && snapshot?.personalities && snapshot?.optionSuggestions
    ? assessSignalPhilosophy({
        signal: topSignal,
        market: snapshot.market,
        personality: snapshot.personalities.find((p) => p.symbol === topSignal.symbol),
        optionSuggestion:
          snapshot.optionSuggestions.find(
            (o) => o.contract.underlyingSymbol === topSignal.symbol,
          ) ?? null,
      })
    : null
  const qualityStr = assessment ? qualityLabel(assessment.setupQuality) : '—'
  const bestSignalPreviewText = topSignal
    ? buildBestSignalMessageText(topSignal, qualityStr)
    : ''

  const canSendBestSignal =
    Boolean(topSignal) &&
    isLive &&
    !bestSignalSending &&
    !bestSignalCooldownActive

  const handleSendBestSignal = useCallback(async () => {
    if (!topSignal || !isLive || bestSignalSending || bestSignalCooldownActive) return
    setBestSignalStatus('sending')
    setBestSignalError('')
    const result = await sendBestSignalAlert(topSignal, qualityStr)
    if (result.ok) {
      setBestSignalStatus('success')
      setLastBestSignalAt(Date.now())
      setLastBestSignalKey(bestSignalKey)
      addSentLog('best_signal', 'success')
      setTimeout(() => setBestSignalStatus('idle'), 3000)
    } else {
      setBestSignalStatus('error')
      setBestSignalError(result.error ?? 'فشل الإرسال')
      addSentLog('best_signal', 'error', result.error)
    }
  }, [
    topSignal,
    isLive,
    bestSignalSending,
    bestSignalCooldownActive,
    qualityStr,
    bestSignalKey,
    addSentLog,
  ])

  const typeLabel = (t: SentMessageType) => {
    if (t === 'manual') return 'يدوي'
    if (t === 'best_signal') return 'أفضل إشارة'
    return 'آلي'
  }

  const meta =
    (import.meta as unknown as { env?: Record<string, string> })?.env ?? {}
  const hasViteToken = !!meta.VITE_TELEGRAM_BOT_TOKEN
  const hasViteChatId = !!meta.VITE_TELEGRAM_CHAT_ID
  const bestSignalAvailable = Boolean(topSignal)

  return (
    <div className="flex flex-col gap-4 text-xs">
      <motion.header
        className="flex flex-wrap items-center justify-between gap-3"
        {...fadeInUp}
      >
        <div>
          <h2 className="mb-1 text-base font-semibold text-slate-50">
            لوحة الإدارة — التحكم بالمحتوى والإشارات
          </h2>
          <p className="max-w-xl text-[11px] text-slate-300">
            من هنا يمكنك إدارة الأسهم المراقبة، الإشارات، الأخبار، آراء المحللين، محتوى
            الصفحة الرئيسية، الباقات، والتنبيهات وقنوات تيليجرام.
          </p>
        </div>
        <button className="rounded-full bg-sky-500 px-3 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-sky-400">
          إضافة محتوى جديد
        </button>
      </motion.header>

      <motion.section
        className="glass-panel flex flex-col gap-2 border border-slate-700/70 bg-slate-950/95 px-3 py-3"
        {...fadeInUp}
        transition={{ delay: 0.03 }}
      >
        <span className="text-xs font-semibold text-slate-200">
          تشخيص الاتصال (مؤقت)
        </span>
        <div className="grid gap-2 text-[11px] sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <span className="text-slate-400">Telegram Token:</span>{' '}
            <span className={hasViteToken ? 'text-emerald-400' : 'text-amber-400'}>
              {hasViteToken ? 'موجود' : 'غير موجود'}
            </span>
          </div>
          <div>
            <span className="text-slate-400">Telegram Chat ID:</span>{' '}
            <span className={hasViteChatId ? 'text-emerald-400' : 'text-amber-400'}>
              {hasViteChatId ? 'موجود' : 'غير موجود'}
            </span>
          </div>
          <div>
            <span className="text-slate-400">Data Mode:</span>{' '}
            <span className="text-sky-300">{dataMode}</span>
          </div>
          <div>
            <span className="text-slate-400">Market Session:</span>{' '}
            <span className="text-sky-300">{snapshot?.marketSession ?? '—'}</span>
          </div>
          <div>
            <span className="text-slate-400">Best Signal Availability:</span>{' '}
            <span className={bestSignalAvailable ? 'text-emerald-400' : 'text-amber-400'}>
              {bestSignalAvailable ? 'yes' : 'no'}
            </span>
          </div>
        </div>
      </motion.section>

      <motion.section
        className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.3fr)_minmax(0,1.3fr)]"
        {...fadeInUp}
        transition={{ delay: 0.05 }}
      >
        <div className="glass-panel flex flex-col gap-3 border border-slate-700/70 bg-slate-950/95 px-3 py-3">
          <span className="text-xs font-semibold text-slate-200">
            إدارة الأسهم المراقبة (محلياً)
          </span>
          <p className="text-[11px] text-slate-300">
            أضف أو احذف أو أعِد ترتيب الأسهم المراقبة. هذه التغييرات محلية داخل المتصفح
            فقط ولا تؤثر على المحرك أو أي Backend.
          </p>

          <div className="flex items-center gap-2 text-[11px]">
            <input
              value={symbolInput}
              onChange={(e) => setSymbolInput(e.target.value)}
              placeholder="أدخل رمز السهم مثل NVDA"
              className="flex-1 rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-[11px] text-slate-100 outline-none placeholder:text-slate-500"
            />
            <button
              onClick={handleAddSymbol}
              className="rounded-full bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400"
            >
              إضافة
            </button>
          </div>

          <div className="soft-scrollbar flex max-h-64 flex-col gap-1.5 overflow-auto pr-1">
            {watchedSymbols.length ? (
              watchedSymbols.map((symbol, index) => (
                <div
                  key={symbol}
                  className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-950/90 px-3 py-2 text-[11px]"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold text-sky-200">
                      {symbol}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ترتيب: {index + 1}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-200 hover:bg-slate-700"
                      onClick={() => moveSymbol(symbol, 'up')}
                    >
                      ↑
                    </button>
                    <button
                      className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-200 hover:bg-slate-700"
                      onClick={() => moveSymbol(symbol, 'down')}
                    >
                      ↓
                    </button>
                    <button
                      className="rounded-full bg-rose-500/80 px-2 py-0.5 text-[10px] text-slate-50 hover:bg-rose-400"
                      onClick={() => handleRemoveSymbol(symbol)}
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[11px] text-slate-300">
                لم يتم تحميل قائمة مراقبة بعد من المحرك، يمكنك البدء بإضافة رموز يدوياً.
              </p>
            )}
          </div>
        </div>

        <div className="glass-panel flex flex-col gap-2 border border-slate-700/70 bg-slate-950/95 px-3 py-3">
          <span className="text-xs font-semibold text-slate-200">
            إدارة الإشارات والتحليلات
          </span>
          <p className="text-[11px] text-slate-300">
            في النسخة الحالية يتم توليد الإشارات آلياً من محرك التحليل، وسيتم لاحقاً
            إضافة أدوات يدوية لتأكيد أو تعديل بعض الإشارات من لوحة الإدارة.
          </p>
        </div>

        <div className="glass-panel flex flex-col gap-2 border border-slate-700/70 bg-slate-950/95 px-3 py-3">
          <span className="text-xs font-semibold text-slate-200">
            إدارة الباقات والاشتراكات
          </span>
          <p className="text-[11px] text-slate-300">
            ضبط مزايا كل باقة، صلاحيات الوصول، وربطها بمنظومة الدفع وتنبيهات تيليجرام سيتم
            لاحقاً بعد ربط المنصة بنظام اشتراك حقيقي.
          </p>
        </div>
      </motion.section>

      <motion.section
        className="glass-panel flex flex-col gap-3 border border-slate-700/70 bg-slate-950/95 px-3 py-3"
        {...fadeInUp}
        transition={{ delay: 0.08 }}
      >
        <span className="text-xs font-semibold text-slate-200">
          إرسال تنبيه للمشتركين
        </span>
        <p className="text-[11px] text-slate-300">
          أرسل رسالة أو اختر قالباً جاهزاً ثم عدّل النص إن شئت. الإرسال يذهب مباشرة إلى قناة
          Telegram نفسها (نفس البوت والمعرف).
        </p>
        <p className="text-[11px]">
          <span className="text-slate-400">حالة التوصيل: </span>
          {isTelegramConfigured() ? (
            <span className="text-emerald-400">مضبوط — جاهز للإرسال</span>
          ) : (
            <span className="text-amber-400">
              غير مضبوط — راجع VITE_TELEGRAM_BOT_TOKEN و VITE_TELEGRAM_CHAT_ID
            </span>
          )}
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] text-slate-400">
              عنوان اختياري
            </label>
            <input
              value={broadcastTitle}
              onChange={(e) => setBroadcastTitle(e.target.value)}
              placeholder="مثال: تنبيه مهم"
              className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-[11px] text-slate-100 outline-none placeholder:text-slate-500 focus:ring-1 focus:ring-sky-500/50"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[11px] text-slate-400">
            الرسالة
          </label>
          <textarea
            value={broadcastMessage}
            onChange={(e) => setBroadcastMessage(e.target.value)}
            placeholder="اكتب رسالتك أو اختر قالباً أدناه..."
            rows={4}
            className="w-full resize-y rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-[11px] text-slate-100 outline-none placeholder:text-slate-500 focus:ring-1 focus:ring-sky-500/50"
          />
        </div>

        <div>
          <span className="mb-2 block text-[11px] text-slate-400">
            قوالب جاهزة
          </span>
          <div className="flex flex-wrap gap-2">
            {BROADCAST_TEMPLATES.map((t, i) => (
              <button
                key={t.id}
                type="button"
                onClick={() => applyTemplate(i)}
                className="rounded-full border border-slate-600 bg-slate-800/80 px-3 py-1.5 text-[11px] text-slate-200 hover:bg-slate-700/80 hover:border-slate-500"
              >
                قالب {i + 1}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="mb-2 block text-[11px] text-slate-400">
            أزرار سريعة
          </span>
          <div className="flex flex-wrap gap-2">
            {QUICK_BUTTONS.map((qb) => (
              <button
                key={qb.label}
                type="button"
                onClick={() => applyTemplate(qb.templateIndex)}
                className="rounded-full bg-sky-600/80 px-3 py-1.5 text-[11px] font-medium text-slate-100 hover:bg-sky-500/80"
              >
                {qb.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSendBroadcast}
            disabled={!canSendBroadcast}
            className="rounded-full bg-emerald-600 px-4 py-2 text-[11px] font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {broadcastSending ? 'جاري الإرسال...' : 'إرسال إلى Telegram'}
          </button>
          {broadcastStatus === 'success' && (
            <span className="text-[11px] font-medium text-emerald-400">
              تم الإرسال بنجاح
            </span>
          )}
          {broadcastStatus === 'error' && (
            <span className="text-[11px] font-medium text-rose-400" title={broadcastError}>
              فشل الإرسال: {broadcastError}
            </span>
          )}
        </div>
      </motion.section>

      <motion.section
        className="glass-panel flex flex-col gap-3 border border-slate-700/70 bg-slate-950/95 px-3 py-3"
        {...fadeInUp}
        transition={{ delay: 0.1 }}
      >
        <span className="text-xs font-semibold text-slate-200">
          إرسال أفضل إشارة الآن
        </span>
        <p className="text-[11px] text-slate-300">
          ترسل أعلى إشارة حالية (حسب finalScore) إلى قناة Telegram فقط عندما يكون مصدر
          البيانات LIVE. لا يُرسل من MOCK أو FALLBACK.
        </p>

        {!isLive && (
          <p className="rounded-xl border border-amber-500/50 bg-amber-950/30 px-3 py-2 text-[11px] text-amber-200">
            لا يمكن إرسال أفضل إشارة لأن المصدر الحالي ليس LIVE
          </p>
        )}
        {isLive && !topSignal && (
          <p className="text-[11px] text-slate-400">
            لا توجد إشارات حالية في النظام.
          </p>
        )}

        {topSignal && (
          <>
            <div>
              <span className="mb-1 block text-[11px] text-slate-400">
                معاينة الرسالة قبل الإرسال
              </span>
              <pre
                className="max-h-48 overflow-auto rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-[11px] leading-relaxed text-slate-200 whitespace-pre-wrap"
              >
                {bestSignalPreviewText}
              </pre>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSendBestSignal}
                disabled={!canSendBestSignal}
                className="rounded-full bg-sky-600 px-4 py-2 text-[11px] font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {bestSignalSending
                  ? 'جاري الإرسال...'
                  : 'إرسال أفضل إشارة الآن'}
              </button>
              {bestSignalStatus === 'success' && (
                <span className="text-[11px] font-medium text-emerald-400">
                  تم الإرسال بنجاح
                </span>
              )}
              {bestSignalStatus === 'error' && (
                <span className="text-[11px] font-medium text-rose-400" title={bestSignalError}>
                  فشل الإرسال: {bestSignalError}
                </span>
              )}
              {bestSignalCooldownActive && (
                <span className="text-[11px] text-amber-400">
                  تم إرسال هذه الإشارة مؤخراً، انتظر 10 دقائق
                </span>
              )}
            </div>
          </>
        )}
      </motion.section>

      <motion.section
        className="glass-panel flex flex-col gap-3 border border-slate-700/70 bg-slate-950/95 px-3 py-3"
        {...fadeInUp}
        transition={{ delay: 0.12 }}
      >
        <span className="text-xs font-semibold text-slate-200">
          آخر الرسائل المرسلة
        </span>
        <p className="text-[11px] text-slate-300">
          آخر 5 رسائل أُرسلت من لوحة الإدارة (يدوي أو أفضل إشارة). الرسائل الآلية من الـ worker لا تظهر هنا.
        </p>
        <div className="flex flex-col gap-1.5">
          {lastSentMessages.length === 0 ? (
            <p className="text-[11px] text-slate-500">
              لا توجد رسائل مرسلة بعد من هذه الجلسة.
            </p>
          ) : (
            lastSentMessages.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/90 px-3 py-2 text-[11px]"
              >
                <span className="text-slate-400">{entry.time}</span>
                <span className="rounded-full bg-slate-700/80 px-2 py-0.5 text-slate-300">
                  {typeLabel(entry.type)}
                </span>
                <span
                  className={
                    entry.status === 'success'
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }
                >
                  {entry.status === 'success' ? 'تم الإرسال' : 'فشل'}
                </span>
                {entry.detail && (
                  <span className="text-slate-500" title={entry.detail}>
                    {entry.detail.length > 40 ? entry.detail.slice(0, 40) + '…' : entry.detail}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </motion.section>
    </div>
  )
}

