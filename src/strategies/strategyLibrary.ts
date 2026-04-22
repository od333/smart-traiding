import type { StrategyDefinition } from "./strategyTypes"

export const strategyLibrary: StrategyDefinition[] = [
  {
    key: "confirmed_breakout",
    name: "Breakout with Volume Confirmation",
    sourceBook: "Technical Analysis of the Financial Markets – John Murphy",
    description:
      "اختراق مقاومة واضحة مع زيادة قوية في الفوليوم.",
    conditionsAr:
      "السهم في اتجاه صاعد ويخترق مقاومة مهمة مع فوليوم أعلى من المتوسط.",
    invalidConditionsAr:
      "اختراق بدون فوليوم أو في سوق متذبذب.",
    bestForAr:
      "الأسهم القيادية ذات السيولة العالية.",
    marketRegime: "breakout",
    riskModelAr:
      "وقف أسفل مستوى الاختراق مباشرة.",
    minRiskReward: 2,
    preferredTimeframes: ["15m", "1h", "1d"],
    tags: ["breakout", "volume"],
  },
  {
    key: "breakout_retest",
    name: "Retest after Breakout",
    sourceBook: "Reminiscences of a Stock Operator – Edwin Lefèvre",
    description:
      "اختراق مستوى مهم ثم عودة لاختبار المستوى قبل استمرار الحركة.",
    conditionsAr:
      "اختراق واضح ثم تراجع للسعر نحو المستوى المخترق مع ثبات.",
    invalidConditionsAr:
      "عودة السعر تحت المستوى بشكل واضح.",
    bestForAr:
      "الأسهم التي تتحرك في اتجاه واضح.",
    marketRegime: "trend",
    riskModelAr:
      "وقف أسفل مستوى الاختراق.",
    minRiskReward: 2,
    preferredTimeframes: ["15m", "1h"],
    tags: ["retest", "continuation"],
  },
  {
    key: "support_bounce",
    name: "Support Bounce in Uptrend",
    sourceBook: "Technical Analysis of the Financial Markets – John Murphy",
    description:
      "ارتداد من دعم قوي ضمن اتجاه صاعد.",
    conditionsAr:
      "اتجاه صاعد والسعر يلامس دعم واضح ويظهر ارتداد.",
    invalidConditionsAr:
      "كسر الدعم.",
    bestForAr:
      "الأسهم ذات الاتجاه الواضح.",
    marketRegime: "trend",
    riskModelAr:
      "وقف أسفل الدعم.",
    minRiskReward: 1.8,
    preferredTimeframes: ["15m", "1h", "1d"],
    tags: ["support", "bounce"],
  },
  {
    key: "trend_continuation",
    name: "Trend Continuation after Consolidation",
    sourceBook: "Market Wizards – Jack Schwager",
    description:
      "تماسك داخل اتجاه صاعد ثم استمرار الحركة.",
    conditionsAr:
      "اتجاه صاعد مع فترة تماسك قصيرة ثم اختراق.",
    invalidConditionsAr:
      "تماسك طويل أو كسر الاتجاه.",
    bestForAr:
      "الأسهم القوية ذات الفوليوم.",
    marketRegime: "trend",
    riskModelAr:
      "وقف أسفل منطقة التماسك.",
    minRiskReward: 2,
    preferredTimeframes: ["5m", "15m", "1h"],
    tags: ["trend", "continuation"],
  },
  {
    key: "failed_breakout",
    name: "Failed Breakout Reversal",
    sourceBook: "Reminiscences of a Stock Operator – Edwin Lefèvre",
    description:
      "اختراق كاذب ثم انعكاس قوي.",
    conditionsAr:
      "اختراق ثم عودة سريعة داخل النطاق.",
    invalidConditionsAr:
      "استمرار الحركة بعد الاختراق.",
    bestForAr:
      "الأسهم ذات السيولة.",
    marketRegime: "range",
    riskModelAr:
      "وقف فوق قمة الاختراق.",
    minRiskReward: 2,
    preferredTimeframes: ["5m", "15m"],
    tags: ["reversal"],
  },
  {
    key: "opening_range",
    name: "Opening Range Breakout",
    sourceBook: "Market Wizards – Jack Schwager",
    description:
      "اختراق نطاق الافتتاح مع فوليوم.",
    conditionsAr:
      "تحديد نطاق أول 15 دقيقة ثم اختراق.",
    invalidConditionsAr:
      "اختراق بدون فوليوم.",
    bestForAr:
      "المضاربة السريعة.",
    marketRegime: "breakout",
    riskModelAr:
      "وقف داخل النطاق.",
    minRiskReward: 2,
    preferredTimeframes: ["5m", "15m"],
    tags: ["opening", "breakout"],
  },
]
