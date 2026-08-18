import { describe, expect, it } from "vitest";
import { scoreCryptoMarket } from "../src/filters/crypto/index.js";

describe("crypto market filter", () => {
  it("accepts BTC price markets", () => {
    const result = scoreCryptoMarket({
      question: "Will Bitcoin reach $150k by December 2026?",
      slug: "btc-150k-dec-2026",
      category: "Crypto",
      active: true,
      closed: false,
    });
    expect(result.isCrypto).toBe(true);
  });

  it("rejects NFL markets without crypto context", () => {
    const result = scoreCryptoMarket({
      question: "Will the Chiefs win the NFL Super Bowl?",
      slug: "chiefs-super-bowl",
      category: "Sports",
      active: true,
      closed: false,
    });
    expect(result.isCrypto).toBe(false);
    expect(result.reason).toBe("excluded_non_crypto_category");
  });

  it("rejects closed markets", () => {
    const result = scoreCryptoMarket({
      question: "ETH above 5k?",
      closed: true,
    });
    expect(result.isCrypto).toBe(false);
    expect(result.reason).toBe("market_closed_or_resolved");
  });
});
