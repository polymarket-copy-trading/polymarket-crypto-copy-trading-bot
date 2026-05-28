import { describe, expect, it } from "vitest";
import { analyzeSignal } from "../src/ai/signal-engine.js";
import {
  optimizeGridParams,
  hasSignificantRegimeChange,
} from "../src/ai/adaptive-optimizer.js";
import type { IndicatorSnapshot } from "../src/ai/indicators.js";
import type { AppConfig } from "../src/config/index.js";

const baseConfig: AppConfig = {
  phemex: {
    apiKey: "k",
    apiSecret: "s",
    baseUrl: "https://api.phemex.com",
  },
  trading: {
    symbol: "BTCUSDT",
    gridMode: "arithmetic",
    lowerPrice: 60000,
    upperPrice: 70000,
    levels: 10,
    orderSize: 0.001,
    posSide: "Merged",
    pollIntervalMs: 5000,
    dryRun: true,
  },
  ai: {
    enabled: true,
    reoptimizeIntervalMs: 300_000,
    rsiPeriod: 14,
    emaFast: 12,
    emaSlow: 26,
    atrPeriod: 14,
    minConfidence: 0.3,
  },
  logLevel: "info",
};

function makeIndicators(overrides: Partial<IndicatorSnapshot> = {}): IndicatorSnapshot {
  return {
    rsi: 50,
    emaFast: 65000,
    emaSlow: 64000,
    macd: 100,
    macdSignal: 50,
    macdHistogram: 50,
    atr: 500,
    bollingerUpper: 66000,
    bollingerMiddle: 65000,
    bollingerLower: 64000,
    bollingerWidth: 0.03,
    lastClose: 65000,
    ...overrides,
  };
}

describe("signal engine", () => {
  it("detects bullish signal on oversold RSI + uptrend", () => {
    const signal = analyzeSignal(
      makeIndicators({ rsi: 25, emaFast: 66000, emaSlow: 64000, macdHistogram: 200 }),
      { minConfidence: 0.3 },
    );
    expect(signal.bias).toBe("bullish");
    expect(signal.score).toBeGreaterThan(0);
    expect(signal.reasons.length).toBeGreaterThan(0);
  });

  it("detects bearish signal on overbought RSI", () => {
    const signal = analyzeSignal(
      makeIndicators({ rsi: 80, emaFast: 64000, emaSlow: 66000, macdHistogram: -200 }),
      { minConfidence: 0.3 },
    );
    expect(signal.bias).toBe("bearish");
    expect(signal.score).toBeLessThan(0);
  });

  it("returns neutral for balanced indicators", () => {
    const signal = analyzeSignal(
      makeIndicators({
        rsi: 50,
        emaFast: 65000,
        emaSlow: 65000,
        macdHistogram: 0,
        lastClose: 65000,
        bollingerUpper: 66000,
        bollingerMiddle: 65000,
        bollingerLower: 64000,
      }),
      { minConfidence: 0.3 },
    );
    expect(signal.bias).toBe("neutral");
  });
});

describe("adaptive optimizer", () => {
  it("optimizes grid params with AI enabled", () => {
    const signal = analyzeSignal(makeIndicators(), { minConfidence: 0.3 });
    const optimized = optimizeGridParams(baseConfig, signal);

    expect(optimized.lowerPrice).toBeLessThan(optimized.upperPrice);
    expect(optimized.levels).toBeGreaterThanOrEqual(5);
    expect(optimized.orderSize).toBeGreaterThanOrEqual(baseConfig.trading.orderSize);
    expect(optimized.adjustments.length).toBeGreaterThan(0);
  });

  it("detects significant regime change", () => {
    const prev = {
      lowerPrice: 60000,
      upperPrice: 70000,
      levels: 10,
      orderSize: 0.001,
      gridMode: "arithmetic" as const,
      adjustments: [],
    };
    const curr = {
      lowerPrice: 55000,
      upperPrice: 65000,
      levels: 10,
      orderSize: 0.001,
      gridMode: "arithmetic" as const,
      adjustments: [],
    };
    expect(hasSignificantRegimeChange(prev, curr)).toBe(true);
  });

  it("ignores minor regime changes", () => {
    const params = {
      lowerPrice: 60000,
      upperPrice: 70000,
      levels: 10,
      orderSize: 0.001,
      gridMode: "arithmetic" as const,
      adjustments: [],
    };
    expect(hasSignificantRegimeChange(params, params)).toBe(false);
  });
});
