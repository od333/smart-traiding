import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { newsEnv } from '../news-engine/env'
import { log } from '../news-engine/utils/logger'
import { newsRouter } from './newsRoutes'
import { ensureDefaultWatchlist } from '../news-engine/services/watchlistManagementService'

export async function startNewsServer(): Promise<void> {
  await ensureDefaultWatchlist()

  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '1mb' }))
  app.use('/api/v1/news', newsRouter)

  app.listen(newsEnv.NEWS_API_PORT, () => {
    log('info', 'News API server started', { port: newsEnv.NEWS_API_PORT })
  })
}
