import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  LineSeries,
  createChart,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from 'lightweight-charts'
import { fetchLiveCandles, type Candle, type CandleResolution } from '../services/candleService'

function applyLiveToLastCandle(candles: Candle[], live: number | null): Candle[] {
  if (!candles.length || live == null || !Number.isFinite(live) || live <= 0) {
    return candles
  }
  const i = candles.length - 1
  const c = candles[i]
  const high = Math.max(c.open, c.high, live)
  const low = Math.min(c.open, c.low, live)
  const next = [...candles]
  next[i] = { ...c, close: live, high, low }
  return next
}

type TradingChartProps = {
  symbol: string
  /** آخر سعر تداول من الاقتباس — يُدمَج في آخر شمعة لتحديث بصري أسرع من واجهة الشموع */
  liveLastPrice?: number | null
  executionSetup: {
    direction: 'long' | 'short'
    entry: number
    stop: number
    targets: number[]
    analysisAr?: string
  } | null
  dataMode: 'LIVE' | 'MOCK' | 'FALLBACK'
  onStateChange?: (state: 'STRONG' | 'MEDIUM' | 'WEAK' | null) => void
}

export default function TradingChart({
  symbol,
  liveLastPrice = null,
  executionSetup,
  dataMode,
  onStateChange,
}: TradingChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const ma9SeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const ma20SeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const vwapSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasData, setHasData] = useState(false)
  const [loadedCandles, setLoadedCandles] = useState<Candle[]>([])
  const [resolution, setResolution] = useState<CandleResolution>('5')
  const [fullscreen, setFullscreen] = useState(false)
  const [showMA9, setShowMA9] = useState(true)
  const [showMA20, setShowMA20] = useState(true)
  const [showVWAP, setShowVWAP] = useState(true)
  const [signalState, setSignalState] = useState<'STRONG' | 'MEDIUM' | 'WEAK' | null>(null)
  const priceLinesRef = useRef<ReturnType<ISeriesApi<'Candlestick'>['createPriceLine']>[]>([])
  const normalizedBaseRef = useRef<Candle[]>([])
  const livePriceRef = useRef<number | null>(null)

  useEffect(() => {
    livePriceRef.current =
      liveLastPrice != null && Number.isFinite(liveLastPrice) && liveLastPrice > 0
        ? liveLastPrice
        : null
  }, [liveLastPrice])

  function resolutionStepSeconds(r: CandleResolution): number {
    if (r === '1') return 60
    if (r === '5') return 5 * 60
    if (r === '15') return 15 * 60
    if (r === '60') return 60 * 60
    return 24 * 60 * 60
  }

  function refreshIntervalMs(r: CandleResolution): number {
    if (r === '1') return 5_000
    if (r === '5') return 10_000
    if (r === '15') return 20_000
    if (r === '60') return 45_000
    return 120_000
  }

  function fitPriceScaleToData() {
    const chart = chartRef.current
    if (!chart) return
    chart.priceScale('right').applyOptions({ autoScale: true })
    requestAnimationFrame(() => {
      chart.timeScale().fitContent()
    })
  }

  function normalizeCandles(candles: Candle[], r: CandleResolution): Candle[] {
    // شمعة واحدة كانت تُعاد كما هي دون تمديد للوقت الحالي — فيُضيع الشارت أو يختفي المقياس
    if (!candles.length || r === 'D') return candles
    const step = resolutionStepSeconds(r)
    const sorted = [...candles].sort((a, b) => a.time - b.time)
    const nonZeroVolumes = sorted.map((c) => c.volume).filter((v) => v > 0)
    const avgVolume =
      nonZeroVolumes.length > 0
        ? nonZeroVolumes.reduce((a, b) => a + b, 0) / nonZeroVolumes.length
        : 1
    // baseline صغير ليظهر الفوليوم متصل بدون تضخيم
    const baselineVolume = Math.max(1, avgVolume * 0.015)
    const out: Candle[] = [sorted[0]]
    for (let i = 1; i < sorted.length; i += 1) {
      const prev = out[out.length - 1]
      const cur = sorted[i]
      let t = prev.time + step
      // املأ الفجوات داخل الجلسة بقيم سعر ثابتة وحجم 0 حتى يظهر الفوليوم متصل زمنيًا
      while (t < cur.time) {
        out.push({
          time: t,
          open: prev.close,
          high: prev.close,
          low: prev.close,
          close: prev.close,
          volume: baselineVolume,
          synthetic: true,
        })
        t += step
      }
      out.push(cur)
    }
    // مدّ السلسلة حتى الوقت الحالي (تقريبي) لإزالة الفراغ البصري في يمين الشارت
    const nowSec = Math.floor(Date.now() / 1000)
    const alignedNow = Math.floor(nowSec / step) * step
    let last = out[out.length - 1]
    let t = last.time + step
    while (t <= alignedNow) {
      out.push({
        time: t,
        open: last.close,
        high: last.close,
        low: last.close,
        close: last.close,
        volume: baselineVolume,
        synthetic: true,
      })
      last = out[out.length - 1]
      t += step
    }
    return out
  }

  function buildMA(candles: Candle[], period: number): Array<{ time: Time; value: number }> {
    let sum = 0
    const out: Array<{ time: Time; value: number }> = []
    for (let i = 0; i < candles.length; i += 1) {
      sum += candles[i].close
      if (i >= period) {
        sum -= candles[i - period].close
      }
      if (i >= period - 1) {
        out.push({ time: candles[i].time as Time, value: sum / period })
      }
    }
    return out
  }

  function buildVWAP(candles: Candle[]): Array<{ time: Time; value: number }> {
    let cumulativePV = 0
    let cumulativeV = 0
    const out: Array<{ time: Time; value: number }> = []
    for (const c of candles) {
      const typical = (c.high + c.low + c.close) / 3
      cumulativePV += typical * c.volume
      cumulativeV += c.volume
      if (cumulativeV <= 0) continue
      out.push({ time: c.time as Time, value: cumulativePV / cumulativeV })
    }
    return out
  }

  function classifySignalState(candles: Candle[], setup: TradingChartProps['executionSetup']) {
    if (!setup || candles.length < 25) return null
    const last = candles[candles.length - 1]
    const ma9 = buildMA(candles, 9)
    const ma20 = buildMA(candles, 20)
    const vwap = buildVWAP(candles)
    const lastMA9 = ma9[ma9.length - 1]?.value
    const lastMA20 = ma20[ma20.length - 1]?.value
    const lastVWAP = vwap[vwap.length - 1]?.value
    if (
      !Number.isFinite(last.close) ||
      !Number.isFinite(lastMA9) ||
      !Number.isFinite(lastMA20) ||
      !Number.isFinite(lastVWAP)
    ) {
      return null
    }

    const entryMin = setup.direction === 'long' ? setup.entry : setup.entry * (1 - 0.002)
    const entryMax = setup.direction === 'long' ? setup.entry * (1 + 0.002) : setup.entry
    const inEntryZone = last.close >= Math.min(entryMin, entryMax) && last.close <= Math.max(entryMin, entryMax)

    if (setup.direction === 'long') {
      if (last.close >= lastVWAP && lastMA9 >= lastMA20 && inEntryZone) return 'STRONG'
      if ((last.close >= lastMA20 && lastMA9 >= lastMA20) || inEntryZone) return 'MEDIUM'
      return 'WEAK'
    }
    if (last.close <= lastVWAP && lastMA9 <= lastMA20 && inEntryZone) return 'STRONG'
    if ((last.close <= lastMA20 && lastMA9 <= lastMA20) || inEntryZone) return 'MEDIUM'
    return 'WEAK'
  }

  const executionLevels = useMemo(() => {
    if (!executionSetup) return null
    const entry = executionSetup.entry
    const entryMin = executionSetup.direction === 'long' ? entry : entry * (1 - 0.002)
    const entryMax = executionSetup.direction === 'long' ? entry * (1 + 0.002) : entry
    return {
      entryMin,
      entryMax,
      stop: executionSetup.stop,
      targets: executionSetup.targets,
    }
  }, [executionSetup])

  useEffect(() => {
    if (!containerRef.current) return
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#020617' },
        textColor: '#cbd5e1',
      },
      width: containerRef.current.clientWidth,
      height: 540,
      grid: {
        vertLines: { color: 'rgba(51,65,85,0.28)' },
        horzLines: { color: 'rgba(51,65,85,0.28)' },
      },
      crosshair: { mode: 0 },
      rightPriceScale: {
        borderColor: 'rgba(100,116,139,0.45)',
      },
      timeScale: {
        borderColor: 'rgba(100,116,139,0.45)',
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 9,
        minBarSpacing: 5,
      },
    })
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#34d399',
      borderUpColor: '#34d399',
      wickUpColor: '#a7f3d0',
      downColor: '#fb7185',
      borderDownColor: '#fb7185',
      wickDownColor: '#fecdd3',
    })
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#60a5fa',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    })
    const ma9Series = chart.addSeries(LineSeries, {
      color: '#f59e0b',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      title: 'MA9',
    })
    const ma20Series = chart.addSeries(LineSeries, {
      color: '#a78bfa',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      title: 'MA20',
    })
    const vwapSeries = chart.addSeries(LineSeries, {
      color: '#22d3ee',
      lineWidth: 2,
      lineStyle: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      title: 'VWAP',
    })
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    })

    chartRef.current = chart
    candleSeriesRef.current = candleSeries
    volumeSeriesRef.current = volumeSeries
    ma9SeriesRef.current = ma9Series
    ma20SeriesRef.current = ma20Series
    vwapSeriesRef.current = vwapSeries

    const onResize = () => {
      if (!containerRef.current || !chartRef.current) return
      chartRef.current.applyOptions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      })
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      chart.remove()
      chartRef.current = null
      candleSeriesRef.current = null
      volumeSeriesRef.current = null
      ma9SeriesRef.current = null
      ma20SeriesRef.current = null
      vwapSeriesRef.current = null
      priceLinesRef.current = []
    }
  }, [])

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = fullscreen ? 'hidden' : ''
    }
    const t = setTimeout(() => {
      if (!containerRef.current || !chartRef.current) return
      chartRef.current.applyOptions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      })
      chartRef.current.timeScale().fitContent()
    }, 40)
    return () => {
      clearTimeout(t)
      if (typeof document !== 'undefined') {
        document.body.style.overflow = ''
      }
    }
  }, [fullscreen])

  useEffect(() => {
    let cancelled = false
    async function load(silent = false) {
      if (!candleSeriesRef.current || !volumeSeriesRef.current) return
      if (!silent) {
        normalizedBaseRef.current = []
        setLoading(true)
        setError(null)
      }
      const rawCandles = await fetchLiveCandles(symbol, resolution)
      const normalized = rawCandles ? normalizeCandles(rawCandles, resolution) : null
      if (cancelled) return
      if (!normalized || !normalized.length) {
        candleSeriesRef.current.setData([])
        volumeSeriesRef.current.setData([])
        setHasData(false)
        setLoading(false)
        setError('لا تتوفر حالياً بيانات شموع حية لهذا السهم.')
        return
      }

      normalizedBaseRef.current = normalized
      const candles = applyLiveToLastCandle(normalized, livePriceRef.current)

      const candleData: CandlestickData<Time>[] = candles.map((c) => ({
        time: c.time as Time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
      const volumeData: HistogramData<Time>[] = candles.map((c) => ({
        time: c.time as Time,
        value: c.volume,
        color: c.synthetic
          ? 'rgba(148,163,184,0.28)'
          : c.close >= c.open
            ? 'rgba(34,197,94,0.55)'
            : 'rgba(239,68,68,0.55)',
      }))

      candleSeriesRef.current.setData(candleData)
      volumeSeriesRef.current.setData(volumeData)
      setLoadedCandles(candles)
      setSignalState(classifySignalState(candles, executionSetup))
      fitPriceScaleToData()
      setHasData(true)
      setLoading(false)
      setError(null)
    }
    load(false).catch((e) => {
      console.warn('[TradingChart] load candles failed', e)
      if (cancelled) return
      setLoading(false)
      setHasData(false)
      setError('تعذّر تحميل بيانات الشموع الحية حالياً.')
    })

    const timer = window.setInterval(() => {
      load(true).catch((e) => {
        console.warn('[TradingChart] refresh candles failed', e)
      })
    }, refreshIntervalMs(resolution))

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [symbol, dataMode, resolution, executionSetup])

  useEffect(() => {
    if (!hasData || !candleSeriesRef.current || !volumeSeriesRef.current) return
    const base = normalizedBaseRef.current
    if (!base.length) return
    if (liveLastPrice == null || !Number.isFinite(liveLastPrice) || liveLastPrice <= 0) return

    const merged = applyLiveToLastCandle(base, liveLastPrice)
    const last = merged[merged.length - 1]
    candleSeriesRef.current.update({
      time: last.time as Time,
      open: last.open,
      high: last.high,
      low: last.low,
      close: last.close,
    })
    volumeSeriesRef.current.update({
      time: last.time as Time,
      value: last.volume,
      color: last.synthetic
        ? 'rgba(148,163,184,0.28)'
        : last.close >= last.open
          ? 'rgba(34,197,94,0.55)'
          : 'rgba(239,68,68,0.55)',
    })
    setLoadedCandles(merged)
    setSignalState(classifySignalState(merged, executionSetup))
    fitPriceScaleToData()
  }, [liveLastPrice, hasData, symbol, resolution, executionSetup])

  useEffect(() => {
    onStateChange?.(signalState)
  }, [signalState, onStateChange])

  useEffect(() => {
    if (!hasData || !loadedCandles.length) {
      ma9SeriesRef.current?.setData([])
      ma20SeriesRef.current?.setData([])
      vwapSeriesRef.current?.setData([])
      return
    }
    ma9SeriesRef.current?.setData(showMA9 ? buildMA(loadedCandles, 9) : [])
    ma20SeriesRef.current?.setData(showMA20 ? buildMA(loadedCandles, 20) : [])
    vwapSeriesRef.current?.setData(showVWAP ? buildVWAP(loadedCandles) : [])
  }, [hasData, loadedCandles, showMA9, showMA20, showVWAP])

  useEffect(() => {
    if (!candleSeriesRef.current) return
    priceLinesRef.current.forEach((line) => candleSeriesRef.current?.removePriceLine(line))
    priceLinesRef.current = []
    if (!executionLevels || !hasData) return
    priceLinesRef.current.push(candleSeriesRef.current.createPriceLine({
      price: executionLevels.entryMin,
      color: '#22c55e',
      lineStyle: 2,
      axisLabelVisible: true,
      title: 'دخول أدنى',
    }))
    priceLinesRef.current.push(candleSeriesRef.current.createPriceLine({
      price: executionLevels.entryMax,
      color: '#16a34a',
      lineStyle: 2,
      axisLabelVisible: true,
      title: 'دخول أعلى',
    }))
    priceLinesRef.current.push(candleSeriesRef.current.createPriceLine({
      price: executionLevels.stop,
      color: '#ef4444',
      lineStyle: 0,
      axisLabelVisible: true,
      title: 'وقف الخسارة',
    }))
    executionLevels.targets.slice(0, 3).forEach((t, i) => {
      const line = candleSeriesRef.current?.createPriceLine({
        price: t,
        color: '#38bdf8',
        lineStyle: 0,
        axisLabelVisible: true,
        title: `هدف ${i + 1}`,
      })
      if (line) {
        priceLinesRef.current.push(line)
      }
    })
  }, [executionLevels, hasData])

  return (
    <div className={`${fullscreen ? 'fixed inset-0 z-50 w-screen h-screen p-2 md:p-4 bg-slate-950/95' : ''}`}>
    <div className={`glass-panel rounded-2xl border border-slate-700/70 bg-slate-950/95 p-3 ${fullscreen ? 'w-full h-full flex flex-col' : ''}`}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-100">الشارت الحي — {symbol}</h3>
          {signalState && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                signalState === 'STRONG'
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50'
                  : signalState === 'MEDIUM'
                    ? 'bg-amber-600/30 text-amber-300 border border-amber-500/50'
                    : 'bg-rose-600/30 text-rose-300 border border-rose-500/50'
              }`}
            >
              حالة الإشارة: {signalState === 'STRONG' ? 'قوية' : signalState === 'MEDIUM' ? 'متوسطة' : 'ضعيفة'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/70 px-2 py-1">
            {(['1', '5', '15', '60', 'D'] as CandleResolution[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setResolution(r)}
                className={`rounded-full px-2 py-0.5 text-[10px] ${resolution === r ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                {r}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => chartRef.current?.timeScale().fitContent()}
            className="rounded-full border border-slate-700 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-800"
          >
            إعادة ضبط العرض
          </button>
          <button
            type="button"
            onClick={() => setFullscreen((v) => !v)}
            className="rounded-full border border-slate-700 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-800"
          >
            {fullscreen ? 'تصغير' : 'تكبير'}
          </button>
          <button
            type="button"
            onClick={() => setShowMA9((v) => !v)}
            className={`rounded-full border px-2 py-1 text-[10px] ${showMA9 ? 'border-amber-500 text-amber-300' : 'border-slate-700 text-slate-400'}`}
          >
            MA9
          </button>
          <button
            type="button"
            onClick={() => setShowMA20((v) => !v)}
            className={`rounded-full border px-2 py-1 text-[10px] ${showMA20 ? 'border-violet-500 text-violet-300' : 'border-slate-700 text-slate-400'}`}
          >
            MA20
          </button>
          <button
            type="button"
            onClick={() => setShowVWAP((v) => !v)}
            className={`rounded-full border px-2 py-1 text-[10px] ${showVWAP ? 'border-cyan-500 text-cyan-300' : 'border-slate-700 text-slate-400'}`}
          >
            VWAP
          </button>
        </div>
      </div>
      <div
        ref={containerRef}
        className={`w-full overflow-hidden rounded-xl ${fullscreen ? 'flex-1 min-h-0 h-full' : 'h-[420px] md:h-[520px] xl:h-[620px]'}`}
      />
      {executionSetup?.analysisAr && (
        <p className="mt-2 rounded-xl border border-slate-700/70 bg-slate-900/60 px-3 py-2 text-[11px] text-slate-300">
          {executionSetup.analysisAr}
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-slate-400">
        {liveLastPrice != null && Number.isFinite(liveLastPrice) && liveLastPrice > 0 && (
          <span className="rounded-full border border-emerald-500/50 bg-emerald-950/30 px-2 py-0.5 font-mono text-emerald-300">
            آخر سعر (لحظي): {liveLastPrice.toFixed(2)}
          </span>
        )}
        {showMA9 && <span className="rounded-full border border-amber-500/40 px-2 py-0.5 text-amber-300">MA9</span>}
        {showMA20 && <span className="rounded-full border border-violet-500/40 px-2 py-0.5 text-violet-300">MA20</span>}
        {showVWAP && <span className="rounded-full border border-cyan-500/40 px-2 py-0.5 text-cyan-300">VWAP</span>}
        <span className="rounded-full border border-slate-700 px-2 py-0.5">Volume</span>
      </div>
      {loading && <p className="mt-2 text-[11px] text-slate-400">جاري تحميل الشموع الحية...</p>}
      {!loading && error && (
        <p className="mt-2 rounded-xl border border-amber-500/40 bg-amber-950/20 px-3 py-2 text-[11px] text-amber-200">
          لا تتوفر حالياً بيانات شموع حية لهذا السهم — {error}
        </p>
      )}
    </div>
    </div>
  )
}

