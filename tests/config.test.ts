import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { loadConfig, normalizeSymbol } from "../src/config/index.js";

describe("config", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env.PHEMEX_API_KEY = "test-key";
    process.env.PHEMEX_API_SECRET = "dGVzdC1zZWNyZXQ=";
    process.env.GRID_LOWER_PRICE = "60000";
    process.env.GRID_UPPER_PRICE = "70000";
    process.env.GRID_LEVELS = "10";
    process.env.GRID_ORDER_SIZE = "0.001";
  });

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it("normalizes symbols", () => {
    expect(normalizeSymbol("btc-usdt")).toBe("BTCUSDT");
    expect(normalizeSymbol("ETH_USDT")).toBe("ETHUSDT");
  });

  it("loads valid configuration", () => {
    const config = loadConfig();
    expect(config.phemex.apiKey).toBe("test-key");
    expect(config.trading.symbol).toBe("BTCUSDT");
    expect(config.trading.levels).toBe(10);
    expect(config.ai.enabled).toBe(true);
  });

  it("rejects invalid price range", () => {
    process.env.GRID_LOWER_PRICE = "80000";
    process.env.GRID_UPPER_PRICE = "70000";
    expect(() => loadConfig()).toThrow("GRID_LOWER_PRICE must be less");
  });

  it("rejects invalid EMA periods", () => {
    process.env.AI_EMA_FAST = "26";
    process.env.AI_EMA_SLOW = "12";
    expect(() => loadConfig()).toThrow("AI_EMA_FAST must be less");
  });

  it("supports dry-run override", () => {
    const config = loadConfig({ dryRun: true });
    expect(config.trading.dryRun).toBe(true);
  });

  it("reports missing API key", () => {
    delete process.env.PHEMEX_API_KEY;
    expect(() => loadConfig()).toThrow("Invalid configuration");
  });
});
