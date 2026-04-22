import type { OptionContract, OptionUsage } from '../../../domain/models'
import type { RawOptionContract, RawOptionsResponse } from './rawTypes'

function parseUsageFromExpiry(
  expiration: string,
  now: Date,
  liquidityScore: number,
  spreadQuality: number,
): OptionUsage {
  const expDate = new Date(expiration)
  const diffMs = expDate.getTime() - now.getTime()
  const dte = diffMs / (1000 * 60 * 60 * 24)

  if (dte <= 7 && liquidityScore >= 0.6 && spreadQuality >= 0.5) {
    return 'quick_trade'
  }
  return 'balanced_trade'
}

function computeSpreadQuality(bid?: number, ask?: number): number {
  if (bid === undefined || ask === undefined || bid <= 0 || ask <= 0) return 0.5
  const mid = (bid + ask) / 2
  const width = ask - bid
  if (width <= 0) return 1
  const rel = width / mid
  if (rel <= 0.02) return 1
  if (rel >= 0.2) return 0.2
  return 1 - (rel - 0.02) / (0.2 - 0.02) * 0.8
}

function computeLiquidityScore(volume?: number, openInterest?: number): number {
  const v = volume ?? 0
  const oi = openInterest ?? 0
  const vScore = v === 0 ? 0 : Math.min(1, Math.log10(v + 1) / 4)
  const oiScore = oi === 0 ? 0 : Math.min(1, Math.log10(oi + 1) / 4)
  return 0.6 * vScore + 0.4 * oiScore
}

export function toOptionContracts(
  symbol: string,
  raw: RawOptionsResponse,
): OptionContract[] {
  const now = new Date()
  const contracts: OptionContract[] = []

  for (const c of raw.contracts as RawOptionContract[]) {
    const spreadQuality = computeSpreadQuality(c.bid, c.ask)
    const liquidityScore = computeLiquidityScore(c.volume, c.openInterest)
    const usage = parseUsageFromExpiry(
      c.expiration,
      now,
      liquidityScore,
      spreadQuality,
    )

    const typeNorm =
      c.type.toLowerCase() === 'call' || c.type.toLowerCase() === 'c'
        ? 'call'
        : 'put'

    contracts.push({
      id: `${symbol}-${c.strike}-${c.expiration}-${typeNorm}`,
      underlyingSymbol: c.underlying || symbol,
      type: typeNorm,
      strike: c.strike,
      expiry: c.expiration,
      liquidityScore,
      spreadQuality,
      openInterest: c.openInterest ?? 0,
      usage,
    })
  }

  return contracts
}

