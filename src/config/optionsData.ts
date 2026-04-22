export type OptionsDataMode = 'mock' | 'live'

function getEnv(key: string): string | undefined {
  if (typeof process !== 'undefined' && process.env?.[key] != null) {
    return process.env[key]
  }
  const meta =
    typeof import.meta !== 'undefined'
      ? (import.meta as { env?: Record<string, string> }).env
      : undefined
  return meta && typeof meta === 'object' ? meta[key] : undefined
}

const rawMode = getEnv('VITE_OPTIONS_DATA_MODE') as OptionsDataMode | undefined

export const optionsDataConfig = {
  mode: rawMode ?? 'mock',
  baseUrl: getEnv('VITE_OPTIONS_API_URL') ?? '',
  apiKey: getEnv('VITE_OPTIONS_API_KEY') ?? '',
  requestTimeoutMs: 8000,
}

