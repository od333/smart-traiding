export interface OptionsDataInput {
  callVolume?: number
  largeOrders?: number
}

export function detectOptionsFlow(optionsData: OptionsDataInput | null | undefined) {
  if (!optionsData) return { optionsFlow: false, optionsFlowScore: 0 }

  const flowScore =
    (optionsData.callVolume ?? 0) + (optionsData.largeOrders ?? 0)

  return {
    optionsFlow: flowScore > 50,
    optionsFlowScore: flowScore,
  }
}
