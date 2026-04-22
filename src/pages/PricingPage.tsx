import { motion } from 'framer-motion'

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
}

export default function PricingPage() {
  return (
    <div className="flex flex-col gap-4 text-xs">
      <motion.header
        className="flex flex-col gap-2 text-center lg:text-right"
        {...fadeInUp}
      >
        <h2 className="text-base font-semibold text-slate-50">
          الباقات والاشتراكات — مصممة لأساليب تداول مختلفة
        </h2>
        <p className="mx-auto max-w-2xl text-[11px] text-slate-300 lg:mx-0">
          ثلاث خطط واضحة: مجانية لتجربة المنصة، احترافية للمتداول النشط، و VIP للمتداول
          الذي يريد الوصول الكامل للتقارير والفرص الخاصة وتنبيهات تيليجرام المتقدمة.
        </p>
      </motion.header>

      <motion.section
        className="grid gap-4 lg:grid-cols-3"
        {...fadeInUp}
        transition={{ delay: 0.05 }}
      >
        <div className="glass-panel flex flex-col gap-2 border border-slate-700/70 bg-slate-950/95 px-4 py-4">
          <span className="text-xs font-semibold text-slate-200">الخطة المجانية</span>
          <span className="text-lg font-bold text-slate-50">٠ دولار / شهر</span>
          <p className="text-[11px] text-slate-300">
            تبدأ منها للتعرف على فلسفة المنصة وطريقة عرض الفرص بدون التزام.
          </p>
          <ul className="mt-2 space-y-1 text-[11px] text-slate-200">
            <li>• عرض عدد محدود من فرص اليوم.</li>
            <li>• نبض سوق مبسط وحالة المؤشرات الرئيسية.</li>
            <li>• وصول لجزء من الهيستوري التحليلي.</li>
          </ul>
        </div>

        <div className="glass-panel relative flex flex-col gap-2 border border-sky-500/60 bg-sky-950/70 px-4 py-4 shadow-soft-glow">
          <span className="absolute -top-3 left-4 rounded-full bg-emerald-400 px-2 py-0.5 text-[10px] font-semibold text-slate-950">
            الأكثر اختياراً
          </span>
          <span className="text-xs font-semibold text-sky-100">الخطة الاحترافية</span>
          <span className="text-lg font-bold text-sky-50">— / شهر</span>
          <p className="text-[11px] text-sky-50/90">
            مناسبة للمتداول اليومي الذي يريد إشارات أوضح، وتوقعات الغد، وتنبيهات تيليجرام
            على الفرص الرئيسية.
          </p>
          <ul className="mt-2 space-y-1 text-[11px] text-sky-50/90">
            <li>• فتح معظم إشارات الأسهم والأوبشن العملية.</li>
            <li>• توقعات الغد وسيناريوهات Gaps والاختراقات المتوقعة.</li>
            <li>• تنبيهات تيليجرام للإشارات الجديدة وتحديثات الوقف والأهداف.</li>
          </ul>
        </div>

        <div className="glass-panel flex flex-col gap-2 border border-amber-500/60 bg-slate-950/95 px-4 py-4">
          <span className="text-xs font-semibold text-amber-100">خطة VIP</span>
          <span className="text-lg font-bold text-amber-50">— / شهر</span>
          <p className="text-[11px] text-amber-50/90">
            للمحترفين الذين يحتاجون لكل التفاصيل: جميع الإشارات، التقارير الخاصة،
            والفرص ذات الاحتمال الأعلى وسجلات الهيستوري الكاملة.
          </p>
          <ul className="mt-2 space-y-1 text-[11px] text-amber-50/90">
            <li>• فتح جميع الإشارات، بما فيها الفرص الخاصة عالية الاحتمال.</li>
            <li>• تقارير سلوكية متقدمة لكل سهم وشخصيته التداولية.</li>
            <li>• تكامل كامل مع تنبيهات تيليجرام والاشتراكات وإدارة الحساب.</li>
          </ul>
        </div>
      </motion.section>
    </div>
  )
}

