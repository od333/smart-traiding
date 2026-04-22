import { useState } from 'react'
import { motion } from 'framer-motion'
import { useEngineSnapshot } from '../hooks/useEngineSnapshot'

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
}

export default function OptionsPage() {
  const { snapshot, error } = useEngineSnapshot()
  const suggestions = snapshot?.optionSuggestions ?? []

  const [selectedUsage, setSelectedUsage] = useState<'all' | 'quick_trade' | 'balanced_trade'>('all')
  const [selectedLiquidity, setSelectedLiquidity] = useState<'all' | 'high' | 'medium'>('all')
  const [selectedRisk, setSelectedRisk] = useState<'all' | 'low' | 'medium' | 'high'>('all')

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-xs text-rose-200">
        {error}
      </div>
    )
  }

  const filteredSuggestions = suggestions.filter((sug) => {
    if (selectedUsage !== 'all') {
      if (selectedUsage === 'quick_trade' && sug.contract.usage !== 'quick_trade') {
        return false
      }
      if (selectedUsage === 'balanced_trade' && sug.contract.usage !== 'balanced_trade') {
        return false
      }
    }

    if (selectedLiquidity !== 'all') {
      const liq = sug.contract.liquidityScore
      if (selectedLiquidity === 'high' && liq < 0.7) return false
      if (selectedLiquidity === 'medium' && (liq < 0.4 || liq >= 0.7)) return false
    }

    if (selectedRisk !== 'all') {
      const riskText = sug.riskLevelAr
      const isHigh = riskText.includes('عالية') || riskText.includes('عالي')
      const isLow = riskText.includes('منخفضة') || riskText.includes('منخفض')
      const isMedium = !isHigh && !isLow

      if (selectedRisk === 'high' && !isHigh) return false
      if (selectedRisk === 'low' && !isLow) return false
      if (selectedRisk === 'medium' && !isMedium) return false
    }

    return true
  })

  return (
    <div className="flex flex-col gap-4 text-xs">
      <motion.header
        className="flex flex-wrap items-center justify-between gap-3"
        {...fadeInUp}
      >
        <div>
          <h2 className="mb-1 text-base font-semibold text-slate-50">
            منصة الأوبشن الذكية
          </h2>
          <p className="max-w-xl text-[11px] text-slate-300">
            شاشة تختار لك عقود الأوبشن السائلة فقط، مع توضيح نوع العقد، سعر التنفيذ، تاريخ
            الانتهاء، جودة السيولة، السبريد، الـ Open Interest، مستوى المخاطرة، وسبب
            الاقتراح بالعربية.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="rounded-full bg-violet-500/90 px-3 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-violet-400">
            تفعيل فلترة العقود عالية الجودة
          </button>
        </div>
      </motion.header>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)]">
        <motion.div
          className="glass-panel flex flex-col gap-2 border border-slate-700/70 bg-slate-950/95 px-3 py-3"
          {...fadeInUp}
          transition={{ delay: 0.05 }}
        >
          <div className="flex flex-col gap-2 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-100">أفضل عقود الأوبشن المقترحة</span>
              <span className="rounded-full bg-slate-900/70 px-2 py-0.5 text-[10px] text-slate-400">
                جميع العقود مبنية على محرك اختيار الأوبشن
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2">
              <span className="text-[10px] text-slate-300">فلترة الاستخدام:</span>
              <div className="flex flex-wrap gap-1">
                <button
                  className={`rounded-full px-2.5 py-1 text-[10px] ${
                    selectedUsage === 'all'
                      ? 'bg-slate-100 text-slate-900'
                      : 'bg-slate-900 text-slate-200 hover:bg-slate-800'
                  }`}
                  onClick={() => setSelectedUsage('all')}
                >
                  الكل
                </button>
                <button
                  className={`rounded-full px-2.5 py-1 text-[10px] ${
                    selectedUsage === 'quick_trade'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-900 text-slate-200 hover:bg-slate-800'
                  }`}
                  onClick={() => setSelectedUsage('quick_trade')}
                >
                  مضاربات سريعة
                </button>
                <button
                  className={`rounded-full px-2.5 py-1 text-[10px] ${
                    selectedUsage === 'balanced_trade'
                      ? 'bg-sky-500 text-slate-950'
                      : 'bg-slate-900 text-slate-200 hover:bg-slate-800'
                  }`}
                  onClick={() => setSelectedUsage('balanced_trade')}
                >
                  تداول متزن
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2">
              <span className="text-[10px] text-slate-300">فلترة السيولة:</span>
              <div className="flex flex-wrap gap-1">
                <button
                  className={`rounded-full px-2.5 py-1 text-[10px] ${
                    selectedLiquidity === 'all'
                      ? 'bg-slate-100 text-slate-900'
                      : 'bg-slate-900 text-slate-200 hover:bg-slate-800'
                  }`}
                  onClick={() => setSelectedLiquidity('all')}
                >
                  جميع المستويات
                </button>
                <button
                  className={`rounded-full px-2.5 py-1 text-[10px] ${
                    selectedLiquidity === 'high'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-900 text-slate-200 hover:bg-slate-800'
                  }`}
                  onClick={() => setSelectedLiquidity('high')}
                >
                  سيولة عالية
                </button>
                <button
                  className={`rounded-full px-2.5 py-1 text-[10px] ${
                    selectedLiquidity === 'medium'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-900 text-slate-200 hover:bg-slate-800'
                  }`}
                  onClick={() => setSelectedLiquidity('medium')}
                >
                  سيولة متوسطة
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2">
              <span className="text-[10px] text-slate-300">مستوى المخاطرة:</span>
              <div className="flex flex-wrap gap-1">
                <button
                  className={`rounded-full px-2.5 py-1 text-[10px] ${
                    selectedRisk === 'all'
                      ? 'bg-slate-100 text-slate-900'
                      : 'bg-slate-900 text-slate-200 hover:bg-slate-800'
                  }`}
                  onClick={() => setSelectedRisk('all')}
                >
                  الكل
                </button>
                <button
                  className={`rounded-full px-2.5 py-1 text-[10px] ${
                    selectedRisk === 'low'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-900 text-slate-200 hover:bg-slate-800'
                  }`}
                  onClick={() => setSelectedRisk('low')}
                >
                  مخاطرة منخفضة
                </button>
                <button
                  className={`rounded-full px-2.5 py-1 text-[10px] ${
                    selectedRisk === 'medium'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-900 text-slate-200 hover:bg-slate-800'
                  }`}
                  onClick={() => setSelectedRisk('medium')}
                >
                  مخاطرة متوسطة
                </button>
                <button
                  className={`rounded-full px-2.5 py-1 text-[10px] ${
                    selectedRisk === 'high'
                      ? 'bg-rose-500 text-slate-950'
                      : 'bg-slate-900 text-slate-200 hover:bg-slate-800'
                  }`}
                  onClick={() => setSelectedRisk('high')}
                >
                  مخاطرة عالية
                </button>
              </div>
            </div>
          </div>

          <div className="soft-scrollbar mt-2 flex max-h-[420px] flex-col gap-2 overflow-auto pr-1">
            {filteredSuggestions.length ? (
              filteredSuggestions.map((sug) => {
                const liquidityPct = Math.round(sug.contract.liquidityScore * 100)
                const spreadPct = Math.round(sug.contract.spreadQuality * 100)
                const flowPct = Math.round((sug.flowConfidence ?? 0) * 100)

                const typeBadgeClass =
                  sug.contract.type === 'call'
                    ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/40'
                    : 'bg-rose-500/15 text-rose-200 border-rose-500/40'

                return (
                  <div
                    key={sug.contract.id}
                    className="rounded-xl border border-slate-700 bg-slate-950/90 px-3 py-2 text-[11px]"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold text-sky-200">
                          {sug.contract.underlyingSymbol}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] ${typeBadgeClass}`}
                        >
                          {sug.contract.type === 'call'
                            ? 'عقد شراء (Call)'
                            : 'عقد بيع (Put)'}
                        </span>
                      </div>
                      <span className="rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] text-slate-300">
                        {sug.riskLevelAr}
                      </span>
                    </div>

                    <div className="mb-2 grid gap-1 text-[10px] text-slate-300 lg:grid-cols-3">
                      <span>سعر التنفيذ: {sug.contract.strike}</span>
                      <span>تاريخ الانتهاء: {sug.contract.expiry}</span>
                      <span>
                        استخدام:{' '}
                        {sug.contract.usage === 'quick_trade'
                          ? 'مضاربة سريعة'
                          : 'تداول متزن'}
                      </span>
                      <span>Open Interest: {sug.contract.openInterest}</span>
                      <span>جودة السيولة: {liquidityPct}٪</span>
                      <span>جودة السبريد: {spreadPct}٪</span>
                    </div>

                    <div className="mb-1 grid gap-1 text-[10px]">
                      <div className="flex items-center justify-between text-slate-300">
                        <span>سيولة العقد</span>
                        <span>{liquidityPct}٪</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-800">
                        <div
                          className="h-1.5 rounded-full bg-emerald-500"
                          style={{ width: `${Math.min(liquidityPct, 100)}%` }}
                        />
                      </div>

                      <div className="mt-1 flex items-center justify-between text-slate-300">
                        <span>جودة التدفق (flow)</span>
                        <span>{flowPct}٪</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-800">
                        <div
                          className="h-1.5 rounded-full bg-sky-500"
                          style={{ width: `${Math.min(flowPct, 100)}%` }}
                        />
                      </div>
                    </div>

                    <p className="mt-1 text-[10px] text-slate-200">
                      سبب الاقتراح: {sug.reasonAr}
                    </p>
                    {sug.liquidityContextAr && (
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        سياق السيولة: {sug.liquidityContextAr}
                      </p>
                    )}
                    {sug.whaleSupportAr && (
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        نشاط كبار المتداولين: {sug.whaleSupportAr}
                      </p>
                    )}
                  </div>
                )
              })
            ) : (
              <p className="text-[11px] text-slate-300">
                لا توجد حالياً عقود أوبشن مطابقة لمعايير الفلترة المحددة.
              </p>
            )}
          </div>
        </motion.div>

        <motion.aside
          className="glass-panel flex flex-col gap-3 border border-violet-500/40 bg-slate-950/95 px-3 py-3"
          {...fadeInUp}
          transition={{ delay: 0.12 }}
        >
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium text-slate-100">
              فلسفة اختيار عقود الأوبشن في المنصة
            </span>
          </div>

          <ul className="space-y-1.5 text-[11px] text-slate-200">
            <li>• التركيز على العقود السائلة فقط لتقليل الانزلاق السعري وصعوبة الخروج.</li>
            <li>
              • مراعاة اتجاه الأصل والسياق العام للسوق قبل اقتراح أي عقد، وعدم ملاحقة
              الحركات العشوائية.
            </li>
            <li>
              • اختيار تاريخ انتهاء منطقي يخدم الفكرة، بحيث لا يكون قصيراً جداً ولا طويلاً
              بلا داعٍ.
            </li>
            <li>
              • تقييم المخاطرة إلى العائد على مستوى العقد نفسه، وربطه بسلوك السهم
              التاريخي.
            </li>
          </ul>
        </motion.aside>
      </section>
    </div>
  )
}

