import {
  Bar,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ScoredSignal } from '../domain/models'

type FakeChartProps = {
  symbol?: string
  signal?: ScoredSignal | null
}

type ChartPoint = {
  idx: number
  price: number
  volume: number
}

function buildPriceSeries(signal: ScoredSignal | null | undefined): {
  data: ChartPoint[]
  entry?: number
  stop?: number
  targets?: number[]
  directionLabel: string
} {
  if (!signal) {
    const base = 100
    const data: ChartPoint[] = Array.from({ length: 40 }).map((_, idx) => ({
      idx,
      price: base + Math.sin(idx / 4) * 2 + (idx / 40) * 3,
      volume: 1_000 + Math.abs(Math.sin(idx / 3)) * 800,
    }))
    return {
      data,
      directionLabel: 'عرض توضيحي — لا توجد إشارة فعلية حالياً',
    }
  }

  const { entry, stop, targets } = signal.riskReward
  const mainTarget = targets[0] ?? entry * (signal.direction === 'long' ? 1.02 : 0.98)

  const steps = 40
  const data: ChartPoint[] = []
  let prevPrice = entry
  for (let i = 0; i < steps; i++) {
    const progress = i / (steps - 1)
    const noise = Math.sin(i / 3) * (entry * 0.002)
    let price: number
    if (signal.direction === 'long') {
      const start = entry * 0.985
      const mid = entry
      const end = mainTarget
      const t = progress
      const curved = t * t * (3 - 2 * t)
      if (t < 0.3) {
        const localT = t / 0.3
        price = start + (mid - start) * localT
      } else {
        const localT = (t - 0.3) / 0.7
        price = mid + (end - mid) * curved * localT
      }
    } else {
      const start = entry * 1.015
      const mid = entry
      const end = mainTarget
      const t = progress
      const curved = t * t * (3 - 2 * t)
      if (t < 0.3) {
        const localT = t / 0.3
        price = start - (start - mid) * localT
      } else {
        const localT = (t - 0.3) / 0.7
        price = mid - (mid - end) * curved * localT
      }
    }
    const priceWithNoise = Math.max(price + noise, 0.01)
    const volatility = Math.abs(priceWithNoise - prevPrice)
    const volume = 1_000 + volatility * 40_000
    prevPrice = priceWithNoise

    data.push({
      idx: i,
      price: priceWithNoise,
      volume,
    })
  }

  return {
    data,
    entry,
    stop,
    targets,
    directionLabel:
      signal.direction === 'long'
        ? 'اتجاه صاعد — إشارة شراء مع نقاط دخول ووقف وأهداف واضحة'
        : 'اتجاه هابط — إشارة بيع/حماية مع نقاط دخول ووقف وأهداف واضحة',
  }
}

export default function FakeChart({ symbol = 'AAPL', signal }: FakeChartProps) {
  const { data, entry, stop, targets, directionLabel } = buildPriceSeries(signal)

  const prices = data.map((d) => d.price)
  const minPrice = Math.min(...prices, stop ?? prices[0]) * 0.995
  const maxPrice = Math.max(...prices, ...(targets ?? []), entry ?? prices[0]) * 1.005

  return (
    <div className="glass-panel relative flex h-72 flex-col overflow-hidden border border-sky-500/30 bg-gradient-to-b from-slate-900/80 via-slate-950/80 to-black/90">
      <div className="flex items-center justify-between border-b border-slate-800/70 px-4 py-2 text-xs text-slate-400">
        <span className="font-medium text-slate-200">
          الشارت الحي — <span className="text-sky-300">{symbol}</span>
        </span>
        <span>السعر مع خطوط الدخول والوقف والأهداف واتجاه الصفقة</span>
      </div>

      <div className="relative flex flex-1 flex-col gap-2 px-3 pb-3 pt-1">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16)_0,_transparent_55%)] opacity-60" />

        <div className="relative flex-1 overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="priceLine" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="60%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#111827" strokeDasharray="3 3" horizontal vertical={false} />
              <XAxis dataKey="idx" tick={false} axisLine={false} />
              <YAxis
                domain={[minPrice, maxPrice]}
                tick={{
                  fontSize: 10,
                  fill: '#9ca3af',
                  formatter: (v: number) =>
                    v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toFixed(2),
                } as any}
                width={60}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#020617',
                  borderColor: '#1f2937',
                  borderRadius: 8,
                  fontSize: 11,
                  direction: 'rtl',
                  textAlign: 'right',
                }}
                formatter={(value: unknown, _name: unknown, props: any) => {
                  if (props.dataKey === 'volume') {
                    const v = typeof value === 'number' ? value : 0
                    return [`الحجم: ${Math.round(v).toLocaleString()}`, '']
                  }
                  const v = typeof value === 'number' ? value : 0
                  const priceLabel =
                    v >= 1000 ? `${(v / 1000).toFixed(2)}K` : v.toFixed(2)
                  return [`السعر: ${priceLabel}`, '']
                }}
                labelFormatter={() => ''}
              />
              {typeof entry === 'number' && (
                <ReferenceArea
                  y1={entry * 0.998}
                  y2={entry * 1.002}
                  fill="#0ea5e9"
                  fillOpacity={0.08}
                />
              )}
              {typeof stop === 'number' && (
                <ReferenceArea
                  y1={stop * 0.998}
                  y2={stop * 1.002}
                  fill="#f97373"
                  fillOpacity={0.08}
                />
              )}
              {targets &&
                targets.map((t, idx) => (
                  <ReferenceArea
                    key={t + idx}
                    y1={t * 0.998}
                    y2={t * 1.002}
                    fill="#22c55e"
                    fillOpacity={0.08}
                  />
                ))}
              {typeof entry === 'number' && (
                <ReferenceLine
                  y={entry}
                  stroke="#38bdf8"
                  strokeDasharray="3 3"
                  label={{
                    value: `دخول ${entry.toFixed(2)}`,
                    position: 'right',
                    fill: '#38bdf8',
                    fontSize: 10,
                  }}
                />
              )}
              {typeof stop === 'number' && (
                <ReferenceLine
                  y={stop}
                  stroke="#f97373"
                  strokeDasharray="3 3"
                  label={{
                    value: `وقف ${stop.toFixed(2)}`,
                    position: 'right',
                    fill: '#fb7185',
                    fontSize: 10,
                  }}
                />
              )}
              {targets &&
                targets.map((t, idx) => (
                  <ReferenceLine
                    key={t + idx}
                    y={t}
                    stroke="#22c55e"
                    strokeDasharray="3 3"
                    label={{
                      value: `هدف ${idx + 1} ${t.toFixed(2)}`,
                      position: 'right',
                      fill: '#4ade80',
                      fontSize: 10,
                    }}
                  />
                ))}
              <Line
                type="monotone"
                dataKey="price"
                stroke="url(#priceLine)"
                strokeWidth={2.3}
                dot={false}
                isAnimationActive
              />
              <YAxis
                yAxisId="volume"
                orientation="right"
                hide
                domain={[0, (dataMax: number) => dataMax * 1.4]}
              />
              <Bar
                yAxisId="volume"
                dataKey="volume"
                barSize={6}
                radius={[4, 4, 0, 0]}
                fill="rgba(56,189,248,0.35)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="relative flex items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-900/60 px-3 py-2 text-[11px] text-slate-300">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
            <span>{directionLabel}</span>
          </div>
          {signal && (
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] text-sky-200">
                ريشيو مخاطرة / عائد {signal.riskReward.riskRewardRatio.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

