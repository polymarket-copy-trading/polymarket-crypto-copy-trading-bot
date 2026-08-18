import { describe, expect, it } from "vitest";
import { validateSignal } from "../src/engine/validate.js";

describe("signal validation", () => {
  const limits = {
    minTradeUsd: 5,
    maxTradeUsd: 100,
    slippageTolerance: 0.02,
    maxPerMarketNotional: 150,
    maxSessionNotional: 500,
  };

  it("rejects non-crypto markets", () => {
    const result = validateSignal(
      {
        side: "BUY",
        isCrypto: false,
        cryptoReason: "not_crypto_market",
        leaderNotionalUsd: 50,
        estimatedSlippage: 0.01,
        spread: 0.02,
        hasPosition: false,
        copySellsEnabled: false,
        perMarketExposure: 0,
        sessionExposure: 0,
        duplicate: false,
        riskPaused: false,
      },
      limits,
    );
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe("MARKET_NOT_CRYPTO");
  });
});
