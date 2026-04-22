import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import ChartDisabled from '../components/ChartDisabled'
import TelegramShareButton from '../components/TelegramShareButton'
import { formatSignalForSharing } from '../utils/telegramShare'
import { useEngineSnapshot } from '../hooks/useEngineSnapshot'
import { assessSignalPhilosophy } from '../engine/tradingPhilosophyEngine'
import { confidenceLabelAr, tradeStyleLabelAr } from '../domain/mappers'
import { sendExecutionZoneTrade } from '../services/telegramService'

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
}

export default function AssetDetailsPage() {
  const { symbol } = useParams()
  const displaySymbol = symbol ?? 'SYMB'

  const { snapshot, error } = useEngineSnapshot()
  const [execSendStatus, setExecSendStatus] = useState<'idle' | 'sending' | 'success' | 'error'>(
    'idle',
  )
  const [execSendError, setExecSendError] = useState('')

  if (!symbol) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-xs text-slate-200">
        لم يتم تحديد رمز أصل لعرض ملفه التحليلي.
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-xs text-rose-200">
        {error}
      </div>
    )
  }

  const assetSignals =
    snapshot?.signals.filter((s) => s.symbol === symbol) ?? []
  const bestSignal = assetSignals[0]

  const assetScenarios =
    snapshot?.scenarios.filter((s) => s.symbol === symbol) ?? []
  const scenario = assetScenarios[0]

  const assetPersonality = snapshot?.personalities.find(
    (p) => p.symbol === symbol,
  )
  const assetHistory = snapshot?.histories.find((h) => h.symbol === symbol)
  const assetNews =
    snapshot?.newsItems.filter((n) => n.symbol === symbol) ?? []
  const assetOpinions =
    snapshot?.analystOpinions.filter((o) => o.symbol === symbol) ?? []

  const bestSignalAssessment =
    bestSignal && snapshot?.market
      ? assessSignalPhilosophy({
          signal: bestSignal,
          market: snapshot.market,
          personality: assetPersonality,
          optionSuggestion:
            snapshot.optionSuggestions.find(
              (o) => o.linkedSignalId === bestSignal.id,
            ) ?? null,
        })
      : null

  const dataMode = snapshot?.dataMode ?? 'MOCK'
  const isLive = dataMode === 'LIVE'

  const execZone =
    bestSignal && isLive
      ? (() => {
          const { entry, stop, targets } = bestSignal.riskReward
          const entryMin =
            bestSignal.direction === 'long'
              ? entry
              : entry * (1 - 0.002)
          const entryMax =
            bestSignal.direction === 'long'
              ? entry * (1 + 0.002)
              : entry
          const primaryTarget = targets[0]
          let risk = entry - stop
          let reward = primaryTarget - entry
          if (bestSignal.direction === 'short') {
            risk = stop - entry
            reward = entry - primaryTarget
          }
          const validRisk = risk > 0 && Number.isFinite(risk)
          const validReward = reward > 0 && Number.isFinite(reward)
          const rr = validRisk && validReward
            ? reward / risk
            : bestSignal.riskReward.riskRewardRatio
          return {
            entryMin,
            entryMax,
            stop,
            targets,
            rr,
          }
        })()
      : null

  const handleSendExecutionZone = async () => {
    if (!bestSignal || !isLive) return
    setExecSendStatus('sending')
    setExecSendError('')
    const result = await sendExecutionZoneTrade(bestSignal)
    if (result.ok) {
      setExecSendStatus('success')
      setTimeout(() => setExecSendStatus('idle'), 2500)
    } else {
      setExecSendStatus('error')
      setExecSendError(result.error ?? 'فشل الإرسال')
    }
  }

  if (!snapshot || (!bestSignal && !assetPersonality && !assetHistory)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-xs text-slate-200">
        لا توجد حالياً بيانات تحليلية كافية لعرض ملف السهم {symbol}، سيتم تقديم ملف
        كامل عند توفر المزيد من الهيستوري والإشارات.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 text-xs">
      <motion.header
        className="flex flex-wrap items-center justify-between gap-2"
        {...fadeInUp}
      >
        <div>
          <h2 className="mb-1 text-base font-semibold text-slate-50">
            ملف الأصل التحليلي — {displaySymbol}
          </h2>
          <p className="max-w-xl text-[11px] text-slate-300">
            صفحة مخصصة تعرض الشارت الكبير، التحليل المختصر، الإشارات الحالية، الأخبار
            ذات الصلة، آراء المحللين، التوقع لليوم التالي، وسجل تاريخي للإشارات السابقة
            على هذا الأصل.
          </p>
        </div>
      </motion.header>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1.4fr)]">
        <motion.div
          className="flex flex-col gap-3"
          {...fadeInUp}
          transition={{ delay: 0.05 }}
        >
          <ChartDisabled />
          {bestSignal && (
            <div className="flex justify-end">
              <TelegramShareButton text={formatSignalForSharing(bestSignal)} />
            </div>
          )}

          <div className="grid gap-3 text-[11px] lg:grid-cols-3">
            <div className="glass-panel flex flex-col gap-1 border border-emerald-500/40 bg-slate-950/95 px-3 py-2">
              <span className="text-slate-200">التحليل المختصر</span>
              {assetPersonality ? (
                <p className="text-slate-300">{assetPersonality.summaryAr}</p>
              ) : bestSignal ? (
                <p className="text-slate-300">
                  {bestSignal.explanation.contextAr ?? bestSignal.explanation.bodyAr}
                </p>
              ) : (
                <p className="text-slate-300">
                  لا توجد حالياً قراءة مختصرة جاهزة لهذا السهم، سيتم تحديثها مع توفر مزيد
                  من الهيستوري.
                </p>
              )}
            </div>
            <div className="glass-panel flex flex-col gap-1 border border-sky-500/40 bg-slate-950/95 px-3 py-2">
              <span className="text-slate-200">أهم الإشارات الحالية</span>
              {assetSignals.length ? (
                <ul className="list-disc space-y-1 pr-4 text-slate-300">
                  {assetSignals.map((s) => (
                    <li key={s.id}>
                      {s.explanation.titleAr} —{' '}
                      {tradeStyleLabelAr(s.tradeStyle)} —{' '}
                      {confidenceLabelAr(s.confidence)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-300">
                  لا توجد حالياً إشارات نشطة مسجلة لهذا الأصل في المحرك.
                </p>
              )}
            </div>
            <div className="glass-panel flex flex-col gap-1 border border-amber-500/40 bg-slate-950/95 px-3 py-2">
              <span className="text-slate-200">توقع الجلسة القادمة</span>
              {scenario ? (
                <p className="text-slate-300">{scenario.reasonAr}</p>
              ) : (
                <p className="text-slate-300">
                  لم يتم توليد سيناريو واضح لجلسة الغد على هذا السهم حتى الآن.
                </p>
              )}
            </div>
            <div className="glass-panel flex flex-col gap-2 border border-slate-700/70 bg-slate-950/95 px-3 py-2">
              <span className="text-slate-200">📊 مناطق الدخول</span>
              {!isLive || !bestSignal ? (
                <p className="text-[11px] text-amber-300">
                  ⚠️ لا يمكن عرض مناطق الدخول — البيانات ليست LIVE أو لا توجد إشارة حالية.
                </p>
              ) : execZone ? (
                <>
                  <p className="text-[11px] text-slate-300">
                    الاتجاه:{' '}
                    <span className="font-semibold text-emerald-300">
                      {bestSignal.direction === 'long' ? 'LONG (شراء)' : 'SHORT (بيع/حماية)'}
                    </span>
                  </p>
                  <div className="grid gap-1 text-[11px] sm:grid-cols-2">
                    <div>
                      <span className="text-slate-400">Entry Zone</span>
                      <p className="font-mono text-emerald-300">
                        {execZone.entryMin.toFixed(2)} – {execZone.entryMax.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Stop Loss</span>
                      <p className="font-mono text-rose-300">{execZone.stop.toFixed(2)}</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Targets</span>
                    <p className="font-mono text-sky-300">
                      {execZone.targets.map((t) => t.toFixed(2)).join(' / ')}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Risk/Reward</span>
                    <p className="font-mono text-emerald-300">
                      {execZone.rr && Number.isFinite(execZone.rr) && execZone.rr > 0
                        ? `1:${execZone.rr.toFixed(2)}`
                        : '—'}
                    </p>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSendExecutionZone}
                      disabled={execSendStatus === 'sending'}
                      className="rounded-full bg-sky-600 px-3 py-1.5 text-[11px] font-semibold text-slate-50 hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {execSendStatus === 'sending'
                        ? 'جاري الإرسال...'
                        : 'إرسال هذه الصفقة إلى Telegram'}
                    </button>
                    {execSendStatus === 'success' && (
                      <span className="text-[11px] text-emerald-400">تم الإرسال بنجاح</span>
                    )}
                    {execSendStatus === 'error' && (
                      <span className="text-[11px] text-rose-400" title={execSendError}>
                        فشل الإرسال
                      </span>
                    )}
                  </div>
                </>
              ) : null}
            </div>
            <div className="glass-panel flex flex-col gap-1 border border-emerald-500/40 bg-slate-950/95 px-3 py-2">
              <span className="text-slate-200">خلاصة القناعة مقابل المخاطرة</span>
              {bestSignalAssessment ? (
                <>
                  <p className="text-[11px] text-emerald-300">
                    {bestSignalAssessment.executionRiskLabelAr}
                  </p>
                  {bestSignalAssessment.buffettBiasLabelAr && (
                    <p className="text-[10px] text-slate-300">
                      {bestSignalAssessment.buffettBiasLabelAr}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-[10px] text-slate-300">
                  لا توجد حالياً إشارة أساسية كافية لبناء خلاصة قناعة/مخاطرة على هذا الأصل.
                </p>
              )}
            </div>
          </div>
        </motion.div>

        <motion.aside
          className="glass-panel flex flex-col gap-3 border border-slate-700/70 bg-slate-950/95 px-3 py-3"
          {...fadeInUp}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium text-slate-100">سجل الإشارات التاريخية</span>
            <span className="rounded-full bg-slate-900/70 px-2 py-0.5 text-[10px] text-slate-400">
              جزء من الهيستوري التحليلي لهذا السهم
            </span>
          </div>
          <div className="soft-scrollbar flex max-h-64 flex-col gap-1.5 overflow-auto pr-1">
            {assetHistory && assetHistory.records.length ? (
              assetHistory.records.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-[11px] text-slate-200"
                >
                  <div className="flex items-center justify-between">
                    <span>{r.strategy}</span>
                    <span>{r.result === 'win' ? 'ناجحة' : r.result === 'loss' ? 'خاسرة' : 'محايدة'}</span>
                  </div>
                  {r.notesAr && <p className="mt-1 text-[10px] text-slate-300">{r.notesAr}</p>}
                </div>
              ))
            ) : (
              <p className="text-slate-300">
                لا يوجد بعد سجل إشارات تحليلي كافٍ لهذا السهم.
              </p>
            )}
          </div>

          <div className="grid gap-2 text-[11px]">
            <div className="flex flex-col gap-1 rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2">
              <span className="text-slate-200">أخبار وآراء مرتبطة بالسهم</span>
              {assetNews.length || assetOpinions.length ? (
                <ul className="space-y-1 text-slate-300">
                  {assetNews.slice(0, 3).map((n) => (
                    <li key={n.id} className="text-[10px]">
                      خبر: {n.titleAr}
                    </li>
                  ))}
                  {assetOpinions.slice(0, 3).map((o) => (
                    <li key={o.id} className="text-[10px]">
                      رأي محلل: {o.summaryAr}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-300">
                  لا توجد حالياً أخبار أو آراء محللين مسجلة على هذا السهم في المحرك.
                </p>
              )}
            </div>
            {assetPersonality && (
              <div className="flex flex-col gap-1 rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2">
                <span className="text-slate-200">أفضل وأضعف الاستراتيجيات للسهم</span>
                <p className="text-[10px] text-slate-300">
                  أفضل الاستراتيجيات:
                  {' '}
                  {assetPersonality.bestStrategies
                    .map((s) => s.strategy)
                    .join('، ')}
                </p>
                <p className="text-[10px] text-slate-300">
                  الاستراتيجيات الأقل مناسبة:
                  {' '}
                  {assetPersonality.weakStrategies
                    .map((s) => s.strategy)
                    .join('، ')}
                </p>
              </div>
            )}
          </div>
        </motion.aside>
      </section>
    </div>
  )
}

