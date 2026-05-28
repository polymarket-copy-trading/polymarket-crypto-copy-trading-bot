import type { AppConfig } from "../config/index.js";
import type { TradingSignal } from "./signal-engine.js";
import { volatilityRegime } from "./indicators.js";
import { clamp, round } from "../utils/decimal.js";

export interface OptimizedGridParams {
  lowerPrice: number;
  upperPrice: number;
  levels: number;
  orderSize: number;
  gridMode: "arithmetic" | "geometric";
  adjustments: string[];
}

export interface AdaptiveOptimizerConfig {
  minLevels: number;
  maxLevels: number;
  minOrderSizeMultiplier: number;
  maxOrderSizeMultiplier: number;
}

const DEFAULT_OPTIMIZER_CONFIG: AdaptiveOptimizerConfig = {
  minLevels: 5,
  maxLevels: 50,
  minOrderSizeMultiplier: 0.5,
  maxOrderSizeMultiplier: 1.5,
};

/**
 * AI-driven grid parameter optimizer.
 * Adjusts bounds, levels, and order size based on market signals and volatility.
 */
export function optimizeGridParams(
  config: AppConfig,
  signal: TradingSignal,
  optimizerConfig: AdaptiveOptimizerConfig = DEFAULT_OPTIMIZER_CONFIG,
): OptimizedGridParams {
  const { trading, ai } = config;
  const { indicators } = signal;
  const adjustments: string[] = [];

  let lowerPrice = trading.lowerPrice;
  let upperPrice = trading.upperPrice;
  let levels = trading.levels;
  let orderSize = trading.orderSize;
  let gridMode = trading.gridMode;

  const regime = volatilityRegime(indicators.atr, indicators.lastClose);
  const center = indicators.lastClose;

  // Volatility-based grid width
  const atrMultiplier =
    regime === "high" ? 3.5 : regime === "medium" ? 2.5 : 1.8;
  const halfWidth = indicators.atr * atrMultiplier;

  if (ai.enabled) {
    const aiLower = round(center - halfWidth);
    const aiUpper = round(center + halfWidth);

    if (aiLower < aiUpper) {
      lowerPrice = aiLower;
      upperPrice = aiUpper;
      adjustments.push(
        `Grid bounds adjusted to ATR-based range [${lowerPrice}, ${upperPrice}] (${regime} volatility)`,
      );
    }

    // Trend bias: shift grid center
    if (signal.bias === "bullish") {
      const shift = halfWidth * 0.15;
      lowerPrice = round(lowerPrice + shift * 0.5);
      upperPrice = round(upperPrice + shift);
      adjustments.push("Grid shifted upward for bullish bias");
    } else if (signal.bias === "bearish") {
      const shift = halfWidth * 0.15;
      lowerPrice = round(lowerPrice - shift);
      upperPrice = round(upperPrice - shift * 0.5);
      adjustments.push("Grid shifted downward for bearish bias");
    }

    // Level count based on volatility
    if (regime === "high") {
      levels = clamp(
        Math.floor(trading.levels * 0.7),
        optimizerConfig.minLevels,
        optimizerConfig.maxLevels,
      );
      gridMode = "geometric";
      adjustments.push("Reduced levels + geometric mode for high volatility");
    } else if (regime === "low") {
      levels = clamp(
        Math.ceil(trading.levels * 1.3),
        optimizerConfig.minLevels,
        optimizerConfig.maxLevels,
      );
      gridMode = "arithmetic";
      adjustments.push("Increased levels + arithmetic mode for low volatility");
    }

    // Order size scaling by confidence (never below configured base size)
    const sizeMultiplier = clamp(
      0.5 + signal.confidence,
      optimizerConfig.minOrderSizeMultiplier,
      optimizerConfig.maxOrderSizeMultiplier,
    );
    orderSize = round(Math.max(trading.orderSize, trading.orderSize * sizeMultiplier));
    adjustments.push(
      `Order size set to ${orderSize} (confidence ${(signal.confidence * 100).toFixed(0)}%)`,
    );

    // Bollinger band constraints
    if (indicators.bollingerLower > 0 && indicators.bollingerUpper > 0) {
      lowerPrice = round(
        Math.max(lowerPrice, indicators.bollingerLower * 0.98),
      );
      upperPrice = round(
        Math.min(upperPrice, indicators.bollingerUpper * 1.02),
      );
    }
  }

  if (lowerPrice >= upperPrice) {
    lowerPrice = trading.lowerPrice;
    upperPrice = trading.upperPrice;
    adjustments.push("Fallback to configured bounds (AI range invalid)");
  }

  return {
    lowerPrice,
    upperPrice,
    levels,
    orderSize,
    gridMode,
    adjustments,
  };
}

export function hasSignificantRegimeChange(
  previous: OptimizedGridParams,
  current: OptimizedGridParams,
  thresholdPct = 0.05,
): boolean {
  const prevMid = (previous.lowerPrice + previous.upperPrice) / 2;
  const currMid = (current.lowerPrice + current.upperPrice) / 2;
  const midChange = Math.abs(currMid - prevMid) / prevMid;

  const prevWidth = previous.upperPrice - previous.lowerPrice;
  const currWidth = current.upperPrice - current.lowerPrice;
  const widthChange =
    prevWidth > 0 ? Math.abs(currWidth - prevWidth) / prevWidth : 0;

  return (
    midChange > thresholdPct ||
    widthChange > thresholdPct ||
    previous.levels !== current.levels
  );
}
