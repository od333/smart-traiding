import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useEngineSnapshot } from '../hooks/useEngineSnapshot'
import { HistoricalTradeChart } from '../components/HistoricalTradeChart'

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
}

export default function AnalyticalHistoryPage() {
  const { snapshot, error } = useEngineSnapshot()
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null)

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-xs text-rose-200">
        {error}
      </div>
    )
  }

  const personalities = snapshot?.personalities ?? []
  const histories = snapshot?.histories ?? []

  const flatRecords =
    histories
      .flatMap((h) => h.records.map((r) => ({ symbol: h.symbol, record: r })))
      .sort((a, b) =>
        (b.record.openedAt ?? '').localeCompare(a.record.openedAt ?? ''),
      ) ?? []

  const selected =
    selectedTradeId &&
    flatRecords.find(({ record }) => record.id === selectedTradeId)

  return (
    <div className="flex flex-col gap-4 text-xs">
      <motion.header
        className="flex flex-wrap items-center justify-between gap-3"
        {...fadeInUp}
      >
        <div>
          <h2 className="mb-1 text-base font-semibold text-slate-50">
            الهيستوري التحليلي — ذاكرة كل سهم
          </h2>
          <p className="max-w-xl text-[11px] text-slate-300">
            هنا يتم تجميع سلوك كل شركة تاريخياً: كيف يتفاعل السهم عند الاستراتيجيات
            المختلفة، الأخبار، الفوليوم العالي، ومناطق الدعم والمقاومة، لفهم شخصية السهم
            وأفضل طرق التعامل معه.
          </p>
        </div>
      </motion.header>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)]">
        <motion.div
          className="glass-panel flex flex-col gap-3 border border-slate-700/70 bg-slate-950/95 px-3 py-3"
          {...fadeInUp}
          transition={{ delay: 0.05 }}
        >
          <div className="flex items-center justify-between text-[11px] text-slate-200">
            <span className="font-medium">ملفات شخصية الأسهم</span>
            <span className="rounded-full bg-slate-900/70 px-2 py-0.5 text-[10px] text-slate-400">
              مستخرجة من سلوك السهم التاريخي
            </span>
          </div>

          <div className="soft-scrollbar flex max-h-[360px] flex-col gap-2 overflow-auto pr-1">
            {personalities.length ? (
              personalities.map((p) => (
                <div
                  key={p.symbol}
                  className="rounded-xl border border-slate-700 bg-slate-950/90 px-3 py-2"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-slate-100">{p.symbol}</span>
                    <span className="rounded-full bg-slate-900/70 px-2 py-0.5 text-[10px] text-slate-300">
                      أفضلية:{' '}
                      {p.preferredBias === 'momentum_runner'
                        ? 'زخم واستمرار اتجاه'
                        : p.preferredBias === 'gap_player'
                          ? 'فجوات وحركات حادة'
                          : p.preferredBias === 'breakout_lover'
                            ? 'اختراقات ناجحة'
                            : p.preferredBias === 'reversion_lover'
                              ? 'ارتدادات منطقية'
                              : 'تذبذب ونطاقات عرضية'}
                    </span>
                  </div>
                  <p className="mb-1 text-[11px] text-slate-300">{p.summaryAr}</p>
                  <p className="text-[10px] text-slate-400">
                    أفضل أوقات النشاط: {p.bestSessionsAr}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    حساسية الأخبار: {p.newsSensitivityAr}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-300">
                    أفضل الاستراتيجيات:{' '}
                    {p.bestStrategies.map((s) => s.strategy).join('، ')}
                  </p>
                  <p className="text-[10px] text-slate-300">
                    أضعف الاستراتيجيات:{' '}
                    {p.weakStrategies.map((s) => s.strategy).join('، ')}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-[11px] text-slate-300">
                لا توجد حالياً ملفات شخصية كافية للأسهم، سيتم بناؤها تدريجياً مع تراكم
                البيانات.
              </p>
            )}
          </div>
        </motion.div>

        <motion.aside
          className="glass-panel flex flex-col gap-3 border border-slate-700/70 bg-slate-950/95 px-3 py-3"
          {...fadeInUp}
          transition={{ delay: 0.12 }}
        >
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium text-slate-100">سجل الإشارات التاريخية</span>
          </div>

          <div className="soft-scrollbar flex max-h-[360px] flex-col gap-2 overflow-auto pr-1">
            {flatRecords.length ? (
              flatRecords.map(({ symbol, record }) => {
                const resultColor =
                  record.result === 'win'
                    ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40'
                    : record.result === 'loss'
                      ? 'bg-rose-500/15 text-rose-200 border-rose-500/40'
                      : record.result === 'breakeven'
                        ? 'bg-amber-500/15 text-amber-200 border-amber-500/40'
                        : 'bg-slate-800/60 text-slate-200 border-slate-600/60'

                return (
                  <div
                    key={record.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedTradeId(record.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setSelectedTradeId(record.id)
                      }
                    }}
                    className="cursor-pointer rounded-xl border border-slate-700 bg-slate-950/90 px-3 py-2 text-[11px] transition hover:border-sky-500/70 hover:bg-slate-900"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-medium text-slate-100">{symbol}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] ${resultColor}`}
                      >
                        {record.result === 'win'
                          ? 'صفقة ناجحة'
                          : record.result === 'loss'
                            ? 'صفقة خاسرة'
                            : record.result === 'breakeven'
                              ? 'صفقة متعادلة'
                              : 'صفقة مفتوحة'}
                      </span>
                    </div>
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-300">
                      <span>الاستراتيجية: {record.strategy}</span>
                      <span>
                        نتيجة الصفقة:{' '}
                        {record.result === 'win'
                          ? 'ناجحة'
                          : record.result === 'loss'
                            ? 'خاسرة'
                            : record.result === 'breakeven'
                              ? 'تعادل'
                              : 'مفتوحة'}
                      </span>
                    </div>
                    <div className="mt-1 grid gap-1 text-[10px] text-slate-400 lg:grid-cols-3">
                      <span>
                        نقطة الدخول:{' '}
                        {record.entryPrice ? record.entryPrice.toFixed(2) : '—'}
                      </span>
                      <span>
                        وقف الخسارة:{' '}
                        {record.stopLoss ? record.stopLoss.toFixed(2) : '—'}
                      </span>
                      <span>
                        سعر الخروج:{' '}
                        {record.exitPrice ? record.exitPrice.toFixed(2) : '—'}
                      </span>
                    </div>
                    {record.notesAr && (
                      <p className="mt-1 text-[10px] text-slate-300">
                        ملخص: {record.notesAr}
                      </p>
                    )}
                  </div>
                )
              })
            ) : (
              <p className="text-[11px] text-slate-300">
                لا يوجد بعد سجل إشارات كافٍ لعرضه، سيتم تفعيله مع تراكم الصفقات.
              </p>
            )}
          </div>
        </motion.aside>
      </section>

      <AnimatePresence>
        {selected && (
          <motion.div
            key={selected.record.id}
            className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 px-2 py-8 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="glass-panel relative w-full max-w-4xl border border-slate-700/80 bg-slate-950/95 px-4 py-4 text-xs"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
            >
              <button
                type="button"
                onClick={() => setSelectedTradeId(null)}
                className="absolute left-3 top-3 rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-800"
              >
                إغلاق
              </button>
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold text-sky-200">
                      {selected.symbol}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      الاستراتيجية: {selected.record.strategy}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    من {selected.record.openedAt} إلى{' '}
                    {selected.record.closedAt ?? 'لم تغلق بعد'}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] text-slate-400">نتيجة الصفقة</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] ${
                      selected.record.result === 'win'
                        ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/50'
                        : selected.record.result === 'loss'
                          ? 'bg-rose-500/20 text-rose-200 border border-rose-500/50'
                          : selected.record.result === 'breakeven'
                            ? 'bg-amber-500/20 text-amber-200 border border-amber-500/50'
                            : 'bg-slate-800/80 text-slate-200 border border-slate-600/60'
                    }`}
                  >
                    {selected.record.result === 'win'
                      ? 'ناجحة'
                      : selected.record.result === 'loss'
                        ? 'خاسرة'
                        : selected.record.result === 'breakeven'
                          ? 'متعادلة'
                          : 'مفتوحة'}
                  </span>
                </div>
              </div>

              <div className="mb-3 grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)]">
                <HistoricalTradeChart symbol={selected.symbol} trade={selected.record} />
                <div className="flex flex-col gap-2">
                  <div className="rounded-xl border border-slate-700 bg-slate-950/90 px-3 py-2">
                    <span className="mb-1 block text-slate-200">ملخص الصفقة</span>
                    <p className="text-[11px] text-slate-300">
                      {selected.record.notesAr ??
                        'لا يوجد ملخص تفصيلي مسجل لهذه الصفقة، سيتم ملؤه مع تراكم البيانات.'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-700 bg-slate-950/90 px-3 py-2">
                    <span className="mb-1 block text-slate-200">سبب النتيجة</span>
                    <p className="text-[11px] text-slate-300">
                      {selected.record.result === 'win' &&
                      selected.record.successReasonAr
                        ? selected.record.successReasonAr
                        : selected.record.result === 'loss' &&
                            selected.record.failureReasonAr
                          ? selected.record.failureReasonAr
                          : 'تم تسجيل النتيجة بدون سبب تفصيلي، سيتم تحسين التوثيق مع تطور المحرك.'}
                    </p>
                  </div>
                  <div className="grid gap-1 text-[10px] text-slate-400 lg:grid-cols-3">
                    <span>
                      دخول:{' '}
                      {selected.record.entryPrice
                        ? selected.record.entryPrice.toFixed(2)
                        : '—'}
                    </span>
                    <span>
                      وقف:{' '}
                      {selected.record.stopLoss
                        ? selected.record.stopLoss.toFixed(2)
                        : '—'}
                    </span>
                    <span>
                      خروج:{' '}
                      {selected.record.exitPrice
                        ? selected.record.exitPrice.toFixed(2)
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

