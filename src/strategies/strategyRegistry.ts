import type { StrategyDefinition } from "./strategyTypes"
import { strategyLibrary } from "./strategyLibrary"

export function getStrategy(key: string): StrategyDefinition | undefined {
  return strategyLibrary.find((s) => s.key === key)
}
