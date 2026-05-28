/**
 * Fixed-precision decimal helpers for price/size calculations.
 * Avoids floating-point drift in grid level computation.
 */

const DEFAULT_PRECISION = 12;

export function round(value: number, precision = DEFAULT_PRECISION): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

export function add(a: number, b: number, precision = DEFAULT_PRECISION): number {
  return round(a + b, precision);
}

export function subtract(a: number, b: number, precision = DEFAULT_PRECISION): number {
  return round(a - b, precision);
}

export function multiply(a: number, b: number, precision = DEFAULT_PRECISION): number {
  return round(a * b, precision);
}

export function divide(a: number, b: number, precision = DEFAULT_PRECISION): number {
  if (b === 0) {
    throw new Error("Division by zero");
  }
  return round(a / b, precision);
}

export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

export function countDecimals(value: string | number): number {
  const str = String(value);
  const dot = str.indexOf(".");
  return dot === -1 ? 0 : str.length - dot - 1;
}

export function formatPrice(price: number, tickSize?: string | number): string {
  if (tickSize !== undefined) {
    const tick = Number(tickSize);
    if (tick > 0) {
      const decimals = countDecimals(String(tickSize));
      const stepped = Math.round(price / tick) * tick;
      return stepped.toFixed(decimals);
    }
  }
  return price.toString();
}

export function formatQuantity(quantity: number, stepSize?: string | number): string {
  if (stepSize !== undefined) {
    const step = Number(stepSize);
    if (step > 0) {
      const decimals = countDecimals(String(stepSize));
      const stepped = Math.floor(quantity / step) * step;
      return stepped.toFixed(decimals);
    }
  }
  return quantity.toString();
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
