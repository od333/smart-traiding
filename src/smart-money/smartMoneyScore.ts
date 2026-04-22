export function computeSmartMoneyScore(
  volumeRatio: number,
  optionsFlowScore: number,
) {
  let score = 0

  if (volumeRatio >= 2) score += 0.4
  if (volumeRatio >= 3) score += 0.6

  if (optionsFlowScore > 50) score += 0.3
  if (optionsFlowScore > 100) score += 0.5

  return Math.min(score, 1)
}
