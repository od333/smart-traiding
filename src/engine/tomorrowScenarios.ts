import type {
  MarketState,
  PriceSnapshot,
  TomorrowScenario,
  ConfidenceLevel,
} from '../domain/models'

function determineScenarioForSnapshot(
  snapshot: PriceSnapshot,
  market: MarketState,
): TomorrowScenario {
  let type: TomorrowScenario['type'] = 'range_chop'
  let confidence: ConfidenceLevel = 'medium'
  let reasonAr = 'تذبذب متوقع داخل نطاق السعر الحالي بدون أفضلية قوية.'

  if (snapshot.trendScore > 0.6 && snapshot.momentumScore > 0.3) {
    type = 'trend_continuation'
    confidence = 'high'
    reasonAr =
      'اتجاه صاعد واضح وزخم إيجابي مع سياق سوق داعم، ما يرجّح استمرار الحركة الصاعدة غداً ما لم يظهر خبر معاكس قوي.'
  } else if (
    snapshot.trendScore > 0.3 &&
    snapshot.momentumScore > 0.2 &&
    snapshot.currentVolume > snapshot.averageVolume * 1.3
  ) {
    type = 'gap_up'
    confidence = 'medium'
    reasonAr =
      'زخم قوي وفوليوم أعلى من المعتاد بالقرب من قمم قريبة، ما يفتح احتمال فجوة صاعدة في افتتاح جلسة الغد.'
  } else if (
    snapshot.trendScore < -0.4 &&
    snapshot.momentumScore < -0.3 &&
    snapshot.currentVolume > snapshot.averageVolume * 1.3
  ) {
    type = 'gap_down'
    confidence = 'medium'
    reasonAr =
      'ضغط بيعي واضح على السهم مع اتجاه هابط وزخم سلبي وفوليوم مرتفع، ما يرجّح احتمال فجوة هابطة في الجلسة القادمة.'
  } else if (
    Math.abs(snapshot.trendScore) < 0.2 &&
    Math.abs(snapshot.momentumScore) < 0.2
  ) {
    type = 'no_trade_zone'
    confidence = 'medium'
    reasonAr =
      'السهم يتحرك داخل نطاق ضيق بدون اتجاه واضح أو زخم مقنع، ما يجعل الجلسة القادمة أقرب لمنطقة لا تداول حتى يتضح السياق.'
  } else if (
    Math.abs(snapshot.trendScore) > 0.5 &&
    snapshot.momentumScore * snapshot.trendScore < 0
  ) {
    type = 'critical_reversal'
    confidence = 'medium'
    reasonAr =
      'اتجاه واضح مع ظهور زخم معاكس قوي بالقرب من منطقة سعرية محورية، ما يفتح احتمال انعكاس مهم في جلسة الغد يحتاج لإدارة مخاطرة منضبطة.'
  }

  if (market.overallMood === 'mixed' && confidence === 'high') {
    confidence = 'medium'
  }

  return {
    symbol: snapshot.symbol,
    type,
    confidence,
    reasonAr,
  }
}

export function buildTomorrowScenarios(
  snapshots: PriceSnapshot[],
  market: MarketState,
): TomorrowScenario[] {
  return snapshots.map((s) => determineScenarioForSnapshot(s, market))
}

