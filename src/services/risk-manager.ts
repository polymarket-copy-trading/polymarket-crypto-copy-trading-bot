import type { GridLevel } from "../strategies/ai-grid/grid-config.js";
import { multiply } from "../utils/decimal.js";

export interface RiskLimits {
  maxQuoteExposure?: number;
  orderSize: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
}

export interface RiskCheckResult {
  allowed: boolean;
  reason?: string;
}

export type PriceTriggerAction = "stop_loss" | "take_profit" | null;

export class RiskManager {
  private quoteExposure = 0;

  constructor(private readonly limits: RiskLimits) {}

  resetExposure(): void {
    this.quoteExposure = 0;
  }

  recordBuy(price: number, size: number): void {
    this.quoteExposure += multiply(price, size);
  }

  recordSell(price: number, size: number): void {
    this.quoteExposure = Math.max(0, this.quoteExposure - multiply(price, size));
  }

  canPlaceBuyOrder(price: number, size: number): RiskCheckResult {
    const orderValue = multiply(price, size);

    if (this.limits.maxQuoteExposure !== undefined) {
      const projected = this.quoteExposure + orderValue;
      if (projected > this.limits.maxQuoteExposure) {
        return {
          allowed: false,
          reason: `Would exceed max quote exposure (${this.limits.maxQuoteExposure})`,
        };
      }
    }

    if (size > this.limits.orderSize * 2) {
      return {
        allowed: false,
        reason: `Order size ${size} exceeds safe limit`,
      };
    }

    return { allowed: true };
  }

  checkPriceTriggers(lastPrice: number): PriceTriggerAction {
    if (
      this.limits.stopLossPrice !== undefined &&
      lastPrice <= this.limits.stopLossPrice
    ) {
      return "stop_loss";
    }

    if (
      this.limits.takeProfitPrice !== undefined &&
      lastPrice >= this.limits.takeProfitPrice
    ) {
      return "take_profit";
    }

    return null;
  }

  validateGridConfig(levels: GridLevel[]): RiskCheckResult {
    if (levels.length < 2) {
      return { allowed: false, reason: "Grid must have at least 2 levels" };
    }

    for (let i = 1; i < levels.length; i++) {
      if (levels[i]!.price <= levels[i - 1]!.price) {
        return {
          allowed: false,
          reason: `Grid levels must be strictly increasing at index ${i}`,
        };
      }
    }

    return { allowed: true };
  }

  getQuoteExposure(): number {
    return this.quoteExposure;
  }
}
