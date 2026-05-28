export {
  computeIndicators,
  computeRSI,
  computeEMA,
  computeATR,
  computeBollingerBands,
  computeMACD,
  volatilityRegime,
} from "./indicators.js";
export type { IndicatorConfig, IndicatorSnapshot } from "./indicators.js";

export { analyzeSignal, shouldTrade } from "./signal-engine.js";
export type {
  TradingSignal,
  MarketBias,
  SignalStrength,
  SignalEngineConfig,
} from "./signal-engine.js";

export {
  optimizeGridParams,
  hasSignificantRegimeChange,
} from "./adaptive-optimizer.js";
export type { OptimizedGridParams, AdaptiveOptimizerConfig } from "./adaptive-optimizer.js";
