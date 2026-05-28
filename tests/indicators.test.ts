import { describe, expect, it } from "vitest";
import {
  computeRSI,
  computeEMA,
  computeATR,
  computeBollingerBands,
  computeMACD,
  computeIndicators,
  volatilityRegime,
} from "../src/ai/indicators.js";
import type { Candle } from "../src/api/phemex/types.js";

function makeCandles(closes: number[]): Candle[] {
  return closes.map((close, i) => ({
    timestamp: i * 3600_000,
    interval: 3600,
    lastClose: i > 0 ? closes[i - 1]! : close,
    open: close * 0.999,
    high: close * 1.002,
    low: close * 0.998,
    close,
    volume: 100,
    turnover: close * 100,
  }));
}

describe("AI indicators", () => {
  const trendingUp = makeCandles(
    Array.from({ length: 50 }, (_, i) => 60000 + i * 100),
  );

  it("computes RSI in valid range", () => {
    const closes = trendingUp.map((c) => c.close);
    const rsi = computeRSI(closes, 14);
    expect(rsi).toBeGreaterThanOrEqual(0);
    expect(rsi).toBeLessThanOrEqual(100);
  });

  it("computes EMA series", () => {
    const closes = trendingUp.map((c) => c.close);
    const ema = computeEMA(closes, 12);
    expect(ema).toHaveLength(closes.length);
    expect(ema.at(-1)).toBeGreaterThan(ema[0]!);
  });

  it("computes ATR from candles", () => {
    const atr = computeATR(trendingUp, 14);
    expect(atr).toBeGreaterThan(0);
  });

  it("computes Bollinger Bands", () => {
    const closes = trendingUp.map((c) => c.close);
    const bb = computeBollingerBands(closes, 20);
    expect(bb.upper).toBeGreaterThan(bb.middle);
    expect(bb.middle).toBeGreaterThan(bb.lower);
    expect(bb.width).toBeGreaterThan(0);
  });

  it("computes MACD", () => {
    const closes = trendingUp.map((c) => c.close);
    const macd = computeMACD(closes, 12, 26);
    expect(typeof macd.macd).toBe("number");
    expect(typeof macd.histogram).toBe("number");
  });

  it("computes full indicator snapshot", () => {
    const snapshot = computeIndicators(trendingUp, {
      rsiPeriod: 14,
      emaFast: 12,
      emaSlow: 26,
      atrPeriod: 14,
    });

    expect(snapshot.rsi).toBeGreaterThan(50);
    expect(snapshot.emaFast).toBeGreaterThan(snapshot.emaSlow);
    expect(snapshot.lastClose).toBe(trendingUp.at(-1)!.close);
  });

  it("classifies volatility regime", () => {
    expect(volatilityRegime(100, 60000)).toBe("low");
    expect(volatilityRegime(500, 60000)).toBe("medium");
    expect(volatilityRegime(2000, 60000)).toBe("high");
  });
});
