import type { SignalCandidate } from "../domain/models"
import type { StrategyDefinition } from "./strategyTypes"
import { getStrategy } from "./strategyRegistry"

export type StrategyValidationResult =
  | { valid: true; strategy: StrategyDefinition }
  | { valid: false; reasons: string[] }

/**
 * يتحقق من أن الإشارة تطابق استراتيجية مسجلة في المكتبة
 * ولا يسمح بأي إشارة خارج الاستراتيجيات المعرّفة.
 */
export function validateSignalAgainstLibrary(
  candidate: SignalCandidate,
): StrategyValidationResult {
  const strategy = getStrategy(candidate.strategy)

  if (!strategy) {
    return {
      valid: false,
      reasons: [`الاستراتيجية "${candidate.strategy}" غير موجودة في المكتبة.`],
    }
  }

  const reasons: string[] = []

  if (candidate.riskReward.riskRewardRatio < strategy.minRiskReward) {
    reasons.push(
      `نسبة المخاطرة/العائد (${candidate.riskReward.riskRewardRatio}) أقل من الحد الأدنى للاستراتيجية (${strategy.minRiskReward}).`,
    )
  }

  if (reasons.length) {
    return { valid: false, reasons }
  }

  return { valid: true, strategy }
}

/**
 * يُرجع true فقط إذا كانت الاستراتيجية مسجلة في المكتبة.
 * يُستخدم في محرك الإشارات لرفض أي إشارة لا تطابق المكتبة.
 */
export function isStrategyInLibrary(strategyKey: string): boolean {
  return getStrategy(strategyKey) !== undefined
}
