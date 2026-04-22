import type {
  MarketState,
  NewsItem,
  AnalystOpinion,
  PriceSnapshot,
  ScoredSignal,
  StockPersonalityProfile,
} from '../domain/models'
import { getStrategy } from '../strategies/strategyRegistry'
import { evaluateSmartMoney } from '../smart-money/smartMoneyEngine'
import { stockStrategies, type StrategyEvaluation } from './signalStrategies'

export type OptionsFlowBySymbol = Record<
  string,
  { callVolume: number; largeOrders: number }
>

type Context = {
  market: MarketState
  news: NewsItem[]
  opinions: AnalystOpinion[]
  personality?: StockPersonalityProfile
  optionsFlowBySymbol?: OptionsFlowBySymbol
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function computeStructureScore(snapshot: PriceSnapshot): number {
  const trendComponent = (snapshot.trendScore + 1) / 2 // -1..1 -> 0..1

  const nearKeyLevelsScore = 1 - clamp01(
    Math.min(
      snapshot.distanceFromRecentSupportPct * 50,
      snapshot.distanceFromRecentResistancePct * 50,
    ),
  )

  // نعطي وزنًا أعلى لوضوح الاتجاه وقرب السعر من مناطق متوازنة بين دعم/مقاومة
  return clamp01(0.7 * trendComponent + 0.3 * nearKeyLevelsScore)
}

function computeMomentumScore(snapshot: PriceSnapshot): number {
  // نريد الزخم الواضح فقط أن يرفع التقييم
  const base = clamp01((snapshot.momentumScore + 1) / 2)
  if (base < 0.3) return base * 0.7
  if (base > 0.7) return clamp01(0.8 * base + 0.2)
  return base
}

function computeVolumeScore(snapshot: PriceSnapshot): number {
  if (snapshot.averageVolume === 0) return 0.3
  const ratio = snapshot.currentVolume / snapshot.averageVolume
  if (ratio <= 0.5) return 0.2
  if (ratio >= 2.5) return 1
  // نحتاج على الأقل حجمًا قريبًا من المتوسط حتى تعتبر الإشارة جدية
  if (ratio < 0.9) return 0.3
  return clamp01(0.3 + ((ratio - 0.9) / 1.6) * 0.7)
}

function computeMarketContextScore(market: MarketState): number {
  switch (market.overallMood) {
    case 'bullish':
      return 0.8
    case 'bearish':
      return 0.25
    case 'mixed':
      return 0.5
    case 'neutral':
    default:
      return 0.6
  }
}

function computeNewsScore(
  relatedNews: NewsItem[],
  relatedOpinions: AnalystOpinion[],
): number {
  if (!relatedNews.length && !relatedOpinions.length) return 0.5

  const positiveNews = relatedNews.filter((n) => n.tone === 'positive').length
  const negativeNews = relatedNews.filter((n) => n.tone === 'negative').length
  const positiveOpinions = relatedOpinions.filter((o) => o.tone === 'positive').length
  const negativeOpinions = relatedOpinions.filter((o) => o.tone === 'negative').length

  const net = positiveNews + positiveOpinions - (negativeNews + negativeOpinions)

  // الأخبار الإيجابية القوية فقط ترفع التقييم، بينما الأخبار السلبية تخفضه سريعًا
  if (net === 0) return 0.5
  if (net > 0) return clamp01(0.55 + net * 0.08)
  return clamp01(0.4 + net * -0.1)
}

function computePersonalityFitScore(
  personality: StockPersonalityProfile | undefined,
): number {
  if (!personality) return 0.5
  const bestWinRate = personality.bestStrategies[0]?.winRate ?? 0.5
  const weakPenalty =
    personality.weakStrategies[0]?.winRate !== undefined &&
    personality.weakStrategies[0].winRate < 0.45
      ? 0.1
      : 0
  return clamp01(bestWinRate - weakPenalty)
}

function computeExecutionQualityScore(riskRewardRatio: number): number {
  if (riskRewardRatio <= 1) return 0.3
  if (riskRewardRatio >= 3) return 1
  return clamp01(0.3 + ((riskRewardRatio - 1) / 2) * 0.7)
}

export function evaluateStockSignals(
  snapshot: PriceSnapshot,
  context: Context,
): ScoredSignal[] {
  const { market, news, opinions, personality } = context

  const relatedNews = news.filter((n) => n.symbol === snapshot.symbol)
  const relatedOpinions = opinions.filter((o) => o.symbol === snapshot.symbol)

  const evaluations: StrategyEvaluation[] = stockStrategies.map((fn) =>
    fn({ snapshot }),
  )

  const rawCandidates = evaluations
    .map((e) => e.candidate)
    .filter(Boolean) as ScoredSignal[]

  // لا يسمح بأي إشارة لا تطابق استراتيجية مسجلة في المكتبة
  const candidatesFromLibrary = rawCandidates.filter((c) => getStrategy(c.strategy) != null)
  if (!candidatesFromLibrary.length) return []

  const structureScore = computeStructureScore(snapshot)
  const momentumScore = computeMomentumScore(snapshot)
  const volumeScore = computeVolumeScore(snapshot)
  const marketContextScore = computeMarketContextScore(market)
  const newsScore = computeNewsScore(relatedNews, relatedOpinions)
  const personalityFitScore = computePersonalityFitScore(personality)

  const smartMoney = evaluateSmartMoney({
    symbol: snapshot.symbol,
    volume: snapshot.currentVolume,
    avgVolume: snapshot.averageVolume,
    options: context.optionsFlowBySymbol?.[snapshot.symbol] ?? undefined,
  })

  const scored: ScoredSignal[] = candidatesFromLibrary
    .map((candidate) => {
      const executionQualityScore = computeExecutionQualityScore(
        candidate.riskReward.riskRewardRatio,
      )

      let finalScore = clamp01(
        structureScore * 0.187 +
          momentumScore * 0.102 +
          volumeScore * 0.136 +
          marketContextScore * 0.136 +
          newsScore * 0.068 +
          personalityFitScore * 0.102 +
          executionQualityScore * 0.119 +
          smartMoney.smartMoneyScore * 0.15,
      )

      if (smartMoney.smartMoneyScore >= 0.5) {
        finalScore = Math.min(1, finalScore + 0.05)
      }

      const confidence: ScoredSignal['confidence'] =
        finalScore >= 0.8 ? 'high' : finalScore >= 0.6 ? 'medium' : 'low'

      return {
        ...candidate,
        structureScore,
        momentumScore,
        volumeScore,
        marketContextScore,
        newsScore,
        personalityFitScore,
        executionQualityScore,
        smartMoneyScore: smartMoney.smartMoneyScore,
        unusualVolume: smartMoney.unusualVolume,
        optionsFlow: smartMoney.optionsFlow,
        finalScore,
        confidence,
      }
    })
    .filter((s) => s.finalScore > 0.5)

  scored.sort((a, b) => b.finalScore - a.finalScore)

  return scored
}

