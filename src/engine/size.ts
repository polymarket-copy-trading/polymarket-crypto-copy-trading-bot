import type { AppConfig } from "../config/index.js";

export interface SizeResult {
  usd: number;
  shares: number;
  mode: AppConfig["SIZING_MODE"];
}

export function sizeMirrorTrade(
  config: Pick<AppConfig, "SIZING_MODE" | "POSITION_MULTIPLIER" | "MIN_TRADE_USD" | "MAX_TRADE_USD">,
  input: {
    leaderNotionalUsd: number;
    price: number;
    availableBalanceUsd: number;
  },
): SizeResult {
  let usd: number;

  switch (config.SIZING_MODE) {
    case "fixed":
      usd = config.MAX_TRADE_USD;
      break;
    case "balance_percent":
      usd = input.availableBalanceUsd * config.POSITION_MULTIPLIER;
      break;
    case "proportional":
    default:
      usd = input.leaderNotionalUsd * config.POSITION_MULTIPLIER;
      break;
  }

  usd = Math.max(config.MIN_TRADE_USD, Math.min(config.MAX_TRADE_USD, usd));
  usd = Math.min(usd, input.availableBalanceUsd);
  const shares = input.price > 0 ? usd / input.price : 0;

  return { usd, shares, mode: config.SIZING_MODE };
}

export function clampUsd(value: number, min: number, max: number, balance: number): number {
  return Math.max(min, Math.min(max, balance, value));
}
