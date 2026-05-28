import { describe, expect, it } from "vitest";
import { RiskManager } from "../src/services/risk-manager.js";
import { buildGridLevels } from "../src/strategies/ai-grid/grid-config.js";

describe("risk manager", () => {
  const limits = {
    maxQuoteExposure: 1000,
    orderSize: 0.01,
    stopLossPrice: 58000,
    takeProfitPrice: 72000,
  };

  it("allows orders within exposure limit", () => {
    const rm = new RiskManager(limits);
    const result = rm.canPlaceBuyOrder(65000, 0.01);
    expect(result.allowed).toBe(true);
  });

  it("blocks orders exceeding exposure", () => {
    const rm = new RiskManager(limits);
    rm.recordBuy(65000, 0.01);
    const result = rm.canPlaceBuyOrder(65000, 0.02);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("exposure");
  });

  it("triggers stop loss", () => {
    const rm = new RiskManager(limits);
    expect(rm.checkPriceTriggers(57000)).toBe("stop_loss");
  });

  it("triggers take profit", () => {
    const rm = new RiskManager(limits);
    expect(rm.checkPriceTriggers(73000)).toBe("take_profit");
  });

  it("validates grid levels", () => {
    const rm = new RiskManager(limits);
    const levels = buildGridLevels({
      mode: "arithmetic",
      lowerPrice: 60000,
      upperPrice: 70000,
      levels: 5,
      orderSize: 0.01,
    });
    expect(rm.validateGridConfig(levels).allowed).toBe(true);
  });

  it("rejects invalid grid", () => {
    const rm = new RiskManager(limits);
    expect(rm.validateGridConfig([{ index: 0, price: 100 }]).allowed).toBe(false);
  });
});
