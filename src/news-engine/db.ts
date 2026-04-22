import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var __newsPrisma: PrismaClient | undefined
}

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? 'file:./prisma/news-engine.db',
})

export const prisma = globalThis.__newsPrisma ?? new PrismaClient({ adapter })
if (process.env.NODE_ENV !== 'production') {
  globalThis.__newsPrisma = prisma
}
