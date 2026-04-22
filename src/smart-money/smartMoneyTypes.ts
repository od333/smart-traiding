export interface SmartMoneySignal {
  symbol: string
  unusualVolume: boolean
  optionsFlow: boolean
  blockTrades: boolean
  volumeRatio: number
  optionsFlowScore: number
  smartMoneyScore: number
}
