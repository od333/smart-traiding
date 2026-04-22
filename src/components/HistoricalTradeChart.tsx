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
import type { HistoricalSignalRecord } from '../domain/models'

type HistoricalTradeChartProps = {
  symbol: string
  trade: HistoricalSignalRecord
}

type TradePoint = {
  idx: number
  price: number
  volume: number
}

function buildTradeSeries(trade: HistoricalSignalRecord): {
  data: TradePoint[]
  entry?: number
  stop?: number
  exit?: number
  targets?: number[]
} {
  const entry = trade.entryPrice ?? 100
  const stop = trade.stopLoss ?? entry * 0.97
  const exit = trade.exitPrice ?? entry * (trade.result === 'win' ? 1.03 : 0.97)
  const targets = trade.targets ?? [
    entry * 1.02,
    trade.result === 'win' ? entry * 1.04 : entry * 1.03,
  ]

  const steps = 40
  const data: TradePoint[] = []
  let prev = entry

  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1)
    let price: number
    if (trade.result === 'win') {
      const mid = entry
      const end = exit
      const curved = t * t * (3 - 2 * t)
      if (t < 0.2) {
        price = entry * 0.995 + (mid - entry * 0.995) * (t / 0.2)
      } else {
        price = mid + (end - mid) * curved
      }
    } else if (trade.result === 'loss') {
      const mid = entry
      const end = stop
      const curved = t * t * (3 - 2 * t)
      if (t < 0.2) {
        price = entry * 1.005 - (entry * 1.005 - mid) * (t / 0.2)
      } else {
        price = mid - (mid - end) * curved
      }
    } else {
      // breakeven أو open: نطاق ضيق حول نقطة الدخول
      price = entry * (0.997 + 0.006 * Math.sin(i / 4))
    }

    const noise = Math.sin(i / 3) * (entry * 0.0015)
    const priceWithNoise = Math.max(price + noise, 0.01)
    const volatility = Math.abs(priceWithNoise - prev)
    const volume = 800 + volatility * 40_000
    prev = priceWithNoise

    data.push({
      idx: i,
      price: priceWithNoise,
      volume,
    })
  }

  return { data, entry, stop, exit, targets }
}

export function HistoricalTradeChart({ symbol, trade }: HistoricalTradeChartProps) {
  const { data, entry, stop, exit, targets } = buildTradeSeries(trade)

  const prices = data.map((d) => d.price)
  const minPrice =
    Math.min(...prices, stop ?? prices[0], exit ?? prices[0], entry ?? prices[0]) * 0.995
  const maxPrice =
    Math.max(...prices, ...(targets ?? []), entry ?? prices[0], exit ?? prices[0]) * 1.005

  return (
    <div className="glass-panel relative flex h-64 flex-col overflow-hidden border border-sky-500/30 bg-gradient-to-b from-slate-950/80 via-slate-950/90 to-black">
      <div className="flex items-center justify-between border-b border-slate-800/70 px-4 py-2 text-[11px] text-slate-400">
        <span className="font-medium text-slate-200">
          إعادة عرض الصفقة — <span className="text-sky-300">{symbol}</span>
        </span>
      </div>
      <div className="relative flex-1 px-3 pb-3 pt-2">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18)_0,_transparent_55%)] opacity-70" />
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid stroke="#111827" strokeDasharray="3 3" horizontal vertical={false} />
            <XAxis dataKey="idx" tick={false} axisLine={false} />
            <YAxis
              domain={[minPrice, maxPrice]}
              tick={{
                fontSize: 10,
                fill: '#9ca3af',
              }}
              width={52}
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
                return [`السعر: ${v.toFixed(2)}`, '']
              }}
              labelFormatter={() => ''}
            />

            {typeof entry === 'number' && (
              <>
                <ReferenceArea
                  y1={entry * 0.998}
                  y2={entry * 1.002}
                  fill="#0ea5e9"
                  fillOpacity={0.08}
                />
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
              </>
            )}
            {typeof stop === 'number' && (
              <>
                <ReferenceArea
                  y1={stop * 0.998}
                  y2={stop * 1.002}
                  fill="#f97373"
                  fillOpacity={0.08}
                />
                <ReferenceLine
                  y={stop}
                  stroke="#fb7185"
                  strokeDasharray="3 3"
                  label={{
                    value: `وقف ${stop.toFixed(2)}`,
                    position: 'right',
                    fill: '#fb7185',
                    fontSize: 10,
                  }}
                />
              </>
            )}
            {typeof exit === 'number' && (
              <>
                <ReferenceArea
                  y1={exit * 0.998}
                  y2={exit * 1.002}
                  fill="#22c55e"
                  fillOpacity={0.08}
                />
                <ReferenceLine
                  y={exit}
                  stroke="#22c55e"
                  strokeDasharray="3 3"
                  label={{
                    value: `خروج ${exit.toFixed(2)}`,
                    position: 'right',
                    fill: '#4ade80',
                    fontSize: 10,
                  }}
                />
              </>
            )}
            {targets &&
              targets.map((t, idx) => (
                <ReferenceLine
                  key={t + idx}
                  y={t}
                  stroke="#16a34a"
                  strokeDasharray="2 2"
                  label={{
                    value: `هدف ${idx + 1}`,
                    position: 'left',
                    fill: '#22c55e',
                    fontSize: 9,
                  }}
                />
              ))}

            <Line
              type="monotone"
              dataKey="price"
              stroke="#38bdf8"
              strokeWidth={2}
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
              barSize={5}
              radius={[3, 3, 0, 0]}
              fill="rgba(56,189,248,0.35)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

