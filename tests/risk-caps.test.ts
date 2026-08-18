import { describe, expect, it } from "vitest";
import { RiskManager } from "../src/risk/index.js";
import type { AppConfig } from "../src/config/index.js";

const baseConfig = {
  MAX_DAILY_LOSS_USD: 50,
  AUTO_PAUSE_ON_DRAWDOWN: true,
  MAX_CONCURRENT_MARKETS: 3,
  MAX_SESSION_NOTIONAL: 500,
  MAX_PER_MARKET_NOTIONAL: 150,
} as AppConfig;

describe("risk manager", () => {
  it("pauses after daily loss threshold", () => {
    const risk = new RiskManager(baseConfig);
    risk.updateDailyPnl(-55);
    expect(risk.isPaused()).toBe(true);
  });

  it("tracks per-market exposure", () => {
    const risk = new RiskManager(baseConfig);
    risk.recordAcceptedTrade("0xmarket1", 25);
    expect(risk.getMarketExposure("0xmarket1")).toBe(25);
    expect(risk.getSessionNotional()).toBe(25);
  });

  it("trips circuit breaker on repeated failures", () => {
    const risk = new RiskManager(baseConfig);
    for (let i = 0; i < 5; i++) risk.recordExecutionFailure();
    expect(risk.isPaused()).toBe(true);
  });
});
