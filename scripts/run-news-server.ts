import { startNewsServer } from '../src/server/newsServer'

startNewsServer().catch((error) => {
  console.error('[NewsServer] fatal error', error)
  process.exit(1)
})
