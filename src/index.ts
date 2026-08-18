#!/usr/bin/env node
import "dotenv/config";
import { loadConfig } from "./config/index.js";
import { CopyTradingPipeline } from "./engine/pipeline.js";
import { createLogger } from "./services/logger.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config);
  const pipeline = new CopyTradingPipeline(config, logger);

  const shutdown = (): void => {
    logger.info("Shutting down copy-trading bot...");
    pipeline.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  logger.info(
    {
      dryRun: config.DRY_RUN,
      leaders: config.LEADER_WALLETS.length,
      cryptoOnly: config.CRYPTO_ONLY,
      phase: "1-read-only-follower",
    },
    "Polymarket Crypto Copy Trading Bot starting",
  );

  await pipeline.start();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
