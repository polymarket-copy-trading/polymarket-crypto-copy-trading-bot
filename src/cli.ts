#!/usr/bin/env node
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { loadConfig } from "./config/index.js";
import { ClobService } from "./clients/clob.js";
import { PolygonClient } from "./clients/polygon.js";
import { CopyTradingPipeline } from "./engine/pipeline.js";
import { createLogger } from "./services/logger.js";

const [, , command = "help", ...args] = process.argv;

async function runHealth(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config);
  const polygon = new PolygonClient(config);
  const clob = new ClobService(config, logger);
  const latency = await polygon.measureLatencyMs();
  const health = await clob.healthCheck(latency);
  console.log(JSON.stringify(health, null, 2));
}

async function runDashboard(): Promise<void> {
  const config = loadConfig();
  const pipeline = new CopyTradingPipeline(config, createLogger(config));
  const store = pipeline.getStore();
  const risk = pipeline.getRisk();

  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║  Polymarket Crypto Copy Trading Bot — Live Dashboard         ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");
  console.log(`Mode: ${config.DRY_RUN ? "DRY_RUN (paper)" : "LIVE"}`);
  console.log(`Leaders: ${config.LEADER_WALLETS.join(", ")}`);
  console.log(`Session notional: $${risk.getSessionNotional().toFixed(2)}`);
  console.log(`Risk paused: ${risk.isPaused() ? "YES" : "NO"}\n`);

  console.log("Recent signals:");
  for (const s of store.recentSignals(10)) {
    console.log(
      `  [${new Date(s.createdAt).toISOString()}] ${s.status.toUpperCase()} ${s.side} ${s.conditionId.slice(0, 10)}... $${s.notionalUsd.toFixed(2)} ${s.reason ? `(${s.reason})` : ""}`,
    );
  }

  console.log("\nReject summary:");
  for (const r of store.rejectSummary()) {
    console.log(`  ${r.reason}: ${r.count}`);
  }
  pipeline.stop();
}

async function runExport(): Promise<void> {
  const config = loadConfig();
  const pipeline = new CopyTradingPipeline(config, createLogger(config));
  const out = args[0] ?? "trade-history.json";
  writeFileSync(out, JSON.stringify(pipeline.getStore().exportJson(), null, 2));
  console.log(`Exported to ${out}`);
  pipeline.stop();
}

function printHelp(): void {
  console.log(`
Polymarket Crypto Copy Trading Bot CLI

Commands:
  health       Run startup health check (RPC, CLOB auth, pUSD balance)
  dashboard    Show session dashboard from local SQLite store
  export       Export signal history to JSON (optional path)
  help         Show this help

Examples:
  npm run health
  npm run dashboard
  npm run export:history
`);
}

async function main(): Promise<void> {
  switch (command) {
    case "health":
      await runHealth();
      break;
    case "dashboard":
      await runDashboard();
      break;
    case "export":
      await runExport();
      break;
    default:
      printHelp();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
