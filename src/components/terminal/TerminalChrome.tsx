import { NavLink, Outlet } from 'react-router-dom'

const navClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-xl border px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070b14]',
    isActive
      ? 'border-sky-500 bg-sky-950/40 text-sky-100 shadow-[0_0_0_1px_rgba(56,189,248,0.15)]'
      : 'border-slate-700/90 bg-slate-950/40 text-slate-400 hover:border-slate-500 hover:text-slate-200',
  ].join(' ')

/**
 * هيكل موحّد: تنقل واضح بين محطة الأسهم ومحطة الأوبشن + منطقة المحتوى.
 */
export function TerminalChrome() {
  return (
    <div dir="rtl" className="min-h-screen bg-[#070b14] text-slate-100">
      <a
        href="#terminal-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-sky-600 focus:px-3 focus:py-2 focus:text-white"
      >
        تخطي إلى المحتوى
      </a>
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#070b14]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1920px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold tracking-tight text-slate-50">Smart Trading</span>
            <nav className="flex flex-wrap gap-2" aria-label="التنقل بين المحطات">
              <NavLink to="/stocks" className={navClass} end={false}>
                محطة الأسهم
              </NavLink>
              <NavLink to="/options" className={navClass} end={false}>
                محطة الأوبشن
              </NavLink>
              <NavLink to="/news-admin" className={navClass} end={false}>
                News Admin
              </NavLink>
            </nav>
          </div>
          <p className="max-w-md text-[10px] leading-relaxed text-slate-500">
            تنقّل سريع: الأسهم للدخول والوقف والأهداف على NVDA وAMZN وGOOGL — الأوبشن لنفس الرموز مع إضافة{' '}
            <span className="font-mono text-slate-400">SPX</span> (مؤشر إس أند بي 500).
          </p>
        </div>
      </header>
      <div id="terminal-main" className="mx-auto max-w-[1920px] px-4 py-4" tabIndex={-1}>
        <Outlet />
      </div>
    </div>
  )
}
