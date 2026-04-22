/**
 * تشغيل Alert Worker من مجلد scripts.
 * يحمّل .env من جذر المشروع تلقائياً ثم يشغّل الـ worker.
 * الاستخدام: npm run alerts  أو  npm run alerts:dev
 */

import path from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'

config()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.resolve(__dirname, '..', '.env')
const loaded = config({ path: envPath })
if (loaded.error) {
  console.warn('[AlertWorker] .env load warning:', loaded.error.message)
} else if (loaded.parsed) {
  console.log('[AlertWorker] Loaded .env from', envPath)
}

const { runAlertWorker } = await import('../src/worker/alertWorker')
runAlertWorker()
