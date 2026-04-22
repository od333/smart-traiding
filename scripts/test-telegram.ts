/**
 * اختبار فوري لـ Telegram — لا يعتمد على جلسة السوق ولا الواجهة.
 * الاستخدام: npm run telegram:test
 */

import path from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.resolve(__dirname, '..', '.env')
const loaded = config({ path: envPath })
if (loaded.parsed || !loaded.error) {
  console.log('تم تحميل ملف البيئة بنجاح')
}

const { sendTestTelegramMessage, sendTestSignalAlert } = await import(
  '../src/services/telegramService'
)

async function main() {
  console.log('جاري اختبار الاتصال بتيليجرام...')

  const ok1 = await sendTestTelegramMessage()
  if (ok1) {
    console.log('تم إرسال رسالة الاختبار')
  } else {
    console.log('تعذر إرسال رسالة الاختبار (تحقق من TELEGRAM_BOT_TOKEN و TELEGRAM_CHAT_ID)')
  }

  const ok2 = await sendTestSignalAlert()
  if (ok2) {
    console.log('تم إرسال تنبيه الإشارة التجريبي')
  } else {
    console.log('تعذر إرسال تنبيه الإشارة التجريبي (تحقق من TELEGRAM_BOT_TOKEN و TELEGRAM_CHAT_ID)')
  }
}

main().catch((err) => {
  console.error('خطأ تيليجرام:', err)
  process.exit(1)
})
