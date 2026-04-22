import { useState } from 'react'
import { motion } from 'framer-motion'
import ChartDisabled from '../components/ChartDisabled'
import TelegramShareButton from '../components/TelegramShareButton'
import { formatSignalForSharing } from '../utils/telegramShare'
import { useEngineSnapshot } from '../hooks/useEngineSnapshot'
import { assessSignalPhilosophy } from '../engine/tradingPhilosophyEngine'
import { confidenceLabelAr, tradeStyleLabelAr } from '../domain/mappers'

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
}

export default function StocksPage() {
  const { snapshot, error } = useEngineSnapshot()

  const stocks = snapshot?.stocks ?? []
  const watchlistSymbols =
    snapshot?.watchlists[0]?.symbols ?? stocks.map((s) => s.symbol)

  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(
    watchlistSymbols[0] ?? null,
  )

  const effectiveSymbol = selectedSymbol ?? watchlistSymbols[0] ?? stocks[0]?.symbol

  const stockSignals =
    snapshot?.signals.filter((s) => s.symbol === effectiveSymbol) ?? []
  const bestSignal = stockSignals[0]

  const stockNews =
    snapshot?.newsItems.filter((n) => n.symbol === effectiveSymbol) ?? []
  const stockPersonality = snapshot?.personalities.find(
    (p) => p.symbol === effectiveSymbol,
  )

  const bestSignalAssessment =
    bestSignal && snapshot?.market
      ? assessSignalPhilosophy({
          signal: bestSignal,
          market: snapshot.market,
          personality: stockPersonality,
          optionSuggestion:
            snapshot.optionSuggestions.find(
              (o) => o.linkedSignalId === bestSignal.id,
            ) ?? null,
        })
      : null

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-xs text-rose-200">
        {error}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 text-xs">
      <motion.header
        className="flex flex-wrap items-center justify-between gap-3"
        {...fadeInUp}
      >
        <div>
          <h2 className="mb-1 text-base font-semibold text-slate-50">
            منصة تحليل الأسهم المباشرة
          </h2>
          <p className="max-w-xl text-[11px] text-slate-300">
            شاشة تركّز بصرياً على الشارت، مع قائمة مراقبة، فلاتر حسب نوع الفرصة، ولوحة
            تحليل مختصرة توضح الاتجاه، الفوليوم، الدعم والمقاومة، الزخم، ونسبة المخاطرة
            إلى العائد.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="rounded-full border border-slate-600 bg-slate-900/70 px-3 py-1.5 text-[11px] text-slate-100 hover:border-sky-400 hover:text-sky-100">
            إضافة سهم إلى المراقبة
          </button>
          <button className="rounded-full bg-sky-500/90 px-3 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-sky-400">
            حفظ إعدادات الشاشة الحالية
          </button>
        </div>
      </motion.header>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2.1fr)_minmax(0,1.4fr)]">
        <motion.aside
          className="glass-panel flex flex-col gap-3 border border-slate-700/70 bg-slate-950/95 px-3 py-3"
          {...fadeInUp}
          transition={{ delay: 0.05 }}
        >
          <div className="flex items-center justify-between text-[11px] text-slate-200">
            <span className="font-medium">قائمة الأسهم المراقبة</span>
            <span className="rounded-full bg-slate-900/70 px-2 py-0.5 text-[10px] text-slate-400">
              يمكن تخصيصها من لوحة الإدارة
            </span>
          </div>

          <div className="flex flex-wrap gap-1 text-[11px]">
            {watchlistSymbols.map((symbol) => (
              <button
                key={symbol}
                onClick={() => setSelectedSymbol(symbol)}
                className={`rounded-full border px-2.5 py-1 text-[11px] ${
                  symbol === effectiveSymbol
                    ? 'border-sky-400 bg-sky-500/20 text-sky-100'
                    : 'border-slate-700 bg-slate-900/70 text-slate-100 hover:border-sky-400 hover:text-sky-100'
                }`}
              >
                {symbol}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-1 text-[11px]">
            <span className="text-slate-200">الفلاتر حسب نوع الفرصة</span>
            <div className="flex flex-wrap gap-1">
              {[
                'اختراق مؤكد',
                'ارتداد من دعم',
                'استرجاع VWAP',
                'استمرار اتجاه',
                'افتتاحية نطاق',
                'انعكاس بزخم',
              ].map((filter) => (
                <button
                  key={filter}
                  className="rounded-full bg-slate-900/80 px-2.5 py-1 text-[10px] text-slate-200 hover:bg-sky-500/15 hover:text-sky-100"
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </motion.aside>

        <motion.section
          className="flex flex-col gap-3"
          {...fadeInUp}
          transition={{ delay: 0.1 }}
        >
          <ChartDisabled />
          {bestSignal && (
            <div className="flex justify-end">
              <TelegramShareButton text={formatSignalForSharing(bestSignal)} />
            </div>
          )}
          <div className="grid gap-3 text-[11px] lg:grid-cols-4">
            <div className="glass-panel flex flex-col gap-1 border border-emerald-500/40 bg-slate-950/90 px-3 py-2">
              <span className="text-slate-200">الاتجاه والهيكل السعري</span>
              {stockPersonality ? (
                <p className="text-slate-300">{stockPersonality.summaryAr}</p>
              ) : bestSignal ? (
                <p className="text-slate-300">
                  {bestSignal.explanation.contextAr ?? bestSignal.explanation.bodyAr}
                </p>
              ) : (
                <p className="text-slate-300">
                  لا توجد حالياً قراءة متكاملة للهيكل السعري لهذا السهم، سيتم تحديثها مع
                  توفر إشارات وهيستوري كافيين.
                </p>
              )}
            </div>
            <div className="glass-panel flex flex-col gap-1 border border-sky-500/40 bg-slate-950/90 px-3 py-2">
              <span className="text-slate-200">الفوليوم والزخم</span>
              {bestSignal ? (
                <p className="text-slate-300">
                  هذه الإشارة تعكس مزيجاً من الزخم والفوليوم الملائمين لنوع الفرصة{' '}
                  {tradeStyleLabelAr(bestSignal.tradeStyle)}، مع درجة ثقة{' '}
                  {confidenceLabelAr(bestSignal.confidence)}.
                </p>
              ) : (
                <p className="text-slate-300">
                  لا توجد حالياً إشارة قوية على هذا السهم، لذلك لا يتم عرض توصيف تفصيلي
                  للزخم والفوليوم.
                </p>
              )}
            </div>
            <div className="glass-panel flex flex-col gap-1 border border-amber-500/40 bg-slate-950/90 px-3 py-2">
              <span className="text-slate-200">نسبة المخاطرة إلى العائد</span>
              {bestSignal ? (
                <p className="text-slate-300">
                  ريشيو المخاطرة إلى العائد التقريبي هو{' '}
                  {bestSignal.riskReward.riskRewardRatio.toFixed(2)}، مع وقف خسارة واضح
                  وأهداف مبنية على مناطق سعرية منطقية.
                </p>
              ) : (
                <p className="text-slate-300">
                  لم تُحدد بعد فرصة مناسبة على هذا السهم، لذلك لا يمكن تقديم ريشيو دقيق
                  للمخاطرة إلى العائد حالياً.
                </p>
              )}
            </div>
            <div className="glass-panel flex flex-col gap-1 border border-emerald-500/40 bg-slate-950/90 px-3 py-2">
              <span className="text-slate-200">تصنيف الفرصة (A+ / جيدة / مقبولة)</span>
              {bestSignalAssessment ? (
                <>
                  <p className="text-[11px] text-emerald-300">
                    {bestSignalAssessment.setupQuality === 'A_PLUS'
                      ? 'هذه الفرصة من فئة A+ بحسب معايير المنصة.'
                      : bestSignalAssessment.setupQuality === 'GOOD'
                        ? 'هذه فرصة جيدة لكنها ليست من فئة A+ على كل المحاور.'
                        : 'هذه فرصة مقبولة يمكن التعامل معها بحجم محافظ.'}
                  </p>
                  <p className="text-[10px] text-slate-300">
                    {bestSignalAssessment.edgeLabelAr}
                  </p>
                </>
              ) : (
                <p className="text-[10px] text-slate-300">
                  سيتم تقييم جودة الفرصة عندما تتوفر إشارة واضحة على هذا السهم.
                </p>
              )}
            </div>
          </div>
        </motion.section>

        <motion.aside
          className="glass-panel flex flex-col gap-3 border border-slate-700/70 bg-slate-950/95 px-3 py-3"
          {...fadeInUp}
          transition={{ delay: 0.15 }}
        >
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium text-slate-100">لوحة التحليل المختصرة</span>
            <span className="rounded-full bg-slate-900/70 px-2 py-0.5 text-[10px] text-slate-400">
              يتم ربطها لاحقاً بمحرك التحليل
            </span>
          </div>

          <div className="grid gap-2 text-[11px]">
            <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2">
              <span className="text-slate-200">سياق السوق العام</span>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-200">
                {bestSignal
                  ? confidenceLabelAr(bestSignal.confidence)
                  : 'لا توجد إشارة قوية حالياً'}
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2">
              <span className="text-slate-200">أهم الدعوم والمقاومات</span>
              <p className="text-slate-300">
                يتم استنتاج مناطق الوقف والأهداف من منطق الإشارة الحالية ونسب المخاطرة إلى
                العائد؛ ستظهر تفاصيل أكثر في صفحة تفاصيل الأصل.
              </p>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2">
              <span className="text-slate-200">أهم الأخبار المرتبطة بالسهم</span>
              {stockNews.length ? (
                <ul className="list-disc space-y-1 pr-4 text-slate-300">
                  {stockNews.slice(0, 3).map((n) => (
                    <li key={n.id} className="text-[11px]">
                      {n.titleAr}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-300">
                  لا توجد حالياً أخبار بارزة مسجلة على هذا السهم في المحرك.
                </p>
              )}
            </div>
          </div>
        </motion.aside>
      </section>
      <section className="glass-panel mt-[-4px] border border-slate-700/70 bg-slate-950/95 px-3 py-3 text-[11px]">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-medium text-slate-100">الإشارات الحالية على {effectiveSymbol}</span>
        </div>
        <div className="soft-scrollbar flex max-h-40 flex-col gap-1.5 overflow-auto pr-1">
          {stockSignals.length ? (
            stockSignals.map((signal) => (
              <div
                key={signal.id}
                className="flex items-start justify-between rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-slate-100">{signal.explanation.titleAr}</span>
                  <span className="text-[10px] text-emerald-200">
                    {tradeStyleLabelAr(signal.tradeStyle)}
                  </span>
                  <p className="text-[10px] text-slate-300">
                    {signal.explanation.bodyAr}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-200">
                  {confidenceLabelAr(signal.confidence)}
                </span>
              </div>
            ))
          ) : (
            <p className="text-slate-300">
              لا توجد حالياً إشارات نشطة على هذا السهم من محرك التحليل.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}

