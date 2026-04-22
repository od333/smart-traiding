import { motion } from 'framer-motion'
import { Link, NavLink } from 'react-router-dom'
import ChartDisabled from '../components/ChartDisabled'
import TelegramShareButton from '../components/TelegramShareButton'
import { formatSignalForSharing } from '../utils/telegramShare'
import { useEngineSnapshot } from '../hooks/useEngineSnapshot'
import { assessSignalPhilosophy } from '../engine/tradingPhilosophyEngine'
import {
  confidenceLabelAr,
  marketMoodLabelAr,
  scenarioLabelAr,
  tradeStyleLabelAr,
} from '../domain/mappers'

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
}

export default function HomeDashboard() {
  const { snapshot, loading, error } = useEngineSnapshot()

  const market = snapshot?.market
  const signals = snapshot?.signals ?? []
  const scenarios = snapshot?.scenarios ?? []
  const watchlist = snapshot?.watchlists[0]
  const newsItems = snapshot?.newsItems ?? []
  const personalities = snapshot?.personalities ?? []

  const firstSignal = signals[0]
  const topSignals = signals.slice(0, 3)
  const topScenarios = scenarios.slice(0, 2)

  const allHistoryRecords = snapshot?.histories.flatMap((h) => h.records) ?? []
  const recentRecords = allHistoryRecords.slice(-50)
  const wins = recentRecords.filter((r) => r.result === 'win').length
  const winRate =
    recentRecords.length > 0 ? (wins / recentRecords.length) * 100 : undefined

  const firstSignalPersonality =
    firstSignal && personalities.find((p) => p.symbol === firstSignal.symbol)

  const firstSignalAssessment =
    firstSignal && market
      ? assessSignalPhilosophy({
          signal: firstSignal,
          market,
          personality: firstSignalPersonality,
          optionSuggestion:
            snapshot?.optionSuggestions.find(
              (o) => o.linkedSignalId === firstSignal.id,
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
    <div className="flex flex-col gap-4">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,2.3fr)_minmax(0,1.4fr)]">
        <motion.div
          className="glass-panel relative overflow-hidden border border-sky-500/40 bg-gradient-to-br from-slate-950/90 via-slate-950/80 to-sky-950/40 px-6 pb-6 pt-5"
          {...fadeInUp}
          transition={{ duration: 0.5 }}
        >
          <div className="pointer-events-none absolute -left-32 top-0 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -right-24 -bottom-10 h-52 w-52 rounded-full bg-violet-500/20 blur-3xl" />

          <div className="relative flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="mb-1 bg-gradient-to-l from-sky-300 via-cyan-100 to-emerald-200 bg-clip-text text-2xl font-semibold text-transparent lg:text-3xl">
                  كل ما يهم المتداول في شاشة واحدة
                </h1>
                <p className="max-w-xl text-sm text-slate-300">
                  منصة عربية متخصصة في قراءة سياق السوق الأمريكي وفرص الأوبشن باحتمالات
                  عالية، لا تكتفي بوصف الأسعار بل تنتقي اللحظات التي يكون فيها الاحتمال في
                  صالحك مع مخاطرة منضبطة.
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 text-xs">
                <div
                  className={
                    snapshot?.marketOpen
                      ? "inline-flex items-center gap-2 rounded-full border border-emerald-400/50 bg-emerald-500/10 px-3 py-1 text-emerald-100 shadow-soft-glow"
                      : snapshot?.marketSession === "PREMARKET"
                        ? "inline-flex items-center gap-2 rounded-full border border-amber-400/50 bg-amber-500/10 px-3 py-1 text-amber-100"
                        : "inline-flex items-center gap-2 rounded-full border border-slate-500/50 bg-slate-500/10 px-3 py-1 text-slate-300"
                  }
                >
                  {loading
                    ? "Market Status: …"
                    : snapshot?.marketOpen
                      ? (
                          <>
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
                            Market Status: OPEN
                          </>
                        )
                      : snapshot?.marketSession === "PREMARKET"
                        ? "Market Status: PREMARKET"
                        : "Market Status: CLOSED"}
                </div>
                <div className="flex gap-2">
                  <button className="rounded-full bg-sky-500 px-4 py-1.5 text-xs font-semibold text-slate-950 shadow-soft-glow hover:bg-sky-400">
                    اشترك في النسخة الاحترافية
                  </button>
                  <Link
                    to="/pricing"
                    className="rounded-full border border-slate-600 bg-slate-900/40 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-sky-500/60 hover:text-sky-100"
                  >
                    تعرّف على الباقات
                  </Link>
                </div>
              </div>
            </div>

            <div className="grid gap-3 text-xs lg:grid-cols-4">
              <div className="glass-panel flex flex-col gap-1 border border-sky-500/40 bg-slate-950/70 px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">فرص اليوم الفعلية</span>
                  <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] text-sky-100">
                    يتم تحديثها لحظياً
                  </span>
                </div>
                <span className="text-lg font-semibold text-sky-200">
                  {loading ? '…' : signals.length}
                  <span className="mr-1 text-xs font-normal text-slate-400">
                    سهم / عقد
                  </span>
                </span>
              </div>

              <div className="glass-panel flex flex-col gap-1 border border-emerald-500/40 bg-slate-950/70 px-3 py-2">
                <span className="text-slate-300">نسبة نجاح آخر ٥٠ إشارة</span>
                <span className="text-lg font-semibold text-emerald-300">
                  {loading || winRate === undefined
                    ? '…'
                    : `${winRate.toFixed(0)}٪`}
                </span>
                <span className="text-[10px] text-slate-400">
                  مبنية على تنفيذ منضبط لنقاط الدخول والوقف
                </span>
              </div>

              <div className="glass-panel flex flex-col gap-1 border border-amber-500/40 bg-slate-950/70 px-3 py-2">
                <span className="text-slate-300">تنبيهات الغد المحضّرة</span>
                <span className="text-lg font-semibold text-amber-300">
                  {loading ? '…' : scenarios.length}
                </span>
                <span className="text-[10px] text-slate-400">
                  أسهم تستعد لحركات محتملة: اختراق / ارتداد / فجوة
                </span>
              </div>

              <div className="glass-panel flex flex-col gap-1 border border-violet-500/40 bg-slate-950/70 px-3 py-2">
                <span className="text-slate-300">عدد الأسهم تحت المراقبة</span>
                <span className="text-lg font-semibold text-violet-200">
                  {loading
                    ? '…'
                    : watchlist?.symbols.length ?? snapshot?.stocks.length ?? 0}
                </span>
                <span className="text-[10px] text-slate-400">
                  لكل سهم ملف سلوكي وهيستوري تحليلي خاص
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.aside
          className="glass-panel flex flex-col gap-3 border border-slate-700/60 bg-slate-950/80 px-4 py-4"
          {...fadeInUp}
          transition={{ duration: 0.5, delay: 0.08 }}
        >
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="font-medium text-slate-100">ملخص نبض السوق الآن</span>
            <span className="rounded-full bg-slate-900/70 px-2 py-0.5 text-[10px] text-slate-400">
              يتم تحديثه مع تغير الجلسة
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-slate-200">
                  {market?.indices[0]?.indexName ?? '—'}
                </span>
                <span className="text-[10px] text-emerald-300">
                  {market?.indices[0]?.descriptionAr ?? ''}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-emerald-300">
                  {market
                    ? `${market.indices[0]?.changePercent.toFixed(1)}٪`
                    : '…'}
                </span>
                <span className="text-[11px] text-emerald-200">
                  يفضّل فرص استمرار الاتجاه والاختراقات المؤكدة
                </span>
              </div>
            </div>
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-slate-200">
                  {market?.indices[1]?.indexName ?? '—'}
                </span>
                <span className="text-[10px] text-amber-200">
                  {market?.indices[1]?.descriptionAr ?? ''}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-amber-200">
                  {market
                    ? `${market.indices[1]?.changePercent.toFixed(1)}٪`
                    : '…'}
                </span>
                <span className="text-[11px] text-amber-100">
                  مناسب لصفقات زخم سريعة مع وقف منضبط
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-700/70 bg-slate-950/60 px-3 py-2 text-[11px] text-slate-300">
            <span>
              السياق العام:{' '}
              <span className="text-emerald-300">
                {market ? marketMoodLabelAr(market) : 'جارٍ قراءة سياق السوق...'}
              </span>
            </span>
            <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] text-sky-200">
              الفلسفة: جرأة منضبطة واحترام لاحتمالات السوق
            </span>
          </div>

          <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
            <NavLink
              to="/stocks"
              className="flex-1 rounded-full border border-sky-400/60 bg-sky-500/10 px-3 py-1.5 text-center font-medium text-sky-100 hover:bg-sky-500/20"
            >
              الانتقال لمنصة الأسهم
            </NavLink>
            <NavLink
              to="/options"
              className="flex-1 rounded-full border border-violet-400/60 bg-violet-500/10 px-3 py-1.5 text-center font-medium text-violet-100 hover:bg-violet-500/20"
            >
              الانتقال لمنصة الأوبشن
            </NavLink>
          </div>
        </motion.aside>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1.5fr)]">
        <motion.div
          className="flex flex-col gap-3"
          {...fadeInUp}
          transition={{ duration: 0.5, delay: 0.05 }}
        >
          <ChartDisabled />
          {firstSignal && (
            <div className="flex justify-end">
              <TelegramShareButton text={formatSignalForSharing(firstSignal)} />
            </div>
          )}

          <div className="grid gap-3 text-xs lg:grid-cols-4">
            <div className="glass-panel flex flex-col gap-1 border border-slate-700/70 bg-slate-950/80 px-3 py-2">
              <span className="text-slate-300">إشارة الدخول الحالية</span>
              {firstSignal ? (
                <p className="text-[11px] text-slate-400">
                  {firstSignal.explanation.contextAr ??
                    firstSignal.explanation.bodyAr}
                </p>
              ) : (
                <p className="text-[11px] text-slate-400">
                  لا توجد إشارة نشطة حالياً، سيتم عرض أول فرصة منطقية حال توفرها من
                  محرك التحليل.
                </p>
              )}
            </div>
            <div className="glass-panel flex flex-col gap-1 border border-slate-700/70 bg-slate-950/80 px-3 py-2">
              <span className="text-slate-300">نوع الفرصة</span>
              {firstSignal ? (
                <p className="text-[11px] text-sky-200">
                  {tradeStyleLabelAr(firstSignal.tradeStyle)} — ريشيو مخاطرة / عائد{' '}
                  {firstSignal.riskReward.riskRewardRatio.toFixed(2)}
                </p>
              ) : (
                <p className="text-[11px] text-sky-200">
                  سيتم اقتراح نوع الفرصة (سكالب / يومي / سوينق) عند توفر إشارة ذات أفضلية
                  منطقية.
                </p>
              )}
            </div>
            <div className="glass-panel flex flex-col gap-1 border border-slate-700/70 bg-slate-950/80 px-3 py-2">
              <span className="text-slate-300">درجة الثقة</span>
              {firstSignal ? (
                <p className="text-[11px] text-emerald-300">
                  {confidenceLabelAr(firstSignal.confidence)} — مبنية على مزيج من
                  الهيكل السعري، الزخم، الفوليوم، سياق السوق، الأخبار، وشخصية السهم.
                </p>
              ) : (
                <p className="text-[11px] text-emerald-300">
                  لم تُولد بعد إشارة بثقة كافية، يتم الانتظار حتى تتوفر أفضلية منطقية.
                </p>
              )}
            </div>
            <div className="glass-panel flex flex-col gap-1 border border-emerald-500/40 bg-slate-950/80 px-3 py-2">
              <span className="text-slate-300">جودة الفرصة وفق فلسفة المنصة</span>
              {firstSignalAssessment ? (
                <>
                  <p className="text-[11px] text-emerald-300">
                    {firstSignalAssessment.setupQuality === 'A_PLUS'
                      ? 'فرصة من فئة A+'
                      : firstSignalAssessment.setupQuality === 'GOOD'
                        ? 'فرصة جيدة'
                        : 'فرصة مقبولة بحجم محسوب'}
                  </p>
                  <p className="text-[10px] text-slate-300">
                    {firstSignalAssessment.qualityLabelAr}
                  </p>
                </>
              ) : (
                <p className="text-[10px] text-slate-300">
                  سيتم عرض تقييم جودة الفرصة بمجرد توفر إشارة رئيسية واضحة على الشاشة.
                </p>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div
          className="flex flex-col gap-3"
          {...fadeInUp}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="glass-panel flex flex-col gap-2 border border-slate-700/60 bg-slate-950/90 px-3 py-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-100">أفضل فرص اليوم</span>
              <span className="rounded-full bg-slate-900/70 px-2 py-0.5 text-[10px] text-slate-400">
                جميع الإشارات مبنية على محرك التحليل الاحتمالي
              </span>
            </div>
            <div className="soft-scrollbar flex max-h-64 flex-col gap-2 overflow-auto pr-1">
              {topSignals.map((signal) => (
                <div
                  key={signal.id}
                  className="flex items-start justify-between rounded-xl border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-[11px]"
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold text-sky-200">
                        {signal.symbol}
                      </span>
                      <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] text-sky-200">
                        {signal.explanation.titleAr}
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-200">
                      {tradeStyleLabelAr(signal.tradeStyle)}
                    </span>
                    <p className="mt-0.5 text-[10px] text-slate-300">
                      {signal.explanation.bodyAr}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-[10px]">
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-200">
                      {confidenceLabelAr(signal.confidence)}
                    </span>
                    <Link
                      to={`/asset/${signal.symbol}`}
                      className="rounded-full border border-slate-600 bg-slate-900/70 px-2 py-0.5 text-[10px] text-slate-200 hover:border-sky-400 hover:text-sky-100"
                    >
                      عرض التفاصيل
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel flex flex-col gap-2 border border-amber-500/40 bg-slate-950/95 px-3 py-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-100">توقع الغد</span>
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-100">
                تجهيز سيناريوهات Gaps والاختراقات المبكرة
              </span>
            </div>
            <div className="grid gap-2 text-[11px] lg:grid-cols-2">
              {topScenarios.map((scenario) => (
                <div
                  key={scenario.symbol + scenario.type}
                  className="rounded-xl border border-amber-500/50 bg-amber-500/10 px-3 py-2"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-slate-100">{scenario.symbol}</span>
                    <span className="text-[10px] text-amber-100">
                      {scenarioLabelAr(scenario.type)}
                    </span>
                  </div>
                  <p className="text-[10px] text-amber-50">{scenario.reasonAr}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.3fr)]">
        <motion.div
          className="glass-panel flex flex-col gap-2 border border-slate-700/70 bg-slate-950/95 px-3 py-3 text-xs"
          {...fadeInUp}
          transition={{ duration: 0.5, delay: 0.08 }}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-100">الأخبار المؤثرة اليوم</span>
            <span className="rounded-full bg-slate-900/70 px-2 py-0.5 text-[10px] text-slate-400">
              يتم وسم الخبر إيجابي / سلبي / محايد
            </span>
          </div>
          <div className="soft-scrollbar flex max-h-52 flex-col gap-1.5 overflow-auto pr-1">
            {newsItems.map((news) => {
              const color =
                news.tone === 'positive'
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-100'
                  : news.tone === 'negative'
                    ? 'bg-rose-500/10 border-rose-500/40 text-rose-100'
                    : 'bg-slate-800/80 border-slate-600 text-slate-100'

              const moodLabel =
                news.tone === 'positive'
                  ? 'إيجابي'
                  : news.tone === 'negative'
                    ? 'سلبي'
                    : 'محايد'

              return (
                <div
                  key={news.id}
                  className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-[11px] ${color}`}
                >
                  <span className="mt-0.5 rounded-full bg-slate-950/60 px-2 py-0.5 text-[10px]">
                    {news.symbol}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] opacity-80">{moodLabel}</span>
                    <p className="font-semibold">{news.titleAr}</p>
                    <p>{news.bodyAr}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>

        <motion.div
          className="flex flex-col gap-3"
          {...fadeInUp}
          transition={{ duration: 0.5, delay: 0.12 }}
        >
          <div className="glass-panel flex flex-col gap-2 border border-slate-700/70 bg-slate-950/95 px-3 py-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-100">آراء المحللين</span>
              <span className="rounded-full bg-slate-900/70 px-2 py-0.5 text-[10px] text-slate-400">
                يتم دمج الرأي مع قراءة النظام الآلية
              </span>
            </div>
            <div className="soft-scrollbar flex max-h-40 flex-col gap-1.5 overflow-auto pr-1">
              {personalities.slice(0, 2).map((profile) => (
                <div
                  key={profile.symbol}
                  className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-[11px] text-slate-100"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span>شخصية السهم {profile.symbol}</span>
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-100">
                      أفضلية:{' '}
                      {profile.preferredBias === 'momentum_runner'
                        ? 'زخم واستمرار اتجاه'
                        : profile.preferredBias === 'gap_player'
                          ? 'فجوات وحركات حادة'
                          : 'سلوك مختلط'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-200">{profile.summaryAr}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel flex flex-col gap-2 border border-sky-500/50 bg-sky-950/60 px-3 py-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-sky-100">
                  انضم لقناة تيليجرام وتلقّ التنبيهات فوراً
                </span>
                <p className="text-[11px] text-sky-100/80">
                  اشترك في القناة المجانية أو الفئة المدفوعة لتصلك إشارات الدخول والخروج
                  وفرص الغد مباشرة على تيليجرام.
                </p>
              </div>
              <div className="flex flex-col gap-1 text-[11px]">
                <button className="rounded-full bg-sky-400 px-4 py-1.5 text-xs font-semibold text-slate-950 shadow-soft-glow hover:bg-sky-300">
                  انضم الآن لقناة تيليجرام
                </button>
                <Link
                  to="/pricing"
                  className="text-xs text-sky-100 underline-offset-2 hover:underline"
                >
                  عرض مزايا النسخة المدفوعة
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  )
}

