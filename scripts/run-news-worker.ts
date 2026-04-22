import 'dotenv/config'
import { newsEnv } from '../src/news-engine/env'
import { pollAndProcessNews } from '../src/news-engine/services/newsPipelineService'
import { log } from '../src/news-engine/utils/logger'

async function tick() {
  try {
    const result = await pollAndProcessNews()
    log('info', 'Worker tick complete', result)
  } catch (error) {
    log('error', 'Worker tick failed', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

async function main() {
  log('info', 'News polling worker started', {
    intervalMs: newsEnv.NEWS_POLL_INTERVAL_MS,
  })
  await tick()
  setInterval(() => {
    void tick()
  }, newsEnv.NEWS_POLL_INTERVAL_MS)
}

void main()
