import type { SmartMoneySignal } from './smartMoneyTypes'
import { detectVolumeSpike } from './volumeSpikeDetector'
import { detectOptionsFlow } from './optionsFlowDetector'
import type { OptionsDataInput } from './optionsFlowDetector'
import { computeSmartMoneyScore } from './smartMoneyScore'

export interface SymbolDataInput {
  symbol: string
  volume: number
  avgVolume: number
  options?: OptionsDataInput | null
  blockTrades?: boolean
}

export function evaluateSmartMoney(symbolData: SymbolDataInput): SmartMoneySignal {
  const volume = detectVolumeSpike(symbolData.volume, symbolData.avgVolume)
  const options = detectOptionsFlow(symbolData.options ?? null)

  const score = computeSmartMoneyScore(
    volume.volumeRatio,
    options.optionsFlowScore,
  )

  return {
    symbol: symbolData.symbol,
    unusualVolume: volume.unusualVolume,
    optionsFlow: options.optionsFlow,
    blockTrades: symbolData.blockTrades ?? false,
    volumeRatio: volume.volumeRatio,
    optionsFlowScore: options.optionsFlowScore,
    smartMoneyScore: score,
  }
}
