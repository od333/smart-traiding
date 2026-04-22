import { motion } from 'framer-motion'
import { useEngineSnapshot } from '../hooks/useEngineSnapshot'

const fadeInUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
}

/** لا يوجد مصدر OHLC حي في المنصة حالياً؛ الشارت يُفعّل فقط عند توفره */
const HAS_REAL_OHLC = false

export default function LabChartPage() {
  const { snapshot, error } = useEngineSnapshot()

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-xs text-rose-200">
        {error}
      </div>
    )
  }

  const signals = snapshot?.signals ?? []
  const nvdaSignal = signals.find((s) => s.symbol === 'NVDA') ?? signals[0] ?? null

  return (
    <div className="flex flex-col gap-4 text-xs">
      <motion.header
        className="flex flex-wrap items-center justify-between gap-3"
        {...fadeInUp}
      >
        <div>
          <h2 className="mb-1 text-base font-semibold text-slate-50">
            مختبر الشارت — /lab/chart
          </h2>
          <p className="max-w-xl text-[11px] text-slate-300">
            الشارت يعمل هنا فقط عند توفّر بيانات OHLC و volume حية. حالياً لا يُرسم شارت
            إلا بوجود مصدر بيانات حقيقي.
          </p>
        </div>
      </motion.header>

      <motion.section
        className="glass-panel flex flex-col gap-3 border border-slate-700/70 bg-slate-950/95 px-3 py-3"
        {...fadeInUp}
        transition={{ delay: 0.05 }}
      >
        {!HAS_REAL_OHLC ? (
          <div
            className="flex h-[320px] items-center justify-center rounded-xl bg-slate-900/80 text-slate-300"
            style={{ minHeight: '320px' }}
          >
            Real chart data not available yet
          </div>
        ) : null}

        <div className="grid gap-2 text-[11px] lg:grid-cols-4">
          <div className="rounded-xl border border-slate-700 bg-slate-950/90 px-3 py-2">
            <span className="mb-1 block text-slate-200">الرمز المستخدم</span>
            <p className="text-slate-300">
              {nvdaSignal ? nvdaSignal.symbol : 'لا توجد إشارة حالية، يتم عرض بيانات تجريبية.'}
            </p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/90 px-3 py-2">
            <span className="mb-1 block text-slate-200">نقطة الدخول (Entry)</span>
            <p className="text-slate-300">
              {nvdaSignal
                ? nvdaSignal.riskReward.entry.toFixed(2)
                : 'تُحسب من البيانات التجريبية.'}
            </p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/90 px-3 py-2">
            <span className="mb-1 block text-slate-200">وقف الخسارة (Stop)</span>
            <p className="text-slate-300">
              {nvdaSignal
                ? nvdaSignal.riskReward.stop.toFixed(2)
                : 'تُحسب من البيانات التجريبية.'}
            </p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/90 px-3 py-2">
            <span className="mb-1 block text-slate-200">الاتجاه والأهداف</span>
            {nvdaSignal ? (
              <p className="text-slate-300">
                الاتجاه: {nvdaSignal.direction === 'long' ? 'Long (شراء)' : 'Short (بيع/حماية)'}
                <br />
                الأهداف: {nvdaSignal.riskReward.targets.map((t) => t.toFixed(2)).join(' ، ')}
              </p>
            ) : (
              <p className="text-slate-300">
                يتم توليد الاتجاه والأهداف بشكل تجريبي معتمد على منطق الشارت.
              </p>
            )}
          </div>
        </div>
      </motion.section>
    </div>
  )
}

