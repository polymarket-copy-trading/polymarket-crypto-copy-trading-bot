#!/usr/bin/env node
import { PhemexClient } from "./api/phemex/client.js";
import { loadConfig, loadPublicConfig } from "./config/index.js";
import { createLogger } from "./services/logger.js";
import { AiGridEngine } from "./strategies/ai-grid/ai-grid-engine.js";
import {
  buildGridLevels,
  formatGridTable,
} from "./strategies/ai-grid/grid-config.js";
import {
  analyzeSignal,
  computeIndicators,
  optimizeGridParams,
} from "./ai/index.js";
import { MarketDataService } from "./services/market-data.js";

const USAGE = `
Phemex AI Optimized Trading Bot

Usage:
  phemex-ai-bot <command> [options]

Commands:
  start [--dry-run]     Start the AI grid trading bot
  analyze               Run AI market analysis (no trading)
  simulate              Preview AI-optimized grid levels
  status                Show current ticker and account info
  ping                  Test Phemex API connectivity
  help                  Show this help message

Examples:
  npm run cli -- ping
  npm run cli -- analyze
  npm run cli -- simulate
  npm run cli -- start --dry-run
  npm run cli -- start
`.trim();

function parseArgs(argv: string[]): {
  command: string;
  dryRun: boolean;
} {
  const args = argv.slice(2);
  const command = args[0] ?? "help";
  const dryRun = args.includes("--dry-run");
  return { command, dryRun };
}

async function cmdPing(client: PhemexClient): Promise<void> {
  const serverTime = await client.getServerTime();
  console.log(`✓ Phemex API connected (server time: ${new Date(serverTime).toISOString()})`);
}

async function cmdStatus(client: PhemexClient, symbol: string): Promise<void> {
  const market = new MarketDataService(client);
  const snapshot = await market.getSnapshot(symbol);
  console.log("\n=== Market Status ===");
  console.log(`Symbol:     ${snapshot.symbol}`);
  console.log(`Last Price: ${snapshot.lastPrice}`);
  console.log(`Bid/Ask:    ${snapshot.bid} / ${snapshot.ask}`);
  console.log(`24h High:   ${snapshot.high24h}`);
  console.log(`24h Low:    ${snapshot.low24h}`);
  console.log(`24h Volume: ${snapshot.volume24h}`);
}

async function cmdAnalyze(
  client: PhemexClient,
  config: ReturnType<typeof loadConfig>,
): Promise<void> {
  const market = new MarketDataService(client);
  const candles = await market.getCandles(config.trading.symbol, 3600, 100);

  const indicators = computeIndicators(candles, {
    rsiPeriod: config.ai.rsiPeriod,
    emaFast: config.ai.emaFast,
    emaSlow: config.ai.emaSlow,
    atrPeriod: config.ai.atrPeriod,
  });

  const signal = analyzeSignal(indicators, {
    minConfidence: config.ai.minConfidence,
  });

  const optimized = optimizeGridParams(config, signal);

  console.log("\n=== AI Market Analysis ===");
  console.log(`Symbol:          ${config.trading.symbol}`);
  console.log(`Last Close:      ${indicators.lastClose}`);
  console.log(`RSI (${config.ai.rsiPeriod}):         ${indicators.rsi.toFixed(2)}`);
  console.log(`EMA Fast/Slow:   ${indicators.emaFast.toFixed(2)} / ${indicators.emaSlow.toFixed(2)}`);
  console.log(`MACD Histogram:  ${indicators.macdHistogram.toFixed(4)}`);
  console.log(`ATR:             ${indicators.atr.toFixed(2)}`);
  console.log(`Bollinger Width: ${(indicators.bollingerWidth * 100).toFixed(2)}%`);
  console.log("");
  console.log(`Signal Score:    ${signal.score}`);
  console.log(`Bias:            ${signal.bias}`);
  console.log(`Strength:        ${signal.strength}`);
  console.log(`Confidence:      ${(signal.confidence * 100).toFixed(1)}%`);
  console.log(`Reasons:`);
  for (const reason of signal.reasons) {
    console.log(`  • ${reason}`);
  }
  console.log("");
  console.log("=== AI-Optimized Grid Parameters ===");
  console.log(`Lower Price:     ${optimized.lowerPrice}`);
  console.log(`Upper Price:     ${optimized.upperPrice}`);
  console.log(`Levels:          ${optimized.levels}`);
  console.log(`Order Size:      ${optimized.orderSize}`);
  console.log(`Grid Mode:       ${optimized.gridMode}`);
  console.log(`Adjustments:`);
  for (const adj of optimized.adjustments) {
    console.log(`  • ${adj}`);
  }
}

async function cmdSimulate(
  client: PhemexClient,
  config: ReturnType<typeof loadConfig>,
): Promise<void> {
  const market = new MarketDataService(client);
  const candles = await market.getCandles(config.trading.symbol, 3600, 100);
  const indicators = computeIndicators(candles, {
    rsiPeriod: config.ai.rsiPeriod,
    emaFast: config.ai.emaFast,
    emaSlow: config.ai.emaSlow,
    atrPeriod: config.ai.atrPeriod,
  });
  const signal = analyzeSignal(indicators, {
    minConfidence: config.ai.minConfidence,
  });
  const optimized = optimizeGridParams(config, signal);

  const levels = buildGridLevels({
    mode: optimized.gridMode,
    lowerPrice: optimized.lowerPrice,
    upperPrice: optimized.upperPrice,
    levels: optimized.levels,
    orderSize: optimized.orderSize,
  });

  const snapshot = await market.getSnapshot(config.trading.symbol);

  console.log("\n=== AI Grid Simulation ===");
  console.log(`Symbol:      ${config.trading.symbol}`);
  console.log(`Last Price:  ${snapshot.lastPrice}`);
  console.log(`Signal:      ${signal.bias} (${signal.score})`);
  console.log(`Range:       ${optimized.lowerPrice} — ${optimized.upperPrice}`);
  console.log(`Levels:      ${optimized.levels} (${optimized.gridMode})`);
  console.log(`Order Size:  ${optimized.orderSize}`);
  console.log("\nGrid Levels:");
  console.log(formatGridTable(levels));
}

async function cmdStart(dryRun: boolean): Promise<void> {
  const config = loadConfig({ dryRun });
  const logger = createLogger(config.logLevel);

  const client = new PhemexClient({
    apiKey: config.phemex.apiKey,
    apiSecret: config.phemex.apiSecret,
    baseUrl: config.phemex.baseUrl,
  });

  const engine = new AiGridEngine(client, config, logger);

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutdown signal received");
    await engine.shutdown(true);
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  await engine.initialize();
  await engine.deployInitialGrid();
  engine.startPolling();

  logger.info(
    { dryRun: config.trading.dryRun, symbol: config.trading.symbol },
    "Phemex AI trading bot running",
  );
}

function createClientFromEnv(): PhemexClient {
  return new PhemexClient({
    apiKey: process.env.PHEMEX_API_KEY ?? "public",
    apiSecret: process.env.PHEMEX_API_SECRET ?? "public",
    baseUrl: process.env.PHEMEX_BASE_URL ?? "https://api.phemex.com",
  });
}

async function main(): Promise<void> {
  const { command, dryRun } = parseArgs(process.argv);

  if (command === "help" || command === "--help" || command === "-h") {
    console.log(USAGE);
    return;
  }

  if (command === "ping") {
    await cmdPing(createClientFromEnv());
    return;
  }

  const isPublicCommand = ["status", "analyze", "simulate"].includes(command);
  const config = isPublicCommand ? loadPublicConfig() : loadConfig({ dryRun });

  const client = new PhemexClient({
    apiKey: config.phemex.apiKey,
    apiSecret: config.phemex.apiSecret,
    baseUrl: config.phemex.baseUrl,
  });

  switch (command) {
    case "status":
      await cmdStatus(client, config.trading.symbol);
      break;
    case "analyze":
      await cmdAnalyze(client, config);
      break;
    case "simulate":
      await cmdSimulate(client, config);
      break;
    case "start":
      await cmdStart(dryRun);
      break;
    default:
      console.error(`Unknown command: ${command}\n`);
      console.log(USAGE);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
