import type { PhemexClient } from "../api/phemex/client.js";
import type { Candle } from "../api/phemex/types.js";

export interface MarketSnapshot {
  symbol: string;
  lastPrice: number;
  bid: number;
  ask: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  timestamp: number;
}

export class MarketDataService {
  constructor(private readonly client: PhemexClient) {}

  async getSnapshot(symbol: string): Promise<MarketSnapshot> {
    const ticker = await this.client.getTicker(symbol);
    return {
      symbol: ticker.symbol,
      lastPrice: Number(ticker.lastRp),
      bid: Number(ticker.bidRp),
      ask: Number(ticker.askRp),
      high24h: Number(ticker.highRp),
      low24h: Number(ticker.lowRp),
      volume24h: Number(ticker.volumeRq),
      timestamp: ticker.timestamp,
    };
  }

  async getCandles(
    symbol: string,
    resolution = 3600,
    limit = 100,
  ): Promise<Candle[]> {
    return this.client.getKlines(symbol, resolution, limit);
  }
}
