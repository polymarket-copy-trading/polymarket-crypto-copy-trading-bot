import { describe, expect, it, vi, beforeEach } from "vitest";
import { CopyTradingPipeline } from "../src/engine/pipeline.js";
import type { AppConfig } from "../src/config/index.js";
import pino from "pino";

vi.mock("../src/clients/data.js", () => ({
  DataApiClient: vi.fn().mockImplementation(() => ({
    getTrades: vi.fn().mockResolvedValue([
      {
        id: "t1",
        side: "BUY",
        conditionId: "0xbtcmarket",
        size: 100,
        price: 0.55,
        timestamp: Date.now(),
      },
    ]),
  })),
}));

vi.mock("../src/clients/gamma.js", () => ({
  GammaClient: vi.fn().mockImplementation(() => ({
    getMarketByConditionId: vi.fn().mockResolvedValue({
      question: "Will Bitcoin hit 150k in 2026?",
      category: "Crypto",
      active: true,
    }),
  })),
}));

vi.mock("../src/clients/polygon.js", () => ({
  PolygonClient: vi.fn().mockImplementation(() => ({
    measureLatencyMs: vi.fn().mockResolvedValue(42),
  })),
}));

vi.mock("../src/clients/clob.js", () => ({
  ClobService: vi.fn().mockImplementation(() => ({
    healthCheck: vi.fn().mockResolvedValue({ balanceUsd: 500, ok: true }),
    buildOrderMetadata: vi.fn().mockReturnValue("{}"),
  })),
}));

const config = {
  PRIVATE_KEY: "0x" + "11".repeat(32),
  RPC_URL: "https://polygon-rpc.com",
  LEADER_WALLETS: ["0x" + "aa".repeat(20)],
  POSITION_MULTIPLIER: 0.25,
  MAX_TRADE_USD: 100,
  MIN_TRADE_USD: 5,
  SIZING_MODE: "proportional",
  SLIPPAGE_TOLERANCE: 0.02,
  ORDER_TYPE: "LIMIT",
  COPY_SELLS: false,
  MAX_SESSION_NOTIONAL: 500,
  MAX_PER_MARKET_NOTIONAL: 150,
  MAX_DAILY_LOSS_USD: 75,
  AUTO_PAUSE_ON_DRAWDOWN: true,
  MAX_CONCURRENT_MARKETS: 8,
  USE_WEBSOCKET: false,
  POLL_INTERVAL_MS: 1000,
  BACKFILL_HISTORICAL: true,
  CRYPTO_ONLY: true,
  RESOLUTION_CUTOFF_HOURS: 6,
  CLOB_HOST: "https://clob.polymarket.com",
  GAMMA_HOST: "https://gamma-api.polymarket.com",
  DATA_HOST: "https://data-api.polymarket.com",
  RELAYER_HOST: "https://relayer-v2.polymarket.com",
  WS_MARKET: "wss://ws-subscriptions-clob.polymarket.com/ws/market",
  WS_USER: "wss://ws-subscriptions-clob.polymarket.com/ws/user",
  WS_LIVE_DATA: "wss://ws-live-data.polymarket.com",
  DATABASE_PATH: "./data/test-integration.db",
  LOG_LEVEL: "silent",
  LOG_PRETTY: false,
  METRICS_ENABLED: false,
  METRICS_PORT: 9090,
  DRY_RUN: true,
} as AppConfig;

describe("integration pipeline", () => {
  it("processes mocked leader trade through validate and dry-run execute", async () => {
    const pipeline = new CopyTradingPipeline(config, pino({ level: "silent" }));
    await pipeline.processSignal({
      id: "trade:integration",
      leader: config.LEADER_WALLETS[0],
      side: "BUY",
      conditionId: "0xbtcmarket",
      size: 100,
      price: 0.55,
      notionalUsd: 55,
      timestampMs: Date.now(),
      source: "data-api",
      raw: {},
    });

    const recent = pipeline.getStore().recentSignals(1)[0];
    expect(recent.status).toBe("dry_run");
    pipeline.stop();
  });
});
