import type { ScoredSignal } from '../domain/models'

export function buildTelegramShareUrl(text: string): string {
  const encoded = encodeURIComponent(text)
  return `https://t.me/share/url?text=${encoded}`
}

export function formatSignalForSharing(signal: ScoredSignal): string {
  return `
📊 إشارة تداول

السهم: ${signal.symbol}
الاستراتيجية: ${signal.strategyName ?? signal.strategy}

الاتجاه: ${signal.direction === 'long' ? 'LONG' : 'SHORT'}

الدخول: ${signal.riskReward.entry}
وقف: ${signal.riskReward.stop}

الأهداف:
${signal.riskReward.targets.join('\n')}

#SmartTrading
`.trim()
}
