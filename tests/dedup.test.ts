import { describe, expect, it } from "vitest";
import { SignalDeduper, stableSignalId } from "../src/detectors/dedup.js";

describe("signal deduplication", () => {
  it("generates stable ids from trade id", () => {
    expect(stableSignalId({ tradeId: "abc123" })).toBe("trade:abc123");
  });

  it("detects duplicate composite ids", () => {
    const deduper = new SignalDeduper();
    const id = stableSignalId({
      leader: "0xabc",
      conditionId: "0xcond",
      side: "BUY",
      size: 10,
      price: 0.6,
      timestamp: 123456,
    });
    expect(deduper.isDuplicate(id)).toBe(false);
    expect(deduper.isDuplicate(id)).toBe(true);
  });
});
