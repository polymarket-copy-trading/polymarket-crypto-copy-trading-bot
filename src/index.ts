import { PhemexClient } from "./api/phemex/client.js";
import { loadConfig } from "./config/index.js";
import { createLogger } from "./services/logger.js";
import { AiGridEngine } from "./strategies/ai-grid/ai-grid-engine.js";

async function main(): Promise<void> {
  const config = loadConfig();
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

  logger.info(
    {
      symbol: config.trading.symbol,
      dryRun: config.trading.dryRun,
      aiEnabled: config.ai.enabled,
    },
    "Starting Phemex AI Optimized Trading Bot",
  );

  await engine.initialize();
  await engine.deployInitialGrid();
  engine.startPolling();
}

main().catch((err) => {
  console.error("Fatal error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
