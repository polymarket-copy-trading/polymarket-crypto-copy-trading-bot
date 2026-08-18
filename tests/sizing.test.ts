import { describe, expect, it } from "vitest";
import { sizeMirrorTrade, clampUsd } from "../src/engine/size.js";

describe("sizing engine", () => {
  it("scales proportional to leader notional", () => {
    const result = sizeMirrorTrade(
      {
        SIZING_MODE: "proportional",
        POSITION_MULTIPLIER: 0.5,
        MIN_TRADE_USD: 5,
        MAX_TRADE_USD: 100,
      },
      { leaderNotionalUsd: 200, price: 0.55, availableBalanceUsd: 1000 },
    );
    expect(result.usd).toBe(100);
    expect(result.shares).toBeCloseTo(100 / 0.55, 4);
  });

  it("respects minimum trade size", () => {
    const result = sizeMirrorTrade(
      {
        SIZING_MODE: "proportional",
        POSITION_MULTIPLIER: 0.01,
        MIN_TRADE_USD: 10,
        MAX_TRADE_USD: 100,
      },
      { leaderNotionalUsd: 50, price: 0.4, availableBalanceUsd: 500 },
    );
    expect(result.usd).toBe(10);
  });

  it("clamps to available balance", () => {
    const result = sizeMirrorTrade(
      {
        SIZING_MODE: "fixed",
        POSITION_MULTIPLIER: 1,
        MIN_TRADE_USD: 5,
        MAX_TRADE_USD: 100,
      },
      { leaderNotionalUsd: 50, price: 0.5, availableBalanceUsd: 20 },
    );
    expect(result.usd).toBe(20);
  });

  it("clampUsd helper", () => {
    expect(clampUsd(150, 5, 100, 80)).toBe(80);
  });
});
