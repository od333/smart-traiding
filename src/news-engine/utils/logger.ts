type LogLevel = 'info' | 'warn' | 'error'

export function log(level: LogLevel, message: string, meta?: unknown): void {
  const ts = new Date().toISOString()
  const payload = meta == null ? '' : ` ${JSON.stringify(meta)}`
  const line = `[NewsEngine][${level.toUpperCase()}][${ts}] ${message}${payload}`
  if (level === 'error') {
    console.error(line)
    return
  }
  if (level === 'warn') {
    console.warn(line)
    return
  }
  console.log(line)
}
