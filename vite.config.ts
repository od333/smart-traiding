import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const finnhubToken = env.FINNHUB_API_KEY || env.VITE_MARKET_API_KEY || ''

  return {
    plugins: [
      react(),
      {
        name: 'finnhub-local-proxy',
        configureServer(server) {
          server.middlewares.use('/api/finnhub/quote', async (req, res) => {
            try {
              const url = new URL(req.url ?? '', 'http://localhost')
              const symbol = url.searchParams.get('symbol') ?? ''
              if (!symbol || !finnhubToken) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'missing symbol or token' }))
                return
              }
              const upstream = await fetch(
                `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(finnhubToken)}`,
              )
              const text = await upstream.text()
              res.setHeader('Content-Type', 'application/json')
              res.statusCode = upstream.status
              res.end(text)
            } catch (e) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: String(e) }))
            }
          })

          server.middlewares.use('/api/finnhub/candle', async (req, res) => {
            try {
              const url = new URL(req.url ?? '', 'http://localhost')
              const symbol = url.searchParams.get('symbol') ?? ''
              const resolution = url.searchParams.get('resolution') ?? '5'
              const from = url.searchParams.get('from') ?? ''
              const to = url.searchParams.get('to') ?? ''
              if (!symbol || !from || !to || !finnhubToken) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'missing params or token' }))
                return
              }
              const upstream = await fetch(
                `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=${encodeURIComponent(resolution)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&token=${encodeURIComponent(finnhubToken)}`,
              )
              const text = await upstream.text()
              res.setHeader('Content-Type', 'application/json')
              res.statusCode = upstream.status
              res.end(text)
            } catch (e) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: String(e) }))
            }
          })

          server.middlewares.use('/api/finnhub/news', async (_req, res) => {
            try {
              if (!finnhubToken) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'missing token' }))
                return
              }
              const upstream = await fetch(
                `https://finnhub.io/api/v1/news?category=general&token=${encodeURIComponent(finnhubToken)}`,
              )
              const text = await upstream.text()
              res.setHeader('Content-Type', 'application/json')
              res.statusCode = upstream.status
              res.end(text)
            } catch (e) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: String(e) }))
            }
          })

          server.middlewares.use('/api/yahoo/candle', async (req, res) => {
            try {
              const url = new URL(req.url ?? '', 'http://localhost')
              const symbol = url.searchParams.get('symbol') ?? ''
              const range = url.searchParams.get('range') ?? '5d'
              const interval = url.searchParams.get('interval') ?? '5m'
              if (!symbol) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'missing symbol' }))
                return
              }
              const upstream = await fetch(
                `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}&includePrePost=true`,
              )
              const text = await upstream.text()
              res.setHeader('Content-Type', 'application/json')
              res.statusCode = upstream.status
              res.end(text)
            } catch (e) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: String(e) }))
            }
          })

          server.middlewares.use('/api/yahoo/quote', async (req, res) => {
            try {
              const url = new URL(req.url ?? '', 'http://localhost')
              const symbol = url.searchParams.get('symbol') ?? ''
              if (!symbol) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'missing symbol' }))
                return
              }
              const upstream = await fetch(
                `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1m&includePrePost=true`,
              )
              const text = await upstream.text()
              res.setHeader('Content-Type', 'application/json')
              res.statusCode = upstream.status
              res.end(text)
            } catch (e) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: String(e) }))
            }
          })

          server.middlewares.use('/api/telegram/send', async (req, res) => {
            try {
              const token = env.TELEGRAM_BOT_TOKEN || env.VITE_TELEGRAM_BOT_TOKEN || ''
              const chatId = env.TELEGRAM_CHAT_ID || env.VITE_TELEGRAM_CHAT_ID || ''
              if (!token || !chatId) {
                res.statusCode = 400
                res.end(JSON.stringify({ ok: false, error: 'telegram env missing' }))
                return
              }
              if (req.method !== 'POST') {
                res.statusCode = 405
                res.end(JSON.stringify({ ok: false, error: 'method not allowed' }))
                return
              }
              const chunks: Uint8Array[] = []
              for await (const chunk of req) {
                chunks.push(chunk)
              }
              const bodyRaw = Buffer.concat(chunks).toString('utf8')
              const payload = bodyRaw ? (JSON.parse(bodyRaw) as { text?: string }) : {}
              const text = payload.text ?? ''
              if (!text.trim()) {
                res.statusCode = 400
                res.end(JSON.stringify({ ok: false, error: 'empty text' }))
                return
              }
              const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  text,
                  parse_mode: 'HTML',
                }),
              })
              const tgBody = await tgRes.text()
              res.statusCode = tgRes.status
              res.setHeader('Content-Type', 'application/json')
              res.end(tgBody)
            } catch (e) {
              res.statusCode = 500
              res.end(JSON.stringify({ ok: false, error: String(e) }))
            }
          })

        },
      },
    ],
    server: {
      port: 5188,
      strictPort: true,
    },
    preview: {
      port: 4188,
    },
  }
})
