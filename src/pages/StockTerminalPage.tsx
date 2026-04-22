import { Navigate, useParams } from 'react-router-dom'
import TradingChart from '../components/TradingChart'
import { TerminalPageHeader } from '../components/terminal/TerminalPageHeader'
import { STOCK_TERMINAL_SYMBOLS } from '../config/terminalSymbols'
import { useTradingTerminalState } from '../hooks/useTradingTerminalState'
import type { TerminalStockSetup } from '../terminal/stockSetupEngine'
import {
  formatContractExpiryAr,
  pickOptionSuggestionForSignal,
} from '../terminal/optionSuggestionPick'

export default function StockTerminalPage() {
  const { symbol: routeSymbol } = useParams()
  const t = useTradingTerminalState(STOCK_TERMINAL_SYMBOLS, '/stocks', routeSymbol)

  if (t.routeInvalid) {
    return <Navigate to={`/stocks/${t.defaultSymbol}`} replace />
  }

  const stateColor = (s: TerminalStockSetup['state']) => {
    if (s === 'قابلة للتنفيذ') return 'text-emerald-300 border-emerald-500/40'
    if (s === 'ملغاة') return 'text-rose-300 border-rose-500/40'
    return 'text-amber-200 border-amber-500/40'
  }

  return (
    <>
      <TerminalPageHeader
        title="محطة الأسهم"
        subtitle="NVDA · AMZN · GOOGL — إشارات، شارت، وتنفيذ السهم (بدون تشتيت أوبشن)"
        symbols={STOCK_TERMINAL_SYMBOLS}
        selectedSymbol={t.selectedSymbol}
        onPickSymbol={t.goToSymbol}
        sessionLabel={t.sessionLabel}
        dataMode={t.dataMode}
        liveSession={t.liveSession}
        lastRefreshAt={t.lastRefreshAt}
        chartLivePrice={t.chartLivePrice}
        quoteSource={t.quoteSource}
        quoteUpdatedAt={t.quoteUpdatedAt}
      />

      {t.error && <p className="mb-3 text-sm text-rose-300">{t.error}</p>}
      {t.loading && !t.snapshot && <p className="mb-3 text-xs text-slate-500">جاري التحميل…</p>}

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)_380px]">
        <aside className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3">
          <h2 className="text-xs font-semibold text-slate-200">أفضل الفرص — أسهم المحطة</h2>
          <p className="text-[10px] leading-relaxed text-slate-500">
            مرتبة حسب قوة المحرك. اختر فكرة لعرضها على الشارت ولوحة التنفيذ.
          </p>
          <div className="max-h-[70vh] space-y-2 overflow-auto pr-1">
            {t.liveSession !== 'OPEN' && (
              <p className="rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-1.5 text-[10px] text-slate-400">
                الجلسة الرسمية مغلقة: الإشارات للمراجعة؛ التنبيه التلقائي لتيليجرام أثناء الجلسة المفتوحة
                فقط.
              </p>
            )}
            {t.stockSetups.length === 0 && (
              <p className="text-[11px] text-slate-500">لا توجد إشارات مطابقة بعد لهذه الدورة.</p>
            )}
            {t.stockSetups.map((item) => {
              const optPick = pickOptionSuggestionForSignal(t.optionSuggestions, item.signal.id)
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    t.goToSymbol(item.symbol)
                    t.setSelectedSetupId(item.id)
                  }}
                  className={`w-full rounded-xl border p-2.5 text-right transition ${
                    item.id === t.activeSetup?.id && item.symbol === t.selectedSymbol
                      ? 'border-sky-500/60 bg-sky-950/20'
                      : 'border-slate-800 bg-slate-950/40 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-100">{item.symbol}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[9px] ${stateColor(item.state)}`}>
                      {item.state}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {item.setupTypeAr} • {item.directionAr} • {item.positionSizeAr}
                  </p>
                  <p className="text-[10px] text-slate-500">الثقة: {item.confidenceAr}</p>
                  {optPick ? (
                    <p className="mt-1 border-t border-slate-800/80 pt-1 font-mono text-[10px] text-violet-200/90">
                      سترايك: {optPick.contract.strike} · انتهاء العقد:{' '}
                      {formatContractExpiryAr(optPick.contract.expiry)}
                    </p>
                  ) : (
                    <p className="mt-1 text-[9px] text-slate-600">أوبشن مقترح: غير متاح من المحرك لهذه الإشارة</p>
                  )}
                </button>
              )
            })}
          </div>
        </aside>

        <main className="space-y-4">
          <TradingChart
            symbol={t.selectedSymbol}
            liveLastPrice={t.chartLivePrice}
            executionSetup={t.chartExecutionSetup}
            dataMode={t.dataMode}
          />
        </main>

        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3">
          <h2 className="mb-2 text-xs font-semibold text-emerald-200">تنفيذ السهم</h2>
          {!t.activeSetup ? (
            <p className="text-[11px] text-slate-500">لا توجد إعدادات لهذا الرمز حالياً.</p>
          ) : (
            <div className="max-h-[72vh] space-y-2 overflow-auto pr-1 text-[11px] text-slate-300">
              <p className={`inline-block rounded-lg border px-2 py-1 ${stateColor(t.activeSetup.state)}`}>
                {t.activeSetup.state}
              </p>
              <p>
                النوع: <span className="text-slate-100">{t.activeSetup.setupTypeAr}</span> —{' '}
                {t.activeSetup.strategyKey}
              </p>
              <p>
                منطقة الدخول:{' '}
                <span className="font-mono text-emerald-300">
                  {t.activeSetup.entryMin.toFixed(2)} – {t.activeSetup.entryMax.toFixed(2)}
                </span>
              </p>
              <p>
                وقف الخسارة:{' '}
                <span className="font-mono text-rose-300">{t.activeSetup.stop.toFixed(2)}</span>
              </p>
              <p>
                الأهداف:{' '}
                <span className="font-mono text-sky-300">
                  {t.activeSetup.targets.map((x) => x.toFixed(2)).join(' / ')}
                </span>{' '}
                <span className="text-slate-500">(هدف 1 ≈ {t.activeSetup.target1Pct.toFixed(1)}%)</span>
              </p>
              <p>حجم المركز المقترح: {t.activeSetup.positionSizeAr}</p>
              <p className="text-slate-500">{t.activeSetup.dailyAmountNoteAr}</p>
              <p className="text-slate-400">{t.activeSetup.stopLogicAr}</p>
              {t.activeSetup.nearTarget1TrailRule && (
                <p className="rounded-lg border border-amber-500/40 bg-amber-950/30 px-2 py-1.5 text-amber-200">
                  يفضّل رفع وقف الخسارة إلى نقطة الدخول — السعر قريب جداً من الهدف 1 دون تحقيقه بالكامل.
                </p>
              )}
              <p className="text-[10px] leading-relaxed text-slate-500">{t.activeSetup.rationaleAr}</p>
              {(() => {
                const opt = pickOptionSuggestionForSignal(t.optionSuggestions, t.activeSetup.signal.id)
                return opt ? (
                  <p className="rounded-lg border border-violet-500/30 bg-violet-950/20 px-2 py-1.5 font-mono text-[10px] text-violet-200">
                    توصية أوبشن مرتبطة: سترايك {opt.contract.strike} — انتهاء{' '}
                    {formatContractExpiryAr(opt.contract.expiry)} ({opt.contract.type === 'call' ? 'Call' : 'Put'})
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-600">
                    لا يوجد عقد أوبشن مرتبط بهذه الإشارة في بيانات المحرك الحالية.
                  </p>
                )
              })()}
            </div>
          )}
        </section>
      </div>

      <footer className="mt-6 border-t border-slate-800/80 pt-4 text-center text-[10px] text-slate-600">
        للتركيز على عقود الأوبشن و SPX انتقل إلى{' '}
        <span className="text-slate-400">محطة الأوبشن</span> من الشريط العلوي. التنبيهات التلقائية عند
        التنفيذ ووضع LIVE.
      </footer>
    </>
  )
}
