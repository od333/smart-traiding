import { useEffect, useState } from 'react'
import type { EngineSnapshot } from '../engine'
import { buildEngineSnapshot } from '../engine'
import { defaultDataSource } from '../data/dataSource'
import { marketDataConfig } from '../config/marketData'

type UseEngineSnapshotOptions = {
  dataSource?: typeof defaultDataSource
}

export function useEngineSnapshot(options?: UseEngineSnapshotOptions) {
  const [snapshot, setSnapshot] = useState<EngineSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let isFirstRun = true
    const source = options?.dataSource ?? defaultDataSource

    async function run() {
      if (isFirstRun) {
        setLoading(true)
        setError(null)
      }
      try {
        const result = await buildEngineSnapshot(source, { skipAlerts: true })
        if (!cancelled) {
          if (typeof window !== 'undefined') {
            const ctorName = (source as unknown as { constructor?: { name?: string } }).constructor
              ?.name
            console.log('[Admin][Engine] marketDataConfig.mode:', marketDataConfig.mode)
            console.log('[Admin][Engine] dataSource type:', ctorName ?? 'unknown')
            console.log('[Admin][Engine] snapshot.dataMode:', result.dataMode)
            console.log('[Admin][Engine] snapshot.marketSession:', result.marketSession)
          }
          setSnapshot(result)
        }
      } catch (e) {
        if (!cancelled) {
          setError('تعذّر تحميل بيانات التحليل حالياً، سيتم إعادة المحاولة لاحقاً.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
          isFirstRun = false
        }
      }
    }

    run()
    const intervalId = setInterval(run, 25_000)
    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [options?.dataSource])

  return { snapshot, loading, error }
}

