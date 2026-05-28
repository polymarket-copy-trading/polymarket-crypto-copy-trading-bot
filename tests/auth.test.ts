import { describe, expect, it } from "vitest";
import {
  decodeApiSecret,
  signPhemexRequest,
  toQueryString,
} from "../src/api/phemex/auth.js";

describe("Phemex auth", () => {
  it("decodes base64 URL-encoded API secrets", () => {
    const secret = Buffer.from("test-secret-key").toString("base64url");
    const decoded = decodeApiSecret(secret);
    expect(decoded.toString()).toBe("test-secret-key");
  });

  it("signs GET requests per Phemex formula: path + query + expiry + body", () => {
    const apiSecret = Buffer.from("my-secret").toString("base64");
    const path = "/spot/wallets";
    const query = "currency=BTC";
    const expiry = 1587552406;

    const signature = signPhemexRequest(apiSecret, path, query, expiry, "");
    expect(signature).toMatch(/^[0-9a-f]{64}$/);
  });

  it("signs POST requests including body", () => {
    const apiSecret = Buffer.from("secret").toString("base64");
    const path = "/g-orders/create";
    const query = "symbol=BTCUSDT&side=Buy";
    const expiry = 1587552407;
    const body = '{"orderQtyRq":"0.01"}';

    const sig1 = signPhemexRequest(apiSecret, path, query, expiry, body);
    const sig2 = signPhemexRequest(apiSecret, path, query, expiry, "");
    expect(sig1).not.toBe(sig2);
  });

  it("builds query strings", () => {
    const qs = toQueryString({
      symbol: "BTCUSDT",
      side: "Buy",
      limit: 100,
    });
    expect(qs).toBe("symbol=BTCUSDT&side=Buy&limit=100");
  });

  it("produces deterministic signatures", () => {
    const secret = Buffer.from("abc").toString("base64");
    const a = signPhemexRequest(secret, "/public/time", "", 12345);
    const b = signPhemexRequest(secret, "/public/time", "", 12345);
    expect(a).toBe(b);
  });
});
