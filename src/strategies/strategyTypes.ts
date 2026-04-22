export type StrategySourceBook =
  | "Technical Analysis of the Financial Markets – John Murphy"
  | "Reminiscences of a Stock Operator – Edwin Lefèvre"
  | "Trading in the Zone – Mark Douglas"
  | "Thinking in Bets – Annie Duke"
  | "Market Wizards – Jack Schwager"
  | "Warren Buffett / Graham Philosophy"

export interface StrategyDefinition {
  key: string
  name: string
  sourceBook: StrategySourceBook
  description: string
  conditionsAr: string
  invalidConditionsAr: string
  bestForAr: string
  marketRegime: "trend" | "range" | "breakout"
  riskModelAr: string
  minRiskReward: number
  preferredTimeframes: string[]
  tags: string[]
}
