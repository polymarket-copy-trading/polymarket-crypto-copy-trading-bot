import type { IndicatorSnapshot } from "./indicators.js";
import { clamp, round } from "../utils/decimal.js";

export type MarketBias = "bullish" | "bearish" | "neutral";
export type SignalStrength = "weak" | "moderate" | "strong";

export interface TradingSignal {
  score: number;
  bias: MarketBias;
  strength: SignalStrength;
  confidence: number;
  reasons: string[];
  indicators: IndicatorSnapshot;
}

export interface SignalEngineConfig {
  minConfidence: number;
}

/**
 * Combines technical indicators into a unified trading signal.
 * Score range: -100 (strong bearish) to +100 (strong bullish).
 */
export function analyzeSignal(
  indicators: IndicatorSnapshot,
  config: SignalEngineConfig,
): TradingSignal {
  const reasons: string[] = [];
  let score = 0;

  // RSI contribution (-30 to +30)
  if (indicators.rsi < 30) {
    score += 30 * ((30 - indicators.rsi) / 30);
    reasons.push(`RSI oversold (${indicators.rsi.toFixed(1)})`);
  } else if (indicators.rsi > 70) {
    score -= 30 * ((indicators.rsi - 70) / 30);
    reasons.push(`RSI overbought (${indicators.rsi.toFixed(1)})`);
  } else if (indicators.rsi < 45) {
    score += 10;
    reasons.push(`RSI leaning bullish (${indicators.rsi.toFixed(1)})`);
  } else if (indicators.rsi > 55) {
    score -= 10;
    reasons.push(`RSI leaning bearish (${indicators.rsi.toFixed(1)})`);
  }

  // EMA trend (-25 to +25)
  const emaDiff =
    indicators.emaSlow > 0
      ? (indicators.emaFast - indicators.emaSlow) / indicators.emaSlow
      : 0;
  const emaScore = clamp(emaDiff * 500, -25, 25);
  score += emaScore;
  if (emaScore > 5) {
    reasons.push("EMA fast above slow (uptrend)");
  } else if (emaScore < -5) {
    reasons.push("EMA fast below slow (downtrend)");
  }

  // MACD histogram (-20 to +20)
  const macdNorm =
    indicators.lastClose > 0
      ? indicators.macdHistogram / indicators.lastClose
      : 0;
  const macdScore = clamp(macdNorm * 10_000, -20, 20);
  score += macdScore;
  if (macdScore > 3) {
    reasons.push("MACD histogram positive");
  } else if (macdScore < -3) {
    reasons.push("MACD histogram negative");
  }

  // Bollinger position (-15 to +15)
  const bbRange = indicators.bollingerUpper - indicators.bollingerLower;
  if (bbRange > 0) {
    const position =
      (indicators.lastClose - indicators.bollingerLower) / bbRange;
    if (position < 0.2) {
      score += 15;
      reasons.push("Price near lower Bollinger band");
    } else if (position > 0.8) {
      score -= 15;
      reasons.push("Price near upper Bollinger band");
    }
  }

  score = clamp(round(score), -100, 100);

  const bias: MarketBias =
    score > 15 ? "bullish" : score < -15 ? "bearish" : "neutral";

  const absScore = Math.abs(score);
  const strength: SignalStrength =
    absScore >= 50 ? "strong" : absScore >= 25 ? "moderate" : "weak";

  const confidence = round(
    Math.min(1, absScore / 100 + (reasons.length > 0 ? 0.1 : 0)),
  );

  if (confidence < config.minConfidence) {
    reasons.push("Low confidence — neutral stance recommended");
  }

  return {
    score,
    bias,
    strength,
    confidence,
    reasons,
    indicators,
  };
}

export function shouldTrade(signal: TradingSignal, minConfidence: number): boolean {
  return signal.confidence >= minConfidence && signal.bias !== "neutral";
}
