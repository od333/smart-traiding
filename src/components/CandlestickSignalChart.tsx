import { useMemo } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'
import type { ScoredSignal } from '../domain/models'

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n)
}

type CandlestickSignalChartProps = {
  symbol: string
  signal: ScoredSignal | null | undefined
}

type CandlePoint = {
  idx: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

function buildMockCandles(signal: ScoredSignal | null | undefined): CandlePoint[] {
  if (!signal) {
    const base = 100
    return Array.from({ length: 30 }).map((_, idx) => {
      const open = base + Math.sin(idx / 3) * 1.5
      const close = open + Math.sin(idx / 2) * 0.8
      const high = Math.max(open, close) + 0.6
      const low = Math.min(open, close) - 0.6
      const volume = 10_000 + Math.abs(close - open) * 50_000
      return { idx, open, high, low, close, volume }
    })
  }

  const entry = signal.riskReward.entry
  const mainTarget = signal.riskReward.targets[0] ?? entry * (signal.direction === 'long' ? 1.02 : 0.98)
  const dir = signal.direction === 'long' ? 1 : -1

  const candles: CandlePoint[] = []
  const total = 30
  for (let i = 0; i < total; i++) {
    const progress = i / (total - 1)
    let basePrice: number

    if (progress < 0.4) {
      const local = progress / 0.4
      basePrice = entry * (1 - dir * 0.01 + dir * 0.02 * local)
    } else {
      const local = (progress - 0.4) / 0.6
      const curved = local * local * (3 - 2 * local)
      basePrice = entry + (mainTarget - entry) * curved
    }

    const body = (Math.random() * 0.4 - 0.2) * (entry * 0.01)
    const wick = (Math.random() * 0.6 + 0.4) * (entry * 0.008)

    const open = basePrice - body / 2
    const close = basePrice + body / 2
    const high = Math.max(open, close) + wick
    const low = Math.min(open, close) - wick
    const volumeBase = 12_000 + progress * 40_000
    const volume = volumeBase + Math.abs(close - open) * 60_000

    candles.push({ idx: i, open, high, low, close, volume })
  }

  return candles
}

export function CandlestickSignalChart({ symbol, signal }: CandlestickSignalChartProps) {
  const candles = useMemo(() => buildMockCandles(signal), [signal])

  const prices = candles.map((c) => [c.open, c.high, c.low, c.close]).flat()
  const minPrice = Math.min(...prices) * 0.995
  const maxPrice = Math.max(...prices) * 1.005

  const entry = signal?.riskReward.entry
  const stop = signal?.riskReward.stop
  const targets = signal?.riskReward.targets ?? []

  return (
    <div className="glass-panel relative flex h-72 flex-col overflow-hidden border border-sky-500/30 bg-gradient-to-b from-slate-950 via-slate-950 to-black">
      <div className="flex items-center justify-between border-b border-slate-800/70 px-4 py-2 text-xs text-slate-400">
        <span className="font-medium text-slate-200">
          شارت الشموع — <span className="text-sky-300">{symbol}</span>
        </span>
        {signal && (
          <span className="rounded-full bg-slate-900/70 px-2 py-0.5 text-[10px] text-slate-300">
            {signal.direction === 'long' ? 'صفقة Long (شراء)' : 'صفقة Short (بيع/حماية)'}
          </span>
        )}
      </div>
      <div className="relative flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={candles} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid stroke="#0b1220" strokeDasharray="3 3" />
            <XAxis dataKey="idx" hide />
            <YAxis
              domain={[minPrice, maxPrice]}
              tick={{ fontSize: 10, fill: '#9ca3af' }}
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
              formatter={(value: any, name) => {
                if (name === 'volume') {
                  return [`الحجم: ${Math.round(value as number).toLocaleString()}`, '']
                }
                return [`السعر: ${(value as number).toFixed(2)}`, '']
              }}
            />
            {/* خطوط الدخول/الوقف/الأهداف باستخدام ReferenceLine الآمن */}
            {isFiniteNumber(entry) && (
              <ReferenceLine
                y={entry}
                stroke="#38bdf8"
                strokeDasharray="4 2"
                label={{
                  value: 'دخول',
                  position: 'right',
                  fill: '#38bdf8',
                  fontSize: 10,
                }}
              />
            )}
            {isFiniteNumber(stop) && (
              <ReferenceLine
                y={stop}
                stroke="#fb7185"
                strokeDasharray="4 2"
                label={{
                  value: 'وقف',
                  position: 'right',
                  fill: '#fb7185',
                  fontSize: 10,
                }}
              />
            )}
            {targets
              .filter((t) => isFiniteNumber(t))
              .map((t, idx) => {
                const achieved = candles.some((c) =>
                  signal?.direction === 'long' ? c.close >= t : c.close <= t,
                )
                const color = achieved ? '#22c55e' : 'rgba(34,197,94,0.7)'
                return (
                  <ReferenceLine
                    key={t + idx}
                    y={t}
                    stroke={color}
                    strokeDasharray="4 2"
                    label={{
                      value: `هدف ${idx + 1}${achieved ? ' (محقق)' : ''}`,
                      position: 'right',
                      fill: color,
                      fontSize: 10,
                    }}
                  />
                )
              })}
            {/* شمعة: ظل */}
            <Bar
              dataKey="high"
              fill="transparent"
              shape={(props: any) => {
                const { x, width, payload, yAxis } = props
                const centerX = x + width / 2
                const yHigh = yAxis.scale(payload.high)
                const yLow = yAxis.scale(payload.low)
                const color = payload.close >= payload.open ? '#22c55e' : '#fb7185'
                return (
                  <g>
                    <line
                      x1={centerX}
                      x2={centerX}
                      y1={yHigh}
                      y2={yLow}
                      stroke={color}
                      strokeWidth={1}
                    />
                  </g>
                )
              }}
            />
            {/* شمعة: الجسم */}
            <Bar
              dataKey="close"
              barSize={6}
              shape={(props: any) => {
                const { x, width, payload, yAxis } = props
                const bodyTop = Math.min(
                  yAxis.scale(payload.open),
                  yAxis.scale(payload.close),
                )
                const bodyBottom = Math.max(
                  yAxis.scale(payload.open),
                  yAxis.scale(payload.close),
                )
                const color = payload.close >= payload.open ? '#22c55e' : '#fb7185'
                return (
                  <rect
                    x={x + width / 2 - 3}
                    y={bodyTop}
                    width={6}
                    height={Math.max(2, bodyBottom - bodyTop)}
                    fill={color}
                  />
                )
              }}
            />
            {/* الفوليوم */}
            <Bar
              dataKey="volume"
              yAxisId="volume"
              barSize={4}
              fill="#38bdf8"
              opacity={0.5}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

