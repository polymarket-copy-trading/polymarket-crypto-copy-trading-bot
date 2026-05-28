import { describe, expect, it } from "vitest";
import {
  add,
  divide,
  formatPrice,
  formatQuantity,
  multiply,
  round,
  clamp,
} from "../src/utils/decimal.js";

describe("decimal utils", () => {
  it("rounds to precision", () => {
    expect(round(1.234567891, 4)).toBe(1.2346);
  });

  it("adds without drift", () => {
    expect(add(0.1, 0.2)).toBe(0.3);
  });

  it("multiplies correctly", () => {
    expect(multiply(65000, 0.001)).toBe(65);
  });

  it("divides with guard", () => {
    expect(divide(100, 4)).toBe(25);
    expect(() => divide(1, 0)).toThrow("Division by zero");
  });

  it("clamps values", () => {
    expect(clamp(150, 0, 100)).toBe(100);
    expect(clamp(-5, 0, 100)).toBe(0);
  });

  it("formats price to tick size", () => {
    expect(formatPrice(65000.123, "0.01")).toBe("65000.12");
    expect(formatPrice(65000.5, "1")).toBe("65001");
  });

  it("formats quantity to step size", () => {
    expect(formatQuantity(0.00123, "0.001")).toBe("0.001");
    expect(formatQuantity(1.5, "0.1")).toBe("1.5");
  });
});
