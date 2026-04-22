import type {
  PriceSnapshot,
  SignalCandidate,
  SignalExplanation,
  SignalRiskReward,
  SignalStrategyType,
  TimeFrame,
  TradeStyle,
  Direction,
} from '../domain/models'
import { getStrategy } from '../strategies/strategyRegistry'

type StrategyContext = {
  snapshot: PriceSnapshot
}

export type StrategyEvaluation = {
  candidate?: SignalCandidate
  rejectionReasons?: string[]
}

type StrategyEvaluator = (ctx: StrategyContext) => StrategyEvaluation

function buildRiskReward(
  lastPrice: number,
  direction: Direction,
  distancePct: { stopPct: number; targetPct: number },
): SignalRiskReward {
  const entry = lastPrice
  const stop =
    direction === 'long'
      ? lastPrice * (1 - distancePct.stopPct)
      : lastPrice * (1 + distancePct.stopPct)
  const firstTarget =
    direction === 'long'
      ? lastPrice * (1 + distancePct.targetPct)
      : lastPrice * (1 - distancePct.targetPct)
  const secondTarget =
    direction === 'long'
      ? lastPrice * (1 + distancePct.targetPct * 1.7)
      : lastPrice * (1 - distancePct.targetPct * 1.7)

  const risk = Math.abs(entry - stop)
  const reward = Math.abs(firstTarget - entry)
  const riskRewardRatio = risk === 0 ? 0 : Number((reward / risk).toFixed(2))

  return {
    entry,
    stop,
    targets: [Number(firstTarget.toFixed(2)), Number(secondTarget.toFixed(2))],
    riskRewardRatio,
  }
}

function baseCandidate(
  id: string,
  symbol: string,
  direction: Direction,
  strategy: SignalStrategyType,
  timeFrame: TimeFrame,
  tradeStyle: TradeStyle,
  riskReward: SignalRiskReward,
  explanation: SignalExplanation,
  baseScore: number,
): SignalCandidate {
  const strategyDef = getStrategy(strategy)

  return {
    id,
    symbol,
    direction,
    strategy,
    strategyName: strategyDef?.name,
    strategySourceBook: strategyDef?.sourceBook,
    timeFrame,
    tradeStyle,
    riskReward,
    baseScore,
    confidence: baseScore > 0.7 ? 'high' : baseScore > 0.5 ? 'medium' : 'low',
    explanation,
  }
}

export const confirmedBreakout: StrategyEvaluator = ({ snapshot }) => {
  const rejectionReasons: string[] = []
  if (snapshot.trendScore < 0.3) {
    rejectionReasons.push('الاتجاه العام غير كافٍ لتأكيد اختراق قوي.')
  }
  if (snapshot.momentumScore < 0.3) {
    rejectionReasons.push('الزخم الحالي ضعيف ولا يدعم استمرار الاختراق.')
  }
  if (snapshot.currentVolume < snapshot.averageVolume * 1.2) {
    rejectionReasons.push('الفوليوم أقل من المستوى المطلوب لاختراق مؤكد.')
  }
  if (snapshot.distanceFromRecentResistancePct > 0.01) {
    rejectionReasons.push('السعر ليس قريباً بما يكفي من منطقة المقاومة المحددة.')
  }

  if (rejectionReasons.length) {
    return { rejectionReasons }
  }

  const riskReward = buildRiskReward(snapshot.lastPrice, 'long', {
    stopPct: 0.015,
    targetPct: 0.035,
  })

  const candidate = baseCandidate(
    `${snapshot.symbol}-confirmed-breakout`,
    snapshot.symbol,
    'long',
    'confirmed_breakout',
    'intra',
    'day',
    riskReward,
    {
      titleAr: 'اختراق مؤكد لمقاومة مع فوليوم داعم',
      bodyAr:
        'السهم يخترق مقاومة قريبة مع اتجاه صاعد واضح وزخم إيجابي وفوليوم أعلى من المتوسط، ما يعطي أفضلية منطقية لاستمرار الحركة الصاعدة مع وقف خسارة منضبط أسفل مستوى الاختراق.',
      strengthsAr:
        'اتجاه صاعد، زخم قوي، فوليوم أعلى من المتوسط، واختراق واضح لمستوى مقاومة محدد.',
      risksAr:
        'احتمال فشل الاختراق وعودة السعر داخل النطاق السابق في حال تباطؤ الفوليوم أو تغير مفاجئ في السوق.',
      contextAr:
        'تُفضَّل هذه الإشارة عندما يكون السوق العام داعماً، والقطاع في حالة صحية، ولا توجد أخبار سلبية متعارضة.',
    },
    0.78,
  )

  return { candidate }
}

export const supportBounce: StrategyEvaluator = ({ snapshot }) => {
  const rejectionReasons: string[] = []

  if (snapshot.trendScore <= 0) {
    rejectionReasons.push('الاتجاه العام ليس صاعداً بما يكفي لدعم ارتداد منظم من الدعم.')
  }
  if (snapshot.distanceFromRecentSupportPct > 0.01) {
    rejectionReasons.push('السعر ليس قريباً بما يكفي من منطقة الدعم المحددة.')
  }
  if (snapshot.momentumScore < -0.2) {
    rejectionReasons.push('الزخم البيعي ما زال مسيطراً، مما يضعف احتمال الارتداد.')
  }

  if (rejectionReasons.length) {
    return { rejectionReasons }
  }

  const riskReward = buildRiskReward(snapshot.lastPrice, 'long', {
    stopPct: 0.012,
    targetPct: 0.03,
  })

  const candidate = baseCandidate(
    `${snapshot.symbol}-support-bounce`,
    snapshot.symbol,
    'long',
    'support_bounce',
    'daily',
    'swing',
    riskReward,
    {
      titleAr: 'ارتداد من دعم واضح داخل اتجاه صاعد',
      bodyAr:
        'السهم يختبر منطقة دعم يومية قوية داخل اتجاه صاعد عام، مع بداية تحسن في الزخم، ما يرجّح ارتداداً منضبطاً بنقطة وقف قريبة أسفل الدعم.',
      strengthsAr:
        'منطقة دعم معروفة تاريخياً، داخل اتجاه صاعد، مع إشارات مبكرة على عودة المشترين.',
      risksAr:
        'في حال كسر الدعم قد يتحوّل السيناريو إلى موجة هابطة أعمق، ما يستدعي احترام وقف الخسارة بدقة.',
      contextAr:
        'تزداد جودة هذه الإشارة عندما يكون السوق العام مستقراً أو صاعداً، ولا توجد أخبار سلبية جوهرية على السهم.',
    },
    0.7,
  )

  return { candidate }
}

export const breakoutRetest: StrategyEvaluator = ({ snapshot }) => {
  const rejectionReasons: string[] = []

  if (snapshot.trendScore < 0.4) {
    rejectionReasons.push('الاتجاه غير واضح بما يكفي لاعتبار الحركة اختباراً بعد اختراق.')
  }
  if (snapshot.distanceFromRecentResistancePct > 0.02 && snapshot.distanceFromRecentSupportPct > 0.02) {
    rejectionReasons.push('السعر بعيد عن مستوى اختراق واضح أو دعم للمستوى المخترق.')
  }
  if (snapshot.momentumScore < 0.2) {
    rejectionReasons.push('الزخم ضعيف ولا يدعم استمرار الحركة بعد الاختبار.')
  }

  if (rejectionReasons.length) {
    return { rejectionReasons }
  }

  const riskReward = buildRiskReward(snapshot.lastPrice, 'long', {
    stopPct: 0.015,
    targetPct: 0.035,
  })

  const candidate = baseCandidate(
    `${snapshot.symbol}-breakout-retest`,
    snapshot.symbol,
    'long',
    'breakout_retest',
    'intra',
    'day',
    riskReward,
    {
      titleAr: 'اختبار مستوى بعد اختراق مع ثبات',
      bodyAr:
        'اختراق واضح ثم تراجع السعر نحو المستوى المخترق مع ثبات، ما يرجّح استمرار الحركة الصاعدة مع وقف أسفل مستوى الاختراق.',
      strengthsAr: 'اختراق واضح، عودة منظمة للمستوى، واتجاه صاعد.',
      risksAr: 'عودة السعر تحت المستوى بشكل واضح تلغي السيناريو.',
      contextAr: 'مناسب للأسهم التي تتحرك في اتجاه واضح.',
    },
    0.74,
  )

  return { candidate }
}

export const trendContinuation: StrategyEvaluator = ({ snapshot }) => {
  const rejectionReasons: string[] = []

  if (snapshot.trendScore < 0.6) {
    rejectionReasons.push('الاتجاه الصاعد ليس قوياً بما يكفي لصفقة متابعة اتجاه مريحة.')
  }
  if (snapshot.momentumScore < 0.2) {
    rejectionReasons.push('الزخم الحالي لا يؤكد استمرار الاتجاه بشكل واضح.')
  }
  if (
    snapshot.distanceFromRecentSupportPct < 0.02 ||
    snapshot.distanceFromRecentResistancePct < 0.02
  ) {
    rejectionReasons.push('السعر قريب جداً من دعم أو مقاومة، ما قد يقيّد مساحة الحركة المتوقعة.')
  }

  if (rejectionReasons.length) {
    return { rejectionReasons }
  }

  const riskReward = buildRiskReward(snapshot.lastPrice, 'long', {
    stopPct: 0.02,
    targetPct: 0.05,
  })

  const candidate = baseCandidate(
    `${snapshot.symbol}-trend-continuation`,
    snapshot.symbol,
    'long',
    'trend_continuation',
    'daily',
    'swing',
    riskReward,
    {
      titleAr: 'استمرار اتجاه صاعد بدون إجهاد مبالغ فيه',
      bodyAr:
        'السهم في اتجاه صاعد مستقر بعيد نسبياً عن الدعم والمقاومة المباشرة، مع زخم إيجابي مستمر، ما يفضّل صفقات متابعة اتجاه على إطار يومي / سوينق.',
      strengthsAr:
        'اتجاه صاعد واضح، قمم وقيعان أعلى، وعدم وجود إشارات تعب قوية في الهيكل السعري.',
      risksAr:
        'في حال ظهور أخبار مفاجئة أو انعكاس حاد في الزخم قد يتحول السيناريو إلى تصحيح أعمق.',
      contextAr:
        'هذه الإشارة تناسب المتداول الذي يفضّل البقاء مع الاتجاه طالما لم تظهر علامات انعكاس واضحة.',
    },
    0.72,
  )

  return { candidate }
}

export const openingRange: StrategyEvaluator = ({ snapshot }) => {
  const rejectionReasons: string[] = []

  if (!snapshot.isNearOpeningRangeBreak) {
    rejectionReasons.push('السعر ليس بالقرب من حدود نطاق الافتتاح.')
  }
  if (snapshot.momentumScore < 0.3) {
    rejectionReasons.push('الزخم غير كافٍ لدعم كسر حقيقي لنطاق الافتتاح.')
  }
  if (snapshot.currentVolume < snapshot.averageVolume * 1.1) {
    rejectionReasons.push('اختراق نطاق الافتتاح يحتاج فوليوم واضح.')
  }

  if (rejectionReasons.length) {
    return { rejectionReasons }
  }

  const direction: Direction = snapshot.trendScore >= 0 ? 'long' : 'short'
  const riskReward = buildRiskReward(snapshot.lastPrice, direction, {
    stopPct: 0.012,
    targetPct: 0.03,
  })

  const candidate = baseCandidate(
    `${snapshot.symbol}-opening-range`,
    snapshot.symbol,
    direction,
    'opening_range',
    'intra',
    'day',
    riskReward,
    {
      titleAr: 'اختراق نطاق الافتتاح مع فوليوم',
      bodyAr:
        'تحديد نطاق أول 15 دقيقة ثم اختراق مع فوليوم، ما يتيح فرصة مضاربة سريعة مع وقف داخل النطاق.',
      strengthsAr: 'نطاق افتتاح واضح، اختراق مع فوليوم.',
      risksAr: 'اختراق بدون فوليوم يضعف الموثوقية.',
      contextAr: 'مناسب للمضاربة السريعة.',
    },
    0.68,
  )

  return { candidate }
}

export const failedBreakout: StrategyEvaluator = ({ snapshot }) => {
  const rejectionReasons: string[] = []

  if (snapshot.trendScore > 0.3) {
    rejectionReasons.push('الاتجاه ما زال صاعداً؛ استراتيجية الاختراق الكاذب تتطلب عودة سريعة داخل النطاق.')
  }
  if (snapshot.distanceFromRecentResistancePct > 0.02) {
    rejectionReasons.push('السعر ليس قريباً من منطقة اختراق فاشل واضحة.')
  }
  if (snapshot.momentumScore > -0.2) {
    rejectionReasons.push('يُفترض ظهور انعكاس قوي بعد الاختراق الكاذب.')
  }

  if (rejectionReasons.length) {
    return { rejectionReasons }
  }

  const riskReward = buildRiskReward(snapshot.lastPrice, 'short', {
    stopPct: 0.015,
    targetPct: 0.032,
  })

  const candidate = baseCandidate(
    `${snapshot.symbol}-failed-breakout`,
    snapshot.symbol,
    'short',
    'failed_breakout',
    'intra',
    'day',
    riskReward,
    {
      titleAr: 'اختراق كاذب ثم انعكاس قوي',
      bodyAr:
        'اختراق ثم عودة سريعة داخل النطاق، ما يفتح فرصة عكسية مع وقف فوق قمة الاختراق.',
      strengthsAr: 'اختراق كاذب واضح، انعكاس قوي.',
      risksAr: 'استمرار الحركة بعد الاختراق يلغي السيناريو.',
      contextAr: 'الأسهم ذات السيولة.',
    },
    0.65,
  )

  return { candidate }
}

export const stockStrategies: StrategyEvaluator[] = [
  confirmedBreakout,
  breakoutRetest,
  supportBounce,
  trendContinuation,
  failedBreakout,
  openingRange,
]

