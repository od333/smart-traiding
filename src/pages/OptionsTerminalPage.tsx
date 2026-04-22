import { Navigate, useParams } from 'react-router-dom'
import TradingChart from '../components/TradingChart'
import { TerminalPageHeader } from '../components/terminal/TerminalPageHeader'
import { OPTIONS_TERMINAL_SYMBOLS } from '../config/terminalSymbols'
import { useTradingTerminalState } from '../hooks/useTradingTerminalState'
import type { TerminalStockSetup } from '../terminal/stockSetupEngine'
import {
  formatContractExpiryAr,
  pickOptionSuggestionForBias,
  pickOptionSuggestionForSignal,
} from '../terminal/optionSuggestionPick'

export default function OptionsTerminalPage() {
  const { symbol: routeSymbol } = useParams()
  const t = useTradingTerminalState(OPTIONS_TERMINAL_SYMBOLS, '/options', routeSymbol)

  if (t.routeInvalid) {
    return <Navigate to={`/options/${t.defaultSymbol}`} replace />
  }

  const stateColor = (s: TerminalStockSetup['state']) => {
    if (s === 'قابلة للتنفيذ') return 'text-emerald-300 border-emerald-500/40'
    if (s === 'ملغاة') return 'text-rose-300 border-rose-500/40'
    return 'text-amber-200 border-amber-500/40'
  }

  return (
    <>
      <TerminalPageHeader
        title="محطة الأوبشن"
        subtitle="NVDA · AMZN · GOOGL · SPX — شارت لكل رمز + إعدادات أوبشن يومية (EMA50) ومقترحات المحرك"
        symbols={OPTIONS_TERMINAL_SYMBOLS}
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

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)_400px]">
        <aside className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3">
          <h2 className="text-xs font-semibold text-slate-200">سياق الإشارات (للمرجعية)</h2>
          <p className="text-[10px] leading-relaxed text-slate-500">
            نفس فرص المحرك للرموز المعروضة هنا؛ اختر عنصراً لمزامنة الرمز مع الشارت. تفاصيل التنفيذ
            على السهم تجدها في محطة الأسهم.
          </p>
          <div className="max-h-[70vh] space-y-2 overflow-auto pr-1">
            {t.liveSession !== 'OPEN' && (
              <p className="rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-1.5 text-[10px] text-slate-400">
                جلسة مغلقة: تحليل أوبشن للتحضير؛ التنبيهات التلقائية أثناء الجلسة المفتوحة.
              </p>
            )}
            {t.stockSetups.length === 0 && (
              <p className="text-[11px] text-slate-500">لا توجد إشارات مطابقة حالياً لهذه الرموز.</p>
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
                      ? 'border-violet-500/60 bg-violet-950/20'
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
                    {item.setupTypeAr} • {item.directionAr}
                  </p>
                  {optPick ? (
                    <p className="mt-1 font-mono text-[9px] text-violet-200/90">
                      سترايك {optPick.contract.strike} · {formatContractExpiryAr(optPick.contract.expiry)}
                    </p>
                  ) : null}
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
          {t.selectedSymbol === 'SPX' && (
            <p className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-3 py-2 text-[11px] text-slate-400">
              <span className="font-medium text-slate-300">SPX</span> يعرض هنا مؤشر إس أند بي 500؛ جلب
              البيانات يتم عبر الرمز <span className="font-mono text-sky-300/90">^GSPC</span> عند المزود.
            </p>
          )}
        </main>

        <section className="space-y-3 rounded-2xl border border-violet-500/30 bg-violet-950/10 p-3">
          <h2 className="text-xs font-semibold text-violet-200">تحليل الأوبشن</h2>
          <p className="text-[10px] leading-relaxed text-slate-500">
            إعدادات مبنية على الشموع اليومية وEMA50. يظهر سترايك وتاريخ انتهاء العقد عند توفر مقترح من
            المحرك لنفس الميل (Call/Put).
          </p>
          <div className="max-h-[72vh] space-y-3 overflow-auto pr-1">
            {OPTIONS_TERMINAL_SYMBOLS.map((sym) => {
              const o = t.optionsBySymbol[sym]
              const optEngine = pickOptionSuggestionForBias(t.optionSuggestions, sym, o.bias)
              return (
                <div
                  key={sym}
                  className="rounded-xl border border-slate-800 bg-slate-950/50 p-2.5 text-[11px]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100">{sym}</span>
                    <span
                      className={
                        o.bias === 'CALL'
                          ? 'text-emerald-300'
                          : o.bias === 'PUT'
                            ? 'text-rose-300'
                            : 'text-slate-500'
                      }
                    >
                      {o.contractTypeAr}
                    </span>
                  </div>
                  <p className="mt-1 text-slate-400">{o.setupTypeAr}</p>
                  {optEngine ? (
                    <p className="mt-1 font-mono text-[10px] text-violet-200">
                      سترايك مقترح: {optEngine.contract.strike} · تاريخ انتهاء العقد:{' '}
                      {formatContractExpiryAr(optEngine.contract.expiry)}
                    </p>
                  ) : o.bias !== 'NONE' ? (
                    <p className="mt-1 text-[10px] text-slate-600">
                      لا يوجد عقد مطابق في محرك الأوبشن لهذا الميل حالياً.
                    </p>
                  ) : null}
                  <p className="text-slate-300">دخول: {o.entryZoneAr}</p>
                  <p className="text-slate-400">إلغاء: {o.invalidationAr}</p>
                  <p className="text-slate-300">هدف: {o.targetAr}</p>
                  <p className="text-slate-500">ثقة: {o.confidenceAr}</p>
                  <p className="mt-1 text-[10px] text-slate-500">{o.rationaleAr}</p>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      <footer className="mt-6 border-t border-slate-800/80 pt-4 text-center text-[10px] text-slate-600">
        تنبيهات تيليجرام للأوبشن تشمل الرموز أعلاه عند التنفيذ ووضع LIVE. لوحة تنفيذ السهم التفصيلية في
        محطة الأسهم.
      </footer>
    </>
  )
}
