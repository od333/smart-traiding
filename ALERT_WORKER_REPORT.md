# تقرير Alert Worker — تنبيهات Telegram من خدمة خلفية مستقلة

## الهدف

نقل تنبيهات Telegram من الاعتماد على الواجهة إلى **خدمة خلفية مستقلة** تعمل بشكل مستمر حتى لو كان الموقع أو المتصفح مغلقًا.

---

## 1. الملفات التي أُضيفت

| الملف | الوظيفة |
|-------|----------|
| **`src/worker/alertWorker.ts`** | منطق الـ worker: حلقة كل 60 ثانية، فحص السوق، تقييم الإشارات والأخبار، إرسال Telegram مع منع التكرار. |
| **`src/worker/runAlertWorker.ts`** | نقطة تشغيل من داخل `src` لاستدعاء `runAlertWorker()`. |
| **`scripts/run-alert-worker.ts`** | نقطة تشغيل من مجلد `scripts` (يُستخدم من أوامر npm). |

## 2. الملفات التي تُعدَّل (بدون تغيير UI/Routing)

| الملف | التعديل |
|-------|---------|
| **`src/engine/index.ts`** | إضافة خيار `BuildEngineSnapshotOptions.skipAlerts`. عند `skipAlerts: true` لا يُستدعى `recordTrade` ولا `sendSignalAlert` من داخل المحرك (الـ worker يرسل بنفسه بعد منع التكرار). |
| **`src/config/marketData.ts`** | دالة `getEnv()` لقراءة المتغيرات من `process.env` في Node أو من `import.meta.env` في Vite. |
| **`src/config/optionsData.ts`** | نفس نمط `getEnv()` لدعم تشغيل الـ worker في Node. |
| **`src/services/telegramService.ts`** | قراءة `TELEGRAM_BOT_TOKEN` و `TELEGRAM_CHAT_ID` من `process.env` أو `import.meta.env`. |
| **`package.json`** | إضافة `tsx` كـ devDependency، وأمرين: `alerts` و `alerts:dev`. |

---

## 3. كيف يعمل Alert Worker

1. **تشغيل الخدمة**  
   تنفيذ: `npm run alerts` (أو `npm run alerts:dev` مع إعادة تشغيل تلقائي عند تغيير الملفات).

2. **الحلقة كل 60 ثانية**  
   يستدعي الـ worker دالة `tick()` كل `INTERVAL_MS` (60 ثانية).

3. **فلتر جلسة السوق**  
   في بداية كل `tick()`:
   - يستدعي `getMarketSession()`.
   - إذا كانت القيمة **ليست** `'OPEN'` (مثلاً `'CLOSED'` أو `'PREMARKET'`) يخرج من الدورة **بدون** جلب بيانات أو تشغيل المحرك، ثم ينتظر الدورة التالية.  
   → لا إرسال في PREMARKET ولا في CLOSED.

4. **جلب البيانات وتشغيل المحرك**  
   عندما تكون الجلسة `'OPEN'` فقط:
   - إنشاء `DataSource` عبر `createDataSource()` (نفس المصدر المستخدم في الواجهة).
   - استدعاء `buildEngineSnapshot(dataSource, { skipAlerts: true })` حتى لا يرسل المحرك تنبيهات بنفسه.

5. **الإشارات A+**  
   لكل إشارة في `snapshot.signals`:
   - يُحسب التقييم عبر `assessSignalPhilosophy(...)`.
   - إذا كان `assessment.isAPlus === true` **و** لم يُرسل نفس الإشارة خلال مدة الـ cooldown → استدعاء `sendSignalAlert(signal, { setupQuality })`.

6. **الأخبار المهمة**  
   لكل خبر في `snapshot.newsItems`:
   - يُعتبر مهماً إذا كان `tone === 'positive'` أو `'negative'`.
   - إذا لم يُرسل نفس الخبر خلال مدة الـ cooldown → استدعاء `sendNewsAlert(news)`.

---

## 4. كيف تمنع التكرار (Dedup / Cooldown)

- **مفتاح الإشارة:**  
  `symbol + strategy + direction`  
  (مثلاً `NVDA|confirmed_breakout|long`).

- **مفتاح الخبر:**  
  `symbol + id`  
  (مثلاً `NVDA|news-nvda-1`).

- **Cooldown:**  
  - إشارات: **30 دقيقة** (`SIGNAL_COOLDOWN_MS`).  
  - أخبار: **30 دقيقة** (`NEWS_COOLDOWN_MS`).

- **التنفيذ:**  
  - `lastSentSignal` و `lastSentNews` عبارة عن `Map<m key, lastSentTimestamp>`.  
  - قبل الإرسال: إذا كان المفتاح موجودًا و `Date.now() - lastSent < COOLDOWN_MS` لا يُرسل.  
  - بعد الإرسال: يُحدَّث الـ timestamp للمفتاح.

بهذا لا يُرسل نفس الإشارة (نفس الرمز + الاستراتيجية + الاتجاه) ولا نفس الخبر أكثر من مرة خلال 30 دقيقة.

---

## 5. كيف يعمل حتى لو الموقع مغلق

- الـ worker **عملية Node.js منفصلة** عن عملية Vite/المتصفح.
- يُشغَّل من سطر الأوامر: `npm run alerts` (أو من أي سيرفر/ـ PM2/ـ systemd حسب النشر).
- لا يعتمد على React ولا على فتح المتصفح ولا على تشغيل `npm run dev`.
- يستخدم نفس المنطق (DataSource، محرك الإشارات، تقييم الفلسفة، إرسال Telegram) لكن في بيئة Node مع دعم `process.env` في الإعدادات وخدمة Telegram.

لضمان استمراره على السيرفر يمكن استخدام:
- **PM2:** `pm2 start npm --name "smart-alerts" -- run alerts`
- أو **systemd** / **cron** حسب البيئة.

---

## 6. أوامر التشغيل

| الأمر | الوصف |
|-------|--------|
| **`npm run alerts`** | تشغيل الـ worker مرة واحدة (حلقة كل 60 ثانية، تعمل حتى إيقاف العملية). |
| **`npm run alerts:dev`** | نفس الوظيفة مع إعادة تشغيل تلقائي عند تغيير الملفات (`tsx --watch`). |

نقطة الدخول المستخدمة من الأوامر أعلاه: **`scripts/run-alert-worker.ts`** الذي يستدعي `runAlertWorker()` من `src/worker/alertWorker.ts`.

---

## 7. متغيرات البيئة (للعمل في Node)

عند تشغيل الـ worker من سطر الأوامر، يمكن تعيين نفس المتغيرات في `.env` أو في البيئة:

- **للمصدر والـ API:**  
  `VITE_MARKET_DATA_MODE`, `VITE_MARKET_API_URL`, `VITE_MARKET_API_KEY`  
  (أو استخدام الوضع mock إذا لم تُعيّن).

- **لـ Telegram:**  
  `VITE_TELEGRAM_BOT_TOKEN` أو `TELEGRAM_BOT_TOKEN`  
  `VITE_TELEGRAM_CHAT_ID` أو `TELEGRAM_CHAT_ID`

الواجهة لم تُغيّر؛ التعديلات فقط في المحرك (خيار `skipAlerts`)، الإعدادات (دعم Node)، وخدمة Telegram (دعم `process.env`).
