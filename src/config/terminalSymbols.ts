/** رموز محطة الأسهم — تحليل وتنفيذ سهم */
export const STOCK_TERMINAL_SYMBOLS = ['NVDA', 'AMZN', 'GOOGL'] as const
export type StockTerminalSymbol = (typeof STOCK_TERMINAL_SYMBOLS)[number]

/** رموز محطة الأوبشن — نفس الأسهم + مؤشر SPX (S&P 500) */
export const OPTIONS_TERMINAL_SYMBOLS = [...STOCK_TERMINAL_SYMBOLS, 'SPX'] as const
export type OptionsTerminalSymbol = (typeof OPTIONS_TERMINAL_SYMBOLS)[number]

/** توافق خلفي مع الكود الذي يتوقع TRACKED_SYMBOLS للأسهم فقط */
export const TRACKED_SYMBOLS = STOCK_TERMINAL_SYMBOLS
export type TrackedSymbol = StockTerminalSymbol

export function isStockTerminalSymbol(s: string): s is StockTerminalSymbol {
  const u = s.trim().toUpperCase()
  return (STOCK_TERMINAL_SYMBOLS as readonly string[]).includes(u)
}

export function normalizeStockSymbol(s: string): StockTerminalSymbol | null {
  const u = s.trim().toUpperCase()
  return isStockTerminalSymbol(u) ? (u as StockTerminalSymbol) : null
}

export function isOptionsTerminalSymbol(s: string): s is OptionsTerminalSymbol {
  const u = s.trim().toUpperCase()
  return (OPTIONS_TERMINAL_SYMBOLS as readonly string[]).includes(u)
}

export function normalizeOptionsSymbol(s: string): OptionsTerminalSymbol | null {
  const u = s.trim().toUpperCase()
  return isOptionsTerminalSymbol(u) ? (u as OptionsTerminalSymbol) : null
}

export function isTrackedSymbol(s: string): s is TrackedSymbol {
  return isStockTerminalSymbol(s)
}

export function normalizeTrackedSymbol(s: string): TrackedSymbol | null {
  return normalizeStockSymbol(s)
}

/**
 * رمز المزود (Finnhub / Yahoo) لجلب الشموع والاقتباس.
 * SPX في الواجهة = مؤشر S&P 500 (^GSPC على Yahoo).
 */
export function providerSymbolForMarket(displaySymbol: string): string {
  const u = displaySymbol.trim().toUpperCase()
  if (u === 'SPX') return '^GSPC'
  return u
}
