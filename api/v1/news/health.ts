import { prisma } from '../../../src/news-engine/db'
import { getCronRuntimeHealth } from '../../../src/news-engine/services/cronRuntimeService'

type VercelReq = { method?: string }
type VercelRes = {
  status: (code: number) => VercelRes
  json: (data: unknown) => void
}

export default async function handler(_req: VercelReq, res: VercelRes): Promise<void> {
  const count = await prisma.newsItem.count()
  const latest = await prisma.newsItem.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  })
  const runtime = await getCronRuntimeHealth()
  res.status(200).json({
    ok: true,
    ...runtime,
    totalNews: count,
    lastNewsAt: latest?.createdAt ?? null,
  })
}
