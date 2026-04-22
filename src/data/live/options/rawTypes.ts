export interface RawOptionContract {
  underlying: string
  type: string // 'call' | 'put' | provider-specific
  strike: number
  expiration: string // ISO date or YYYY-MM-DD
  volume?: number
  openInterest?: number
  bid?: number
  ask?: number
}

export interface RawOptionsResponse {
  contracts: RawOptionContract[]
}

