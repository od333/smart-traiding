import type {
  OptionContract,
  ScoredSignal,
  OptionUsage,
} from '../domain/models'

export type OptionSuggestion = {
  contract: OptionContract
  linkedSignalId: string
  reasonAr: string
  riskLevelAr: string
  whaleSupportAr?: string
  flowConfidence?: number
  liquidityContextAr?: string
}

export function selectOptionsForSignal(
  signal: ScoredSignal,
  availableContracts: OptionContract[],
): OptionSuggestion[] {
  const directionUsage: OptionUsage =
    signal.tradeStyle === 'scalp' ? 'quick_trade' : 'balanced_trade'

  const filtered = availableContracts.filter((c) => {
    if (c.underlyingSymbol !== signal.symbol) return false
    if (c.usage !== directionUsage) return false
    if (c.liquidityScore < 0.6) return false
    if (c.spreadQuality < 0.5) return false
    return true
  })

  const sorted = filtered.sort(
    (a, b) =>
      b.liquidityScore +
      b.spreadQuality -
      (a.liquidityScore + a.spreadQuality),
  )

  return sorted.slice(0, 3).map((contract) => {
    const risk =
      contract.usage === 'quick_trade'
        ? 'مخاطرة أعلى مع حركة أسرع'
        : 'مستوى مخاطرة متزن مع مساحة زمنية أوسع'

    const directionLabel =
      signal.direction === 'long'
        ? 'الاستفادة من السيناريو الصاعد على السهم'
        : 'الاستفادة من السيناريو الهابط على السهم'

    const reasonAr = `${directionLabel}. تم اختيار هذا العقد لأنه ${
      contract.type === 'call' ? 'عقد شراء (Call)' : 'عقد بيع (Put)'
    } بسعر تنفيذ ${contract.strike}، ضمن فئة ${
      contract.expiry
    } المناسبة لإشارة ${
      signal.tradeStyle === 'scalp'
        ? 'سكالب سريع'
        : signal.tradeStyle === 'day'
          ? 'مضاربة يومية'
          : 'سوينق متزن'
    }، مع سيولة مقبولة (liquidityScore ${
      Math.round(contract.liquidityScore * 100) / 100
    }) وسبريد بجودة ${
      Math.round(contract.spreadQuality * 100) / 100
    }، ما يدعم سهولة الدخول والخروج من الصفقة.`

    const flowConfidence =
      contract.liquidityScore * 0.6 + contract.spreadQuality * 0.4

    const whaleSupportAr =
      flowConfidence > 0.75
        ? 'يوجد اهتمام واضح بعقود الأوبشن على هذا المستوى مع سيولة عالية ومستوى سعري جذاب.'
        : flowConfidence > 0.55
          ? 'النشاط على هذا العقد جيد ومتزن، بدون علامات مبالغة أو ضعف حاد.'
          : 'النشاط على هذا العقد محدود نسبياً؛ يفضّل التعامل معه بحجم منضبط.'

    const liquidityContextAr =
      contract.usage === 'quick_trade'
        ? 'هذا العقد مصمم لصفقات سريعة تستفيد من حركات قصيرة الأجل مع سيولة مركزة وزمن متبقي قصير.'
        : 'هذا العقد مناسب لتعرّض متزن على مدى أكبر مع وقت كافٍ لتطور الفكرة السعرية.'

    return {
      contract,
      linkedSignalId: signal.id,
      reasonAr,
      riskLevelAr: risk,
      whaleSupportAr,
      flowConfidence,
      liquidityContextAr,
    }
  })
}

