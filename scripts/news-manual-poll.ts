import 'dotenv/config'
import { pollAndProcessNews } from '../src/news-engine/services/newsPipelineService'

pollAndProcessNews()
  .then((result) => {
    console.log('[NewsManualPoll] done', result)
  })
  .catch((error) => {
    console.error('[NewsManualPoll] failed', error)
    process.exit(1)
  })
