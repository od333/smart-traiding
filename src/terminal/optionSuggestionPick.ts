import type { OptionSuggestion } from '../engine/optionsSelector'
import type { OptionsBias } from './optionsSetupEngine'

/** أول توصية أوبشن مرتبطة بإشارة المحرك (أفضل سيولة/تدفق إن وُجدت عدة). */
export function pickOptionSuggestionForSignal(
  suggestions: OptionSuggestion[],
  signalId: string,
): OptionSuggestion | null {
  const matches = suggestions.filter((s) => s.linkedSignalId === signalId)
  if (!matches.length) return null
  return [...matches].sort((a, b) => (b.flowConfidence ?? 0) - (a.flowConfidence ?? 0))[0] ?? null
}

/** توصية أوبشن تتوافق مع ميل المحطة (كول/بوت) لنفس الرمز. */
export function pickOptionSuggestionForBias(
  suggestions: OptionSuggestion[],
  symbol: string,
  bias: OptionsBias,
): OptionSuggestion | null {
  if (bias === 'NONE') return null
  const type = bias === 'CALL' ? 'call' : 'put'
  const matches = suggestions.filter(
    (s) => s.contract.underlyingSymbol === symbol && s.contract.type === type,
  )
  if (!matches.length) return null
  return [...matches].sort((a, b) => (b.flowConfidence ?? 0) - (a.flowConfidence ?? 0))[0] ?? null
}

/** عرض تاريخ انتهاء العقد: تنسيق تقويمي عربي إن كان التاريخ بصيغة ISO. */
export function formatContractExpiryAr(expiry: string): string {
  const trimmed = expiry.trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const d = new Date(trimmed)
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('ar-SA-u-ca-gregory', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    }
  }
  return trimmed
}
