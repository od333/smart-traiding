import { prisma } from '../src/news-engine/db.ts'

const rows = await prisma.newsEngineState.findMany({ orderBy: { key: 'asc' } })
console.log(rows)
await prisma.$disconnect()
