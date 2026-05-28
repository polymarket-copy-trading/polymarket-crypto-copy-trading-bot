import type { ProductInfo } from "./types.js";

export class ProductRegistry {
  private readonly products = new Map<string, ProductInfo>();

  setProducts(products: ProductInfo[]): void {
    this.products.clear();
    for (const product of products) {
      this.products.set(product.symbol, product);
    }
  }

  getProduct(symbol: string): ProductInfo | undefined {
    return this.products.get(symbol);
  }

  requireProduct(symbol: string): ProductInfo {
    const product = this.products.get(symbol);
    if (!product) {
      throw new Error(`Unknown symbol: ${symbol}. Load products first.`);
    }
    return product;
  }

  formatPrice(symbol: string, price: number): string {
    const product = this.requireProduct(symbol);
    const tick = Number(product.tickSize);
    if (tick > 0) {
      const stepped = Math.round(price / tick) * tick;
      const decimals = countDecimals(product.tickSize);
      return stepped.toFixed(decimals);
    }
    return price.toFixed(product.priceScale);
  }

  formatQuantity(symbol: string, quantity: number): string {
    const product = this.requireProduct(symbol);
    const step = Number(product.qtyStepSize);
    if (step > 0) {
      const stepped = Math.floor(quantity / step) * step;
      const decimals = countDecimals(product.qtyStepSize);
      return stepped.toFixed(decimals);
    }
    return quantity.toString();
  }

  extractPrecision(symbol: string): {
    tickSize: string;
    stepSize: string;
    minQty: string;
    priceScale: number;
  } {
    const product = this.requireProduct(symbol);
    return {
      tickSize: product.tickSize,
      stepSize: product.qtyStepSize,
      minQty: product.minOrderQtyRq,
      priceScale: product.priceScale,
    };
  }
}

function countDecimals(value: string): number {
  const dot = value.indexOf(".");
  return dot === -1 ? 0 : value.length - dot - 1;
}

export const productRegistry = new ProductRegistry();
