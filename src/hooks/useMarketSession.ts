import { useEffect, useState } from 'react'
import { getMarketSession, type MarketSessionStatus } from '../utils/marketSession'

/** تحديث دوري لحالة الجلسة الأمريكية دون انتظار دورة المحرك */
export function useMarketSession(): MarketSessionStatus {
  const [session, setSession] = useState<MarketSessionStatus>(() => getMarketSession())

  useEffect(() => {
    const tick = () => setSession(getMarketSession())
    tick()
    const id = window.setInterval(tick, 15_000)
    return () => window.clearInterval(id)
  }, [])

  return session
}
