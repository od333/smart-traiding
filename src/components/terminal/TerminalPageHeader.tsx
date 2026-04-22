import type { DataSourceMode } from '../../data/dataSource'
import type { MarketSessionStatus } from '../../utils/marketSession'

type Props = {
  title: string
  subtitle: string
  symbols: readonly string[]
  selectedSymbol: string
  onPickSymbol: (s: string) => void
  sessionLabel: string
  dataMode: DataSourceMode
  liveSession: MarketSessionStatus
  lastRefreshAt: number
  chartLivePrice: number | null
  quoteSource: 'finnhub' | 'yahoo' | null
  quoteUpdatedAt: number | null
}

export function TerminalPageHeader({
  title,
  subtitle,
  symbols,
  selectedSymbol,
  onPickSymbol,
  sessionLabel,
  dataMode,
  liveSession,
  lastRefreshAt,
  chartLivePrice,
  quoteSource,
  quoteUpdatedAt,
}: Props) {
  return (
    <header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/50 px-4 py-3 backdrop-blur">
      <div>
        <h1 className="text-base font-bold tracking-tight text-slate-50">{title}</h1>
        <p className="text-[11px] text-slate-500">{subtitle}</p>
      </div>
      <div className="flex max-w-2xl flex-col gap-1 text-[11px] text-slate-400">
        <div className="flex flex-wrap items-center gap-3">
          <span>
            الرمز: <strong className="text-sky-300">{selectedSymbol}</strong>
          </span>
          <span className="text-slate-300">الجلسة: {sessionLabel}</span>
          <span>
            مصدر الأسعار:{' '}
            <span className={dataMode === 'LIVE' ? 'text-emerald-400' : 'text-amber-300'}>
              {dataMode}
            </span>
            {dataMode === 'LIVE' && liveSession === 'CLOSED' && (
              <span className="mr-1 text-slate-500">
                — يعني بيانات حية من المزود، وليس أن السوق الآن في جلسة رسمية.
              </span>
            )}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
          <span>
            محرك البيانات:{' '}
            {lastRefreshAt > 0
              ? new Date(lastRefreshAt).toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' })
              : '—'}
          </span>
          {chartLivePrice != null && (
            <span className="font-mono text-emerald-400/90">
              سعر لحظي: {chartLivePrice.toFixed(2)}
              {quoteSource && ` (${quoteSource === 'finnhub' ? 'Finnhub' : 'Yahoo'})`}
              {quoteUpdatedAt != null &&
                ` · ${new Date(quoteUpdatedAt).toLocaleTimeString('ar-SA', { timeZone: 'Asia/Riyadh' })}`}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2" role="tablist" aria-label="اختيار الرمز">
        {symbols.map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={s === selectedSymbol}
            onClick={() => onPickSymbol(s)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              s === selectedSymbol
                ? 'border-sky-500 bg-sky-950/50 text-sky-200'
                : 'border-slate-700 text-slate-400 hover:border-slate-500'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
    </header>
  )
}
