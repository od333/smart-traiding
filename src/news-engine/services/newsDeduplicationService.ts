import { prisma } from '../db'

function titleSimilarity(a: string, b: string): number {
  const t1 = new Set(a.toLowerCase().split(/\W+/).filter(Boolean))
  const t2 = new Set(b.toLowerCase().split(/\W+/).filter(Boolean))
  if (!t1.size || !t2.size) return 0
  let intersection = 0
  for (const token of t1) {
    if (t2.has(token)) intersection += 1
  }
  const union = new Set([...t1, ...t2]).size
  return intersection / union
}

export async function isDuplicateStory(params: {
  dedupeHash: string
  url: string
  title: string
  summary: string
  symbol: string
  windowMinutes: number
  impactScore: number
  urgencyScore: number
}): Promise<boolean> {
  const existingHash = await prisma.newsItem.findFirst({
    where: {
      OR: [{ dedupeHash: params.dedupeHash }, { url: params.url }],
    },
    select: { id: true },
  })
  if (existingHash) return true

  const since = new Date(Date.now() - params.windowMinutes * 60_000)
  const recent = await prisma.newsItem.findMany({
    where: { symbol: params.symbol, publishedAt: { gte: since } },
    select: { title: true, summary: true, impactScore: true, urgencyScore: true, sentToTelegram: true },
    take: 60,
    orderBy: { publishedAt: 'desc' },
  })

  return recent.some((r) => {
    const tScore = titleSimilarity(r.title, params.title)
    const sScore = titleSimilarity(r.summary, params.summary)
    const nearDuplicate = tScore >= 0.85 || (tScore >= 0.72 && sScore >= 0.7)
    if (!nearDuplicate) return false

    // follow-up stories are suppressed unless they add materially stronger urgency/impact
    const impactDelta = params.impactScore - r.impactScore
    const urgencyDelta = params.urgencyScore - r.urgencyScore
    const materiallyNew = impactDelta >= 12 || urgencyDelta >= 12
    if (r.sentToTelegram && !materiallyNew) return true
    return nearDuplicate
  })
}
