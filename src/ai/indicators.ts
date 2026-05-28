import type { Candle } from "../api/phemex/types.js";
import { divide, round } from "../utils/decimal.js";

export interface IndicatorConfig {
  rsiPeriod: number;
  emaFast: number;
  emaSlow: number;
  atrPeriod: number;
}

export interface IndicatorSnapshot {
  rsi: number;
  emaFast: number;
  emaSlow: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  atr: number;
  bollingerUpper: number;
  bollingerMiddle: number;
  bollingerLower: number;
  bollingerWidth: number;
  lastClose: number;
}

export function computeEMA(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  if (period <= 0) throw new Error("EMA period must be positive");

  const k = 2 / (period + 1);
  const result: number[] = [];
  let ema = values[0]!;

  for (let i = 0; i < values.length; i++) {
    if (i === 0) {
      ema = values[0]!;
    } else {
      ema = values[i]! * k + ema * (1 - k);
    }
    result.push(round(ema));
  }

  return result;
}

export function computeRSI(closes: number[], period: number): number {
  if (closes.length < period + 1) {
    return 50;
  }

  let gains = 0;
  let losses = 0;

  for (let i = closes.length - period; i < closes.length; i++) {
    const change = closes[i]! - closes[i - 1]!;
    if (change >= 0) {
      gains += change;
    } else {
      losses -= change;
    }
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return round(100 - 100 / (1 + rs));
}

export function computeATR(candles: Candle[], period: number): number {
  if (candles.length < period + 1) {
    return 0;
  }

  const trueRanges: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const current = candles[i]!;
    const prev = candles[i - 1]!;
    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - prev.close),
      Math.abs(current.low - prev.close),
    );
    trueRanges.push(tr);
  }

  const recent = trueRanges.slice(-period);
  return round(recent.reduce((sum, v) => sum + v, 0) / recent.length);
}

export function computeBollingerBands(
  closes: number[],
  period = 20,
  stdDevMultiplier = 2,
): { upper: number; middle: number; lower: number; width: number } {
  if (closes.length < period) {
    const last = closes.at(-1) ?? 0;
    return { upper: last, middle: last, lower: last, width: 0 };
  }

  const slice = closes.slice(-period);
  const middle = round(slice.reduce((s, v) => s + v, 0) / period);
  const variance =
    slice.reduce((s, v) => s + (v - middle) ** 2, 0) / period;
  const stdDev = Math.sqrt(variance);
  const upper = round(middle + stdDevMultiplier * stdDev);
  const lower = round(middle - stdDevMultiplier * stdDev);
  const width = middle > 0 ? round((upper - lower) / middle) : 0;

  return { upper, middle, lower, width };
}

export function computeMACD(
  closes: number[],
  fastPeriod: number,
  slowPeriod: number,
  signalPeriod = 9,
): { macd: number; signal: number; histogram: number } {
  if (closes.length < slowPeriod + signalPeriod) {
    return { macd: 0, signal: 0, histogram: 0 };
  }

  const emaFastSeries = computeEMA(closes, fastPeriod);
  const emaSlowSeries = computeEMA(closes, slowPeriod);

  const macdSeries: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    macdSeries.push(round(emaFastSeries[i]! - emaSlowSeries[i]!));
  }

  const signalSeries = computeEMA(macdSeries, signalPeriod);
  const macd = macdSeries.at(-1) ?? 0;
  const signal = signalSeries.at(-1) ?? 0;

  return {
    macd,
    signal,
    histogram: round(macd - signal),
  };
}

export function computeIndicators(
  candles: Candle[],
  config: IndicatorConfig,
): IndicatorSnapshot {
  const closes = candles.map((c) => c.close);
  const lastClose = closes.at(-1) ?? 0;

  const emaFastSeries = computeEMA(closes, config.emaFast);
  const emaSlowSeries = computeEMA(closes, config.emaSlow);
  const rsi = computeRSI(closes, config.rsiPeriod);
  const atr = computeATR(candles, config.atrPeriod);
  const bollinger = computeBollingerBands(closes);
  const macd = computeMACD(closes, config.emaFast, config.emaSlow);

  return {
    rsi,
    emaFast: emaFastSeries.at(-1) ?? lastClose,
    emaSlow: emaSlowSeries.at(-1) ?? lastClose,
    macd: macd.macd,
    macdSignal: macd.signal,
    macdHistogram: macd.histogram,
    atr,
    bollingerUpper: bollinger.upper,
    bollingerMiddle: bollinger.middle,
    bollingerLower: bollinger.lower,
    bollingerWidth: bollinger.width,
    lastClose,
  };
}

export function volatilityRegime(atr: number, price: number): "low" | "medium" | "high" {
  if (price <= 0) return "medium";
  const ratio = divide(atr, price);
  if (ratio < 0.005) return "low";
  if (ratio < 0.02) return "medium";
  return "high";
}
