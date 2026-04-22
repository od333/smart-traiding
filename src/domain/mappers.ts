import type {
  ScoredSignal,
  TomorrowScenario,
  MarketState,
  StockPersonalityProfile,
  OptionContract,
} from './models'

export function confidenceLabelAr(level: ScoredSignal['confidence']): string {
  if (level === 'high') return 'ثقة عالية'
  if (level === 'medium') return 'ثقة متوسطة'
  return 'ثقة حذرة'
}

export function tradeStyleLabelAr(style: ScoredSignal['tradeStyle']): string {
  if (style === 'scalp') return 'سكالب سريع'
  if (style === 'day') return 'مضاربة يومية'
  return 'سوينق متزن'
}

export function scenarioLabelAr(type: TomorrowScenario['type']): string {
  switch (type) {
    case 'trend_continuation':
      return 'استمرار اتجاه'
    case 'gap_up':
      return 'Gap Up محتمل'
    case 'gap_down':
      return 'Gap Down محتمل'
    case 'range_chop':
      return 'تذبذب بدون أفضلية واضحة'
    case 'critical_reversal':
      return 'احتمال انعكاس من منطقة حرجة'
    case 'no_trade_zone':
    default:
      return 'منطقة لا تداول'
  }
}

export function marketMoodLabelAr(state: MarketState): string {
  switch (state.overallMood) {
    case 'bullish':
      return 'سياق عام صاعد يدعم الفرص الإيجابية'
    case 'bearish':
      return 'سياق عام هابط يستدعي الانتباه للوقف'
    case 'mixed':
      return 'سياق متداخل بين صعود وهبوط حسب القطاع'
    case 'neutral':
    default:
      return 'سياق متزن بدون أفضلية قوية'
  }
}

export function bestStrategiesSummaryAr(profile: StockPersonalityProfile): string {
  const best = profile.bestStrategies
    .slice(0, 2)
    .map((s) => s.notesAr)
    .join('، ')

  return best || 'لم يتم تسجيل بيانات كافية بعد.'
}

export function optionUsageLabelAr(contract: OptionContract): string {
  if (contract.usage === 'quick_trade') return 'مناسب لمضاربة أوبشن سريعة'
  return 'مناسب لتداول أوبشن متزن'
}

