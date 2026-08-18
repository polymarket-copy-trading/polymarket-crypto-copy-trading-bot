export type RejectReasonCode =
  | "MARKET_NOT_CRYPTO"
  | "MARKET_NOT_FOUND"
  | "MARKET_NEAR_RESOLUTION"
  | "INSUFFICIENT_LIQUIDITY"
  | "SPREAD_TOO_WIDE"
  | "SLIPPAGE_EXCEEDED"
  | "TRADE_TOO_SMALL"
  | "TRADE_TOO_LARGE"
  | "PER_MARKET_CAP"
  | "SESSION_CAP"
  | "DUPLICATE_SIGNAL"
  | "SELL_WITHOUT_POSITION"
  | "COPY_SELLS_DISABLED"
  | "RISK_PAUSED"
  | "EXECUTION_FAILURE_CIRCUIT";

export interface ValidatedSignal {
  accepted: boolean;
  reason?: RejectReasonCode;
  detail?: string;
  sizedUsd?: number;
  sizedShares?: number;
}

export interface ValidationContext {
  isCrypto: boolean;
  cryptoReason: string;
  leaderNotionalUsd: number;
  estimatedSlippage: number;
  spread: number;
  hasPosition: boolean;
  copySellsEnabled: boolean;
  perMarketExposure: number;
  sessionExposure: number;
  duplicate: boolean;
  riskPaused: boolean;
}

export function validateSignal(
  ctx: ValidationContext & { side: "BUY" | "SELL" },
  limits: {
    minTradeUsd: number;
    maxTradeUsd: number;
    slippageTolerance: number;
    maxPerMarketNotional: number;
    maxSessionNotional: number;
    maxSpread?: number;
  },
): ValidatedSignal {
  if (ctx.riskPaused) return { accepted: false, reason: "RISK_PAUSED" };
  if (ctx.duplicate) return { accepted: false, reason: "DUPLICATE_SIGNAL" };
  if (!ctx.isCrypto) {
    return {
      accepted: false,
      reason: ctx.cryptoReason === "market_not_found" ? "MARKET_NOT_FOUND" : "MARKET_NOT_CRYPTO",
      detail: ctx.cryptoReason,
    };
  }
  if (ctx.spread > (limits.maxSpread ?? 0.08)) {
    return { accepted: false, reason: "SPREAD_TOO_WIDE", detail: `spread=${ctx.spread.toFixed(4)}` };
  }
  if (ctx.estimatedSlippage > limits.slippageTolerance) {
    return { accepted: false, reason: "SLIPPAGE_EXCEEDED", detail: `slippage=${ctx.estimatedSlippage.toFixed(4)}` };
  }
  if (ctx.leaderNotionalUsd < limits.minTradeUsd) {
    return { accepted: false, reason: "TRADE_TOO_SMALL" };
  }
  if (ctx.leaderNotionalUsd > limits.maxTradeUsd) {
    return { accepted: false, reason: "TRADE_TOO_LARGE" };
  }
  if (ctx.perMarketExposure >= limits.maxPerMarketNotional) {
    return { accepted: false, reason: "PER_MARKET_CAP" };
  }
  if (ctx.sessionExposure >= limits.maxSessionNotional) {
    return { accepted: false, reason: "SESSION_CAP" };
  }
  if (ctx.side === "SELL") {
    if (!ctx.copySellsEnabled) {
      return { accepted: false, reason: "COPY_SELLS_DISABLED" };
    }
    if (!ctx.hasPosition) {
      return { accepted: false, reason: "SELL_WITHOUT_POSITION" };
    }
  }
  return { accepted: true };
}
