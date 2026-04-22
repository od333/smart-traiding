import type {
  AnalyticalHistory,
  AnalystOpinion,
  MarketState,
  NewsItem,
  OptionContract,
  PriceSnapshot,
  Stock,
  StockPersonalityProfile,
  Watchlist,
} from '../domain/models'
import { CORE_WATCHLIST } from '../config/watchlist'

const CORE_NAMES: Record<string, { nameAr: string; sectorAr: string }> = {
  NVDA: { nameAr: 'نفيديا', sectorAr: 'تقنية / رقائق' },
  AMZN: { nameAr: 'أمازون', sectorAr: 'تقنية / تجارة' },
  GOOGL: { nameAr: 'جوجل (ألفابت)', sectorAr: 'تقنية / إعلانات' },
  SPX: { nameAr: 'مؤشر إس أند بي 500', sectorAr: 'مؤشرات / أوبشن مؤشر' },
}

export const stocks: Stock[] = CORE_WATCHLIST.map((symbol) => {
  const info = CORE_NAMES[symbol] ?? { nameAr: symbol, sectorAr: '—' }
  return {
    symbol,
    nameAr: info.nameAr,
    sectorAr: info.sectorAr,
    isInWatchlist: true,
  }
})

export const marketState: MarketState = {
  sessionLabelAr: 'جلسة أمريكية',
  overallMood: 'mixed',
  descriptionAr:
    'محطة منضبطة: أسهم NVDA وAMZN وGOOGL، ومؤشر SPX لسياق الأوبشن على المؤشر.',
  indices: [
    {
      indexName: 'Nasdaq',
      changePercent: 0.8,
      mood: 'bullish',
      descriptionAr: 'سياق تقني عام — يُستخدم كخلفية فقط لقراءة الفرص.',
    },
  ],
}

export const priceSnapshots: PriceSnapshot[] = [
  {
    symbol: 'NVDA',
    lastPrice: 130,
    vwap: 128,
    averageVolume: 2_000_000,
    currentVolume: 2_200_000,
    trendScore: 0.45,
    momentumScore: 0.3,
    distanceFromRecentSupportPct: 0.03,
    distanceFromRecentResistancePct: 0.025,
    isNearOpeningRangeBreak: false,
    hasStrongNews: false,
  },
  {
    symbol: 'AMZN',
    lastPrice: 195,
    vwap: 193,
    averageVolume: 1_200_000,
    currentVolume: 1_350_000,
    trendScore: 0.35,
    momentumScore: 0.2,
    distanceFromRecentSupportPct: 0.025,
    distanceFromRecentResistancePct: 0.04,
    isNearOpeningRangeBreak: false,
    hasStrongNews: false,
  },
  {
    symbol: 'GOOGL',
    lastPrice: 175,
    vwap: 174,
    averageVolume: 900_000,
    currentVolume: 1_000_000,
    trendScore: 0.4,
    momentumScore: 0.25,
    distanceFromRecentSupportPct: 0.02,
    distanceFromRecentResistancePct: 0.035,
    isNearOpeningRangeBreak: false,
    hasStrongNews: false,
  },
  {
    symbol: 'SPX',
    lastPrice: 5200,
    vwap: 5185,
    averageVolume: 0,
    currentVolume: 0,
    trendScore: 0.15,
    momentumScore: 0.1,
    distanceFromRecentSupportPct: 0.01,
    distanceFromRecentResistancePct: 0.02,
    isNearOpeningRangeBreak: false,
    hasStrongNews: false,
  },
]

export const newsItems: NewsItem[] = [
  {
    id: 'news-nvda-1',
    symbol: 'NVDA',
    tone: 'neutral',
    titleAr: 'متابعة قطاع الرقائق',
    bodyAr: 'تقلبات متوقعة مع تركيز على التدفق والسيولة داخل الجلسة.',
  },
  {
    id: 'news-amzn-1',
    symbol: 'AMZN',
    tone: 'neutral',
    titleAr: 'نشاط التجارة الإلكترونية',
    bodyAr: 'قراءة عامة دون تفاصيل حدث محدد.',
  },
  {
    id: 'news-googl-1',
    symbol: 'GOOGL',
    tone: 'neutral',
    titleAr: 'إعلانات ونمو',
    bodyAr: 'سياق قطاعي عام للمتابعة.',
  },
  {
    id: 'news-spx-1',
    symbol: 'SPX',
    tone: 'neutral',
    titleAr: 'قراءة عامة للمؤشر',
    bodyAr: 'سياق واسع للمؤشر — مفيد لأوبشن المؤشر والتحوط.',
  },
]

export const analystOpinions: AnalystOpinion[] = []

export const optionContracts: OptionContract[] = [
  {
    id: 'opt-nvda-c',
    underlyingSymbol: 'NVDA',
    type: 'call',
    strike: 135,
    expiry: 'أسبوعي',
    liquidityScore: 0.75,
    spreadQuality: 0.7,
    openInterest: 12_000,
    usage: 'balanced_trade',
  },
  {
    id: 'opt-nvda-p',
    underlyingSymbol: 'NVDA',
    type: 'put',
    strike: 125,
    expiry: 'أسبوعي',
    liquidityScore: 0.72,
    spreadQuality: 0.68,
    openInterest: 10_000,
    usage: 'quick_trade',
  },
  {
    id: 'opt-amzn-c',
    underlyingSymbol: 'AMZN',
    type: 'call',
    strike: 200,
    expiry: 'أسبوعي',
    liquidityScore: 0.7,
    spreadQuality: 0.65,
    openInterest: 8_000,
    usage: 'balanced_trade',
  },
  {
    id: 'opt-amzn-p',
    underlyingSymbol: 'AMZN',
    type: 'put',
    strike: 190,
    expiry: 'أسبوعي',
    liquidityScore: 0.68,
    spreadQuality: 0.64,
    openInterest: 7_500,
    usage: 'quick_trade',
  },
  {
    id: 'opt-googl-c',
    underlyingSymbol: 'GOOGL',
    type: 'call',
    strike: 180,
    expiry: 'أسبوعي',
    liquidityScore: 0.7,
    spreadQuality: 0.66,
    openInterest: 6_000,
    usage: 'balanced_trade',
  },
  {
    id: 'opt-googl-p',
    underlyingSymbol: 'GOOGL',
    type: 'put',
    strike: 170,
    expiry: 'أسبوعي',
    liquidityScore: 0.67,
    spreadQuality: 0.63,
    openInterest: 5_500,
    usage: 'quick_trade',
  },
  {
    id: 'opt-spx-c',
    underlyingSymbol: 'SPX',
    type: 'call',
    strike: 5250,
    expiry: 'أسبوعي',
    liquidityScore: 0.78,
    spreadQuality: 0.72,
    openInterest: 50_000,
    usage: 'balanced_trade',
  },
  {
    id: 'opt-spx-p',
    underlyingSymbol: 'SPX',
    type: 'put',
    strike: 5100,
    expiry: 'أسبوعي',
    liquidityScore: 0.76,
    spreadQuality: 0.7,
    openInterest: 48_000,
    usage: 'quick_trade',
  },
]

export const personalities: StockPersonalityProfile[] = CORE_WATCHLIST.map((symbol) => ({
  symbol,
  summaryAr: `ملف مبسّط لـ ${symbol} ضمن المحطة الثلاثية.`,
  preferredBias: 'momentum_runner',
  bestStrategies: [
    {
      strategy: 'confirmed_breakout',
      winRate: 0.62,
      avgRiskReward: 2,
      notesAr: 'اختراقات مدعومة بالسيولة.',
    },
  ],
  weakStrategies: [],
  bestSessionsAr: 'الجلسة الأمريكية الرئيسية.',
  newsSensitivityAr: 'حساسية متوسطة للأخبار العامة.',
}))

export const analyticalHistories: AnalyticalHistory[] = []

export const watchlists: Watchlist[] = [
  {
    id: 'wl-terminal',
    nameAr: 'محطة الأسهم والمؤشر (NVDA · AMZN · GOOGL · SPX)',
    symbols: [...CORE_WATCHLIST],
  },
]
