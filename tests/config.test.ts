import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config/index.js";

describe("config", () => {
  it("loads valid env with defaults", () => {
    const config = loadConfig({
      PRIVATE_KEY: "0x" + "ab".repeat(32),
      RPC_URL: "https://polygon-rpc.com",
      LEADER_WALLETS: "0x" + "cd".repeat(20),
    });
    expect(config.DRY_RUN).toBe(true);
    expect(config.CRYPTO_ONLY).toBe(true);
    expect(config.LEADER_WALLETS).toHaveLength(1);
    expect(config.CLOB_HOST).toBe("https://clob.polymarket.com");
  });

  it("rejects invalid private key", () => {
    expect(() =>
      loadConfig({
        PRIVATE_KEY: "not-a-key",
        RPC_URL: "https://polygon-rpc.com",
        LEADER_WALLETS: "0x" + "cd".repeat(20),
      }),
    ).toThrow(/Invalid configuration/);
  });
});
