import { describe, expect, it, vi, beforeEach } from "vitest";
import { productRegistry } from "../src/api/phemex/product-info.js";
import type { ProductInfo } from "../src/api/phemex/types.js";

const mockProduct: ProductInfo = {
  symbol: "BTCUSDT",
  type: "PerpetualV2",
  status: "Listed",
  priceScale: 2,
  ratioScale: 8,
  tickSize: "0.1",
  qtyStepSize: "0.001",
  minOrderValueRv: "1",
  maxOrderQtyRq: "1000",
  minOrderQtyRq: "0.001",
};

describe("product registry", () => {
  beforeEach(() => {
    productRegistry.setProducts([mockProduct]);
  });

  it("formats price to tick size", () => {
    expect(productRegistry.formatPrice("BTCUSDT", 65000.123)).toBe("65000.1");
  });

  it("formats quantity to step size", () => {
    expect(productRegistry.formatQuantity("BTCUSDT", 0.0015)).toBe("0.001");
  });

  it("throws for unknown symbol", () => {
    expect(() => productRegistry.formatPrice("UNKNOWN", 100)).toThrow("Unknown symbol");
  });

  it("extracts precision", () => {
    const precision = productRegistry.extractPrecision("BTCUSDT");
    expect(precision.tickSize).toBe("0.1");
    expect(precision.stepSize).toBe("0.001");
  });
});

describe("PhemexClient (mocked)", () => {
  it("parses server time response", async () => {
    const { PhemexClient } = await import("../src/api/phemex/client.js");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          JSON.stringify({
            code: 0,
            msg: "OK",
            data: { serverTime: 1700000000000 },
          }),
      }),
    );

    const client = new PhemexClient({
      apiKey: "test",
      apiSecret: Buffer.from("secret").toString("base64"),
    });

    const time = await client.getServerTime();
    expect(time).toBe(1700000000000);

    vi.unstubAllGlobals();
  });
});
