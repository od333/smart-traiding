import { motion } from 'framer-motion'

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
}

export default function AuthPage() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-xs">
      <motion.div
        className="glass-panel w-full max-w-xl border border-slate-700/70 bg-slate-950/95 px-5 py-5"
        {...fadeInUp}
      >
        <h2 className="mb-1 text-base font-semibold text-slate-50">
          حسابك في منصة نبض السوق
        </h2>
        <p className="mb-4 text-[11px] text-slate-300">
          يمكنك من هنا إنشاء حساب جديد، تسجيل الدخول، أو استرجاع كلمة المرور بحلول بسيطة
          وواضحة باللغة العربية.
        </p>

        <div className="grid gap-4 text-[11px] lg:grid-cols-2">
          <form className="flex flex-col gap-2 rounded-xl border border-slate-700 bg-slate-950/90 px-3 py-3">
            <span className="text-slate-200">تسجيل دخول</span>
            <label className="flex flex-col gap-1">
              <span className="text-slate-300">البريد الإلكتروني</span>
              <input
                className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-50 outline-none focus:border-sky-400"
                placeholder="example@email.com"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-slate-300">كلمة المرور</span>
              <input
                type="password"
                className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-50 outline-none focus:border-sky-400"
                placeholder="••••••••"
              />
            </label>
            <button className="mt-1 rounded-full bg-sky-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-sky-400">
              تسجيل الدخول
            </button>
            <button
              type="button"
              className="text-[11px] text-sky-200 underline-offset-2 hover:underline"
            >
              نسيت كلمة المرور؟
            </button>
          </form>

          <form className="flex flex-col gap-2 rounded-xl border border-slate-700 bg-slate-950/90 px-3 py-3">
            <span className="text-slate-200">إنشاء حساب جديد</span>
            <label className="flex flex-col gap-1">
              <span className="text-slate-300">الاسم الكامل</span>
              <input
                className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-50 outline-none focus:border-emerald-400"
                placeholder="اسمك كما سيظهر في المنصة"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-slate-300">البريد الإلكتروني</span>
              <input
                className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-50 outline-none focus:border-emerald-400"
                placeholder="example@email.com"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-slate-300">كلمة المرور</span>
              <input
                type="password"
                className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-50 outline-none focus:border-emerald-400"
                placeholder="••••••••"
              />
            </label>
            <button className="mt-1 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400">
              إنشاء حساب والبدء الآن
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}

