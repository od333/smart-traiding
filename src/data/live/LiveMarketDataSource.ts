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
} from '../../domain/models'
import type { DataSource, DataSourceMode } from '../dataSource'
import { liveMarketClient } from './LiveMarketClient'
import { toMarketStateFromSnapshots, toNewsItems, toPriceSnapshot } from './adapters'
import { optionsClient } from './options/OptionsClient'
import { toOptionContracts } from './options/optionsAdapters'
import { optionsDataConfig } from '../../config/optionsData'
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
} from '../mockData'
import { marketDataConfig } from '../../config/marketData'
import { CORE_WATCHLIST } from '../../config/watchlist'

export class LiveMarketDataSource implements DataSource {
  private _lastPriceSource: DataSourceMode = 'LIVE'
  private _quotesCache:
    | { at: number; snapshots: PriceSnapshot[] }
    | null = null

  private async getSnapshotsCached(): Promise<PriceSnapshot[]> {
    if (!marketDataConfig.apiKey) {
      throw new Error('Missing API key')
    }
    const now = Date.now()
    // cache قصير لتفادي مضاعفة استدعاءات Finnhub داخل نفس دورة snapshot
    if (this._quotesCache && now - this._quotesCache.at < 25_000) {
      return this._quotesCache.snapshots
    }
    const symbols = CORE_WATCHLIST
    const rawQuotes = await liveMarketClient.fetchLivePrices(symbols)
    const snapshots: PriceSnapshot[] = symbols.map((symbol) =>
      toPriceSnapshot(symbol, rawQuotes[symbol]),
    )
    if (!snapshots.length) {
      throw new Error('Empty live snapshots')
    }
    this._quotesCache = { at: now, snapshots }
    return snapshots
  }

  async getMarketState(): Promise<MarketState> {
    try {
      const snapshots = await this.getSnapshotsCached()
      return toMarketStateFromSnapshots(snapshots)
    } catch (e) {
      console.warn('[LiveMarketDataSource] getMarketState fallback to mock', e)
      return mockMarketState
    }
  }

  async getStocks(): Promise<Stock[]> {
    // في هذه المرحلة نبقي تعريف الأسهم من الموك
    return mockStocks
  }

  async getWatchlists(): Promise<Watchlist[]> {
    return mockWatchlists
  }

  async getPriceSnapshots(): Promise<PriceSnapshot[]> {
    try {
      const snapshots = await this.getSnapshotsCached()
      this._lastPriceSource = 'LIVE'
      return snapshots
    } catch (e) {
      console.warn('[LiveMarketDataSource] getPriceSnapshots fallback to mock', e)
      this._lastPriceSource = 'FALLBACK'
      return mockPriceSnapshots
    }
  }

  async getDataMode(): Promise<DataSourceMode> {
    return marketDataConfig.mode === 'live' ? this._lastPriceSource : 'MOCK'
  }

  async getNews(): Promise<NewsItem[]> {
    try {
      if (!marketDataConfig.apiKey) {
        throw new Error('Missing API key')
      }
      const raw = await liveMarketClient.fetchLiveNews()
      const items = toNewsItems(raw)
      if (!items.length) {
        throw new Error('Empty live news')
      }
      return items
    } catch (e) {
      console.warn('[LiveMarketDataSource] getNews fallback to mock', e)
      return mockNewsItems
    }
  }

  async getAnalystOpinions(): Promise<AnalystOpinion[]> {
    // تبقى على mock في هذه المرحلة
    return mockAnalystOpinions
  }

  async getOptionContracts(): Promise<OptionContract[]> {
    try {
      if (optionsDataConfig.mode !== 'live') {
        return mockOptionContracts
      }
      const symbols = CORE_WATCHLIST
      const rawBySymbol = await optionsClient.fetchLiveOptionsForSymbols(symbols)
      const allContracts: OptionContract[] = []
      for (const symbol of symbols) {
        const raw = rawBySymbol[symbol]
        if (!raw || !raw.contracts?.length) continue
        allContracts.push(...toOptionContracts(symbol, raw))
      }
      if (!allContracts.length) {
        throw new Error('Empty live options contracts')
      }
      return allContracts
    } catch (e) {
      console.warn(
        '[LiveMarketDataSource] getOptionContracts fallback to mock',
        e,
      )
      return mockOptionContracts
    }
  }

  async getPersonalities(): Promise<StockPersonalityProfile[]> {
    return mockPersonalities
  }

  async getAnalyticalHistories(): Promise<AnalyticalHistory[]> {
    return mockAnalyticalHistories
  }
}

