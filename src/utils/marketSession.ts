export type MarketSessionStatus = "OPEN" | "CLOSED" | "PREMARKET"

export function isUSMarketOpen(): boolean {
  const now = new Date()
  const ny = new Date(
    now.toLocaleString("en-US", { timeZone: "America/New_York" }),
  )

  const day = ny.getDay()
  if (day === 0 || day === 6) return false

  const minutes = ny.getHours() * 60 + ny.getMinutes()
  const open = 9 * 60 + 30
  const close = 16 * 60

  return minutes >= open && minutes <= close
}

/**
 * Pre-Market: 4:00 AM – 9:30 AM New York (لا تُولَّد إشارات)
 * Open: 9:30 AM – 4:00 PM New York
 */
export function getMarketSession(): MarketSessionStatus {
  const now = new Date()
  const nyTime = new Date(
    now.toLocaleString("en-US", { timeZone: "America/New_York" }),
  )

  const day = nyTime.getDay()
  if (day === 0 || day === 6) return "CLOSED"

  const hours = nyTime.getHours()
  const minutes = nyTime.getMinutes()
  const totalMinutes = hours * 60 + minutes

  const preMarketStart = 4 * 60 // 4:00 AM
  const marketOpen = 9 * 60 + 30 // 9:30 AM
  const marketClose = 16 * 60 // 4:00 PM

  if (totalMinutes >= preMarketStart && totalMinutes < marketOpen) {
    return "PREMARKET"
  }
  if (totalMinutes >= marketOpen && totalMinutes <= marketClose) {
    return "OPEN"
  }
  return "CLOSED"
}
