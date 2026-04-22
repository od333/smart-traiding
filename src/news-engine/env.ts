import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  NEWS_API_PORT: z.coerce.number().int().positive().default(8787),
  NEWS_POLL_INTERVAL_MS: z.coerce.number().int().min(60_000).max(180_000).default(120_000),
  NEWS_IMPACT_THRESHOLD: z.coerce.number().int().min(0).max(100).default(60),
  NEWS_DEDUPE_WINDOW_MINUTES: z.coerce.number().int().min(10).max(1440).default(180),
  NEWS_MAX_TELEGRAM_RETRIES: z.coerce.number().int().min(1).max(10).default(3),
  NEWS_MAX_ALERTS_PER_POLL: z.coerce.number().int().min(1).max(50).default(5),
  NEWS_INCLUDE_MARKET_WIDE: z
    .string()
    .optional()
    .transform((v) => (v == null ? true : v.toLowerCase() !== 'false')),
  FINNHUB_API_KEY: z.string().optional(),
  VITE_MARKET_API_KEY: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
  VITE_TELEGRAM_BOT_TOKEN: z.string().optional(),
  VITE_TELEGRAM_CHAT_ID: z.string().optional(),
})

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  const msg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n')
  throw new Error(`Invalid env configuration:\n${msg}`)
}

export const newsEnv = parsed.data
