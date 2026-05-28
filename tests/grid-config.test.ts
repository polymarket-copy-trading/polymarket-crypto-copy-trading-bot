import { describe, expect, it } from "vitest";
import {
  buildGridLevels,
  findNearestLevelIndex,
  getLevelAbove,
  getLevelBelow,
  estimateGridProfitPerCycle,
} from "../src/strategies/ai-grid/grid-config.js";

describe("grid config", () => {
  it("builds arithmetic grid levels", () => {
    const levels = buildGridLevels({
      mode: "arithmetic",
      lowerPrice: 100,
      upperPrice: 200,
      levels: 5,
      orderSize: 1,
    });

    expect(levels).toHaveLength(5);
    expect(levels[0]!.price).toBe(100);
    expect(levels[4]!.price).toBe(200);
    expect(levels[2]!.price).toBe(150);
  });

  it("builds geometric grid levels", () => {
    const levels = buildGridLevels({
      mode: "geometric",
      lowerPrice: 100,
      upperPrice: 200,
      levels: 3,
      orderSize: 1,
    });

    expect(levels).toHaveLength(3);
    expect(levels[0]!.price).toBe(100);
    expect(levels[2]!.price).toBe(200);
    expect(levels[1]!.price).toBeGreaterThan(100);
    expect(levels[1]!.price).toBeLessThan(200);
  });

  it("finds nearest level index", () => {
    const levels = buildGridLevels({
      mode: "arithmetic",
      lowerPrice: 100,
      upperPrice: 200,
      levels: 5,
      orderSize: 1,
    });

    expect(findNearestLevelIndex(levels, 148)).toBe(2);
    expect(findNearestLevelIndex(levels, 200)).toBe(4);
  });

  it("returns adjacent levels", () => {
    const levels = buildGridLevels({
      mode: "arithmetic",
      lowerPrice: 100,
      upperPrice: 200,
      levels: 5,
      orderSize: 1,
    });

    expect(getLevelAbove(levels, 2)?.price).toBe(175);
    expect(getLevelBelow(levels, 2)?.price).toBe(125);
    expect(getLevelAbove(levels, 4)).toBeNull();
    expect(getLevelBelow(levels, 0)).toBeNull();
  });

  it("estimates profit per cycle", () => {
    const levels = buildGridLevels({
      mode: "arithmetic",
      lowerPrice: 100,
      upperPrice: 200,
      levels: 5,
      orderSize: 0.1,
    });

    const profit = estimateGridProfitPerCycle(levels, 1, 0.1);
    expect(profit).toBeGreaterThan(0);
  });

  it("requires at least 2 levels", () => {
    expect(() =>
      buildGridLevels({
        mode: "arithmetic",
        lowerPrice: 100,
        upperPrice: 200,
        levels: 1,
        orderSize: 1,
      }),
    ).toThrow("at least 2 levels");
  });
});
