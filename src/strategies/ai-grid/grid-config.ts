import type { GridMode } from "../../config/index.js";
import { add, divide, multiply, round } from "../../utils/decimal.js";

export interface GridStrategyConfig {
  mode: GridMode;
  lowerPrice: number;
  upperPrice: number;
  levels: number;
  orderSize: number;
}

export interface GridLevel {
  index: number;
  price: number;
}

export function buildGridLevels(config: GridStrategyConfig): GridLevel[] {
  const { mode, lowerPrice, upperPrice, levels } = config;

  if (levels < 2) {
    throw new Error("Grid requires at least 2 levels");
  }

  const result: GridLevel[] = [];

  if (mode === "arithmetic") {
    const step = divide(upperPrice - lowerPrice, levels - 1);
    for (let i = 0; i < levels; i++) {
      result.push({
        index: i,
        price: round(add(lowerPrice, multiply(step, i))),
      });
    }
  } else {
    const ratio = Math.pow(upperPrice / lowerPrice, 1 / (levels - 1));
    for (let i = 0; i < levels; i++) {
      result.push({
        index: i,
        price: round(lowerPrice * Math.pow(ratio, i)),
      });
    }
  }

  return result;
}

export function findNearestLevelIndex(
  levels: GridLevel[],
  price: number,
): number {
  let nearest = 0;
  let minDiff = Math.abs(levels[0]!.price - price);

  for (let i = 1; i < levels.length; i++) {
    const diff = Math.abs(levels[i]!.price - price);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = i;
    }
  }

  return nearest;
}

export function getLevelAbove(
  levels: GridLevel[],
  index: number,
): GridLevel | null {
  return index < levels.length - 1 ? levels[index + 1]! : null;
}

export function getLevelBelow(
  levels: GridLevel[],
  index: number,
): GridLevel | null {
  return index > 0 ? levels[index - 1]! : null;
}

export function estimateGridProfitPerCycle(
  levels: GridLevel[],
  levelIndex: number,
  orderSize: number,
): number {
  const above = getLevelAbove(levels, levelIndex);
  if (!above) return 0;
  const buyPrice = levels[levelIndex]!.price;
  return multiply(above.price - buyPrice, orderSize);
}

export function formatGridTable(levels: GridLevel[]): string {
  const lines = levels.map(
    (l) => `  [${String(l.index).padStart(3)}]  ${l.price.toFixed(2)}`,
  );
  return lines.join("\n");
}
