import type {
  MarketState,
  ScoredSignal,
  StockPersonalityProfile,
} from '../domain/models'
import type { OptionSuggestion } from './optionsSelector'

export type SetupQuality = 'A_PLUS' | 'GOOD' | 'ACCEPTABLE'
export type AdvantageStrength = 'strong_edge' | 'medium_edge' | 'weak_edge'

export interface PhilosophyAssessment {
  setupQuality: SetupQuality
  advantageStrength: AdvantageStrength
  isAPlus: boolean
  qualityLabelAr: string
  edgeLabelAr: string
  executionRiskLabelAr: string
  stockPersonalityLabelAr?: string
  buffettBiasLabelAr?: string
  whyNotAPlusAr?: string
}

function isHighConfidence(confidence: ScoredSignal['confidence']) {
  return confidence === 'high'
}

function computeSetupQuality(
  signal: ScoredSignal,
  personality?: StockPersonalityProfile,
  optionSuggestion?: OptionSuggestion | null,
): SetupQuality {
  const rr = signal.riskReward.riskRewardRatio
  const final = signal.finalScore
  const confidenceHigh = isHighConfidence(signal.confidence)

  const personalityBoost =
    personality &&
    personality.bestStrategies.some(
      (s) => s.strategy === signal.strategy && s.winRate >= 0.6,
    )

  const optionsSupport =
    optionSuggestion &&
    (optionSuggestion.flowConfidence ?? 0) > 0.6 &&
    optionSuggestion.contract.liquidityScore > 0.6

  if (
    rr >= 2.2 &&
    final >= 0.85 &&
    confidenceHigh &&
    personalityBoost &&
    optionsSupport
  ) {
    return 'A_PLUS'
  }

  if (rr >= 1.6 && final >= 0.6) {
    return 'GOOD'
  }

  return 'ACCEPTABLE'
}

function computeAdvantageStrength(
  signal: ScoredSignal,
  market: MarketState,
): AdvantageStrength {
  const final = signal.finalScore
  const alignedWithMarket =
    (signal.direction === 'long' && market.overallMood !== 'bearish') ||
    (signal.direction === 'short' && market.overallMood !== 'bullish')

  if (final >= 0.8 && alignedWithMarket) return 'strong_edge'
  if (final >= 0.6) return 'medium_edge'
  return 'weak_edge'
}

function mapSetupQualityLabel(q: SetupQuality): string {
  switch (q) {
    case 'A_PLUS':
      return 'هذه الفرصة من فئة A+ بسبب وضوح الهيكل السعري، وتفوق العائد على المخاطرة، وتوافق السهم مع هذا النوع من الحركة، مع انسجام جيد مع سياق السوق الحالي.'
    case 'GOOD':
      return 'فرصة جيدة ومنطقية وقابلة للتنفيذ، لكنها لا تصل إلى درجة A+ لأن بعض العوامل (مثل الفوليوم أو وضوح الهيكل أو توافق شخصية السهم) ليست في أفضل حالاتها.'
    case 'ACCEPTABLE':
      return 'فرصة مقبولة من ناحية الفكرة، لكن التنفيذ حساس أو المخاطرة أعلى من المثالي؛ يفضّل التعامل معها كفرصة ثانوية بحجم منضبط.'
  }
}

function mapEdgeLabel(strength: AdvantageStrength): string {
  switch (strength) {
    case 'strong_edge':
      return 'أفضلية قوية: النظام يرى أن الاحتمال يميل بوضوح لصالح هذا السيناريو، مع انسجام جيد بين السهم والسوق.'
    case 'medium_edge':
      return 'أفضلية متوسطة: توجد فرصة منطقية لكنها تحتاج التزامًا دقيقًا بإدارة المخاطر وحجم الدخول.'
    case 'weak_edge':
      return 'أفضلية ضعيفة: الفكرة ليست سيئة تمامًا، لكنها ليست من النوع الذي يُفضّل البناء عليه بقناعة عالية.'
  }
}

function buildExecutionRiskLabel(signal: ScoredSignal): string {
  const rr = signal.riskReward.riskRewardRatio
  if (rr >= 2.2) {
    return 'هيكل ممتاز من حيث المخاطرة/العائد، لكن التنفيذ قد يكون حساسًا ويتطلب صبرًا على التذبذب الطبيعي.'
  }
  if (rr >= 1.5) {
    return 'مزيج متزن بين قوة الفكرة وسهولة التنفيذ؛ مناسبة لمتداولين يتقبلون تذبذبًا متوسطًا.'
  }
  return 'فكرة منطقية لكن ريشيو المخاطرة/العائد محدود؛ يفضّل تقليل حجم الصفقة والتعامل معها كفرصة غير أساسية.'
}

function buildStockPersonalityLabel(
  personality?: StockPersonalityProfile,
): string | undefined {
  if (!personality) return undefined

  const biasText =
    personality.preferredBias === 'momentum_runner'
      ? 'سهم يميل لحركات زخم واستمرار اتجاه عندما تتوفر المعطيات.'
      : personality.preferredBias === 'gap_player'
        ? 'سهم يحب الفجوات والتحركات الحادة حول الأخبار والافتتاحات.'
        : personality.preferredBias === 'breakout_lover'
          ? 'سهم يحترم الاختراقات المدعومة بفوليوم واضح أكثر من الارتدادات الهادئة.'
          : personality.preferredBias === 'reversion_lover'
            ? 'سهم يتجاوب غالبًا مع الارتدادات من الدعوم أكثر من مطاردة الاختراقات.'
            : 'سهم متذبذب نسبياً يحتاج إدارة دقيقة للمخاطرة وعدم ملاحقته بعشوائية.'

  return `${biasText} أفضل أوقات نشاطه: ${personality.bestSessionsAr}. حساسيته للأخبار: ${personality.newsSensitivityAr}.`
}

function buildBuffettBiasLabel(symbol: string): string | undefined {
  const qualitySymbols = new Set(['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'META'])
  if (!qualitySymbols.has(symbol.toUpperCase())) return undefined

  return 'سهم من شركات كبرى ذات جودة أعلى نسبيًا؛ غالبًا ما يكون أنسب لصفقات سوينق هادئة أكثر من مضاربات مفرطة السرعة.'
}

export function assessSignalPhilosophy(params: {
  signal: ScoredSignal
  market: MarketState
  personality?: StockPersonalityProfile
  optionSuggestion?: OptionSuggestion | null
}): PhilosophyAssessment {
  const { signal, market, personality, optionSuggestion } = params

  const setupQuality = computeSetupQuality(signal, personality, optionSuggestion)
  const advantageStrength = computeAdvantageStrength(signal, market)

  const qualityLabelAr = mapSetupQualityLabel(setupQuality)
  const edgeLabelAr = mapEdgeLabel(advantageStrength)
  const executionRiskLabelAr = buildExecutionRiskLabel(signal)
  const stockPersonalityLabelAr = buildStockPersonalityLabel(personality)
  const buffettBiasLabelAr = buildBuffettBiasLabel(signal.symbol)

  let whyNotAPlusAr: string | undefined

  if (setupQuality !== 'A_PLUS') {
    const reasons: string[] = []
    if (signal.finalScore < 0.85) {
      reasons.push('درجة التقييم الكلية أقل من مستوى A+ المطلوب.')
    }
    if (signal.riskReward.riskRewardRatio < 2) {
      reasons.push('ريشيو المخاطرة/العائد أقل من المستوى الممتاز (٢:١ أو أعلى).')
    }
    if (personality && personality.bestStrategies[0]?.winRate < 0.6) {
      reasons.push('تاريخ السهم مع هذه الاستراتيجية ليس قويًا بما يكفي لرفع التصنيف.')
    }
    if (!optionSuggestion) {
      reasons.push('لم يتوفر دعم قوي من سيولة عقود الأوبشن لهذه الفكرة.')
    }
    if (!reasons.length) {
      reasons.push('تحتاج الإشارة مزيدًا من الوضوح في الهيكل أو دعمًا أقوى من الفوليوم والسوق العام.')
    }
    whyNotAPlusAr = reasons.join(' ')
  }

  return {
    setupQuality,
    advantageStrength,
    isAPlus: setupQuality === 'A_PLUS',
    qualityLabelAr,
    edgeLabelAr,
    executionRiskLabelAr,
    stockPersonalityLabelAr,
    buffettBiasLabelAr,
    whyNotAPlusAr,
  }
}

