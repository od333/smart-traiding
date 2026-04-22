import { prisma } from '../db'
import { NEWS_ENGINE_WATCHLIST } from '../watchlistSymbols'

const DEFAULT_WATCHLIST = NEWS_ENGINE_WATCHLIST

export async function ensureDefaultWatchlist(): Promise<void> {
  for (const symbol of DEFAULT_WATCHLIST) {
    await prisma.watchlistSymbol.upsert({
      where: { symbol },
      update: { enabled: true },
      create: { symbol, enabled: true, marketWide: false },
    })
  }
}

export async function getActiveWatchlistSymbols(): Promise<string[]> {
  const rows = await prisma.watchlistSymbol.findMany({
    where: { enabled: true, marketWide: false },
    orderBy: { symbol: 'asc' },
  })
  return rows.map((r) => r.symbol)
}

export async function isWatchlistSymbol(symbol: string): Promise<boolean> {
  const row = await prisma.watchlistSymbol.findUnique({ where: { symbol } })
  return Boolean(row?.enabled)
}

export function getDefaultWatchlist(): string[] {
  return [...DEFAULT_WATCHLIST]
}
