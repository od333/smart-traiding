import { useEffect, useMemo, useState } from 'react'

type UiNewsItem = {
  id: string
  symbol: string
  title: string
  source: string
  sentiment: 'bullish' | 'bearish' | 'neutral'
  impactLevel: 'high' | 'medium' | 'low'
  detectedCategory: string
  arabicSummary: string
  actionNote: string
  sentToTelegram: boolean
  publishedAt: string
}

const apiBase = (import.meta.env.VITE_NEWS_API_BASE as string | undefined)?.replace(/\/$/, '') ?? ''

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${apiBase}${path}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as T
}

async function apiPost<T>(path: string): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, { method: 'POST' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as T
}

export default function NewsAdminPage() {
  const [items, setItems] = useState<UiNewsItem[]>([])
  const [loading, setLoading] = useState(false)
  const [symbolFilter, setSymbolFilter] = useState('ALL')
  const [sentimentFilter, setSentimentFilter] = useState('ALL')
  const [impactFilter, setImpactFilter] = useState('ALL')
  const [status, setStatus] = useState<string>('')

  const load = async () => {
    setLoading(true)
    try {
      const data = await apiGet<{ items: UiNewsItem[] }>('/api/v1/news/latest')
      setItems(data.items)
    } catch (error) {
      setStatus(`Load error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const filtered = useMemo(() => {
    return items.filter((x) => {
      if (symbolFilter !== 'ALL' && x.symbol !== symbolFilter) return false
      if (sentimentFilter !== 'ALL' && x.sentiment !== sentimentFilter) return false
      if (impactFilter !== 'ALL' && x.impactLevel !== impactFilter) return false
      return true
    })
  }, [items, symbolFilter, sentimentFilter, impactFilter])

  const symbols = useMemo(() => ['ALL', ...new Set(items.map((x) => x.symbol))], [items])

  const runPoll = async () => {
    setStatus('Polling...')
    try {
      const out = await apiPost<{ ok: boolean; result: unknown }>('/api/v1/news/poll')
      setStatus(`Polling complete: ${JSON.stringify(out.result)}`)
      await load()
    } catch (error) {
      setStatus(`Poll error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const sendTestTelegram = async () => {
    setStatus('Sending test Telegram...')
    try {
      const out = await apiPost<{ ok: boolean; error?: string }>('/api/v1/news/test-telegram')
      setStatus(out.ok ? 'Test Telegram sent successfully' : `Telegram failed: ${out.error ?? 'unknown'}`)
    } catch (error) {
      setStatus(`Telegram error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-slate-800/80 bg-slate-900/50 px-4 py-3">
        <h1 className="text-base font-bold text-slate-100">News Intelligence Engine — Admin</h1>
        <p className="text-[11px] text-slate-500">Latest normalized news, filters, manual poll, and Telegram test.</p>
      </header>

      <section className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs">
        <select className="rounded-lg bg-slate-900 px-2 py-1" value={symbolFilter} onChange={(e) => setSymbolFilter(e.target.value)}>
          {symbols.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select className="rounded-lg bg-slate-900 px-2 py-1" value={sentimentFilter} onChange={(e) => setSentimentFilter(e.target.value)}>
          {['ALL', 'bullish', 'bearish', 'neutral'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select className="rounded-lg bg-slate-900 px-2 py-1" value={impactFilter} onChange={(e) => setImpactFilter(e.target.value)}>
          {['ALL', 'high', 'medium', 'low'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <button type="button" className="rounded-lg border border-sky-600 px-3 py-1 hover:bg-sky-900/30" onClick={runPoll}>
          Manual Poll
        </button>
        <button type="button" className="rounded-lg border border-emerald-600 px-3 py-1 hover:bg-emerald-900/30" onClick={sendTestTelegram}>
          Test Telegram
        </button>
        <button type="button" className="rounded-lg border border-slate-600 px-3 py-1 hover:bg-slate-800/50" onClick={load}>
          Refresh
        </button>
        {status && <span className="text-slate-400">{status}</span>}
      </section>

      <section className="overflow-auto rounded-xl border border-slate-800 bg-slate-950/40">
        <table className="min-w-full text-right text-xs">
          <thead className="bg-slate-900/70 text-slate-300">
            <tr>
              <th className="px-2 py-2">Symbol</th>
              <th className="px-2 py-2">Headline</th>
              <th className="px-2 py-2">Sentiment</th>
              <th className="px-2 py-2">Impact</th>
              <th className="px-2 py-2">Sent</th>
              <th className="px-2 py-2">Time</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-2 py-3 text-slate-400" colSpan={6}>
                  Loading...
                </td>
              </tr>
            )}
            {!loading &&
              filtered.map((x) => (
                <tr key={x.id} className="border-t border-slate-800 align-top">
                  <td className="px-2 py-2 font-mono text-sky-300">{x.symbol}</td>
                  <td className="px-2 py-2">
                    <p className="text-slate-200">{x.title}</p>
                    <p className="mt-1 text-[10px] text-slate-500">{x.arabicSummary}</p>
                    <p className="text-[10px] text-violet-300">{x.actionNote}</p>
                  </td>
                  <td className="px-2 py-2">{x.sentiment}</td>
                  <td className="px-2 py-2">{x.impactLevel}</td>
                  <td className="px-2 py-2">
                    <span className={x.sentToTelegram ? 'text-emerald-300' : 'text-amber-300'}>
                      {x.sentToTelegram ? 'sent' : 'not sent'}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-slate-400">{new Date(x.publishedAt).toLocaleString()}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
