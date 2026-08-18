import { describe, expect, it, vi } from "vitest";
import { ExecutionEngine } from "../src/engine/execute.js";
import type { AppConfig } from "../src/config/index.js";
import type { ClobService } from "../src/clients/clob.js";
import type { LeaderSignal } from "../src/detectors/data-api-detector.js";
import pino from "pino";

const signal: LeaderSignal = {
  id: "trade:test",
  leader: "0xleader",
  side: "BUY",
  conditionId: "0xcondition",
  tokenId: "12345",
  size: 100,
  price: 0.62,
  notionalUsd: 62,
  timestampMs: Date.now(),
  source: "data-api",
  raw: {},
};

describe("V2 order payload", () => {
  it("includes timestamp ms, metadata, and builder fields", async () => {
    const config = {
      DRY_RUN: true,
      ORDER_TYPE: "LIMIT",
      POLY_BUILDER_CODE: "MYBUILDER",
    } as AppConfig;

    const clob = {
      buildOrderMetadata: (id: string) =>
        JSON.stringify({ source: "poly-copy-bot", signalId: id, builder: "MYBUILDER", version: 2 }),
    } as unknown as ClobService;

    const engine = new ExecutionEngine(config, clob, pino({ level: "silent" }));
    const fields = engine.buildV2OrderFields(signal, { usd: 25, shares: 40.32, mode: "proportional" });

    expect(fields.timestamp).toBeGreaterThan(1_700_000_000_000);
    expect(fields.builder).toBe("MYBUILDER");
    expect(JSON.parse(fields.metadata).version).toBe(2);
    expect(fields).not.toHaveProperty("nonce");
    expect(fields).not.toHaveProperty("feeRateBps");
  });

  it("logs dry-run execution without submitting", async () => {
    const config = { DRY_RUN: true, ORDER_TYPE: "LIMIT" } as AppConfig;
    const clob = {
      buildOrderMetadata: () => "{}",
    } as unknown as ClobService;
    const engine = new ExecutionEngine(config, clob, pino({ level: "silent" }));
    const result = await engine.execute(signal, { usd: 20, shares: 32, mode: "proportional" });
    expect(result.dryRun).toBe(true);
    expect(result.submitted).toBe(false);
  });
});
