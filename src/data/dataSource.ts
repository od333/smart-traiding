import type {
  AnalyticalHistory,
  AnalystOpinion,
  MarketState,
  NewsItem,
  OptionContract,
  PriceSnapshot,
  Stock,
  StockPersonalityProfile,
  Watchlist,
} from '../domain/models'
import {
  analyticalHistories as mockAnalyticalHistories,
  analystOpinions as mockAnalystOpinions,
  marketState as mockMarketState,
  newsItems as mockNewsItems,
  optionContracts as mockOptionContracts,
  personalities as mockPersonalities,
  priceSnapshots as mockPriceSnapshots,
  stocks as mockStocks,
  watchlists as mockWatchlists,
} from './mockData'
import { LiveMarketDataSource } from './live/LiveMarketDataSource'
import { marketDataConfig } from '../config/marketData'

export type DataSourceMode = 'LIVE' | 'MOCK' | 'FALLBACK'

export interface DataSource {
  getMarketState(): Promise<MarketState>
  getStocks(): Promise<Stock[]>
  getWatchlists(): Promise<Watchlist[]>
  getPriceSnapshots(): Promise<PriceSnapshot[]>
  getNews(): Promise<NewsItem[]>
  getAnalystOpinions(): Promise<AnalystOpinion[]>
  getOptionContracts(): Promise<OptionContract[]>
  getPersonalities(): Promise<StockPersonalityProfile[]>
  getAnalyticalHistories(): Promise<AnalyticalHistory[]>
  /** يُستدعى بعد جلب البيانات؛ يحدد هل الأسعار من live أم mock أم fallback إلى mock */
  getDataMode(): Promise<DataSourceMode>
}

export class MockDataSource implements DataSource {
  async getMarketState(): Promise<MarketState> {
    return mockMarketState
  }

  async getStocks(): Promise<Stock[]> {
    return mockStocks
  }

  async getWatchlists(): Promise<Watchlist[]> {
    return mockWatchlists
  }

  async getPriceSnapshots(): Promise<PriceSnapshot[]> {
    return mockPriceSnapshots
  }

  async getNews(): Promise<NewsItem[]> {
    return mockNewsItems
  }

  async getAnalystOpinions(): Promise<AnalystOpinion[]> {
    return mockAnalystOpinions
  }

  async getOptionContracts(): Promise<OptionContract[]> {
    return mockOptionContracts
  }

  async getPersonalities(): Promise<StockPersonalityProfile[]> {
    return mockPersonalities
  }

  async getAnalyticalHistories(): Promise<AnalyticalHistory[]> {
    return mockAnalyticalHistories
  }

  async getDataMode(): Promise<DataSourceMode> {
    return 'MOCK'
  }
}

export function createDataSource(): DataSource {
  if (marketDataConfig.mode === 'live' || Boolean(marketDataConfig.apiKey)) {
    return new LiveMarketDataSource()
  }
  return new MockDataSource()
}

export const defaultDataSource: DataSource = createDataSource()

