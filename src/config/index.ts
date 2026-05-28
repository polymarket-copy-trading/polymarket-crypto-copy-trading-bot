import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const GridModeSchema = z.enum(["arithmetic", "geometric"]);

export const ConfigSchema = z.object({
  phemex: z.object({
    apiKey: z.string().min(1),
    apiSecret: z.string().min(1),
    baseUrl: z.string().url(),
  }),
  trading: z.object({
    symbol: z.string().min(1),
    gridMode: GridModeSchema,
    lowerPrice: z.number().positive(),
    upperPrice: z.number().positive(),
    levels: z.number().int().min(2).max(200),
    orderSize: z.number().positive(),
    posSide: z.enum(["Merged", "Long", "Short"]).default("Merged"),
    maxQuoteExposure: z.number().positive().optional(),
    stopLossPrice: z.number().positive().optional(),
    takeProfitPrice: z.number().positive().optional(),
    pollIntervalMs: z.number().int().min(1000).default(5000),
    dryRun: z.boolean().default(false),
  }),
  ai: z.object({
    enabled: z.boolean().default(true),
    reoptimizeIntervalMs: z.number().int().min(60_000).default(300_000),
    rsiPeriod: z.number().int().min(2).max(50).default(14),
    emaFast: z.number().int().min(2).max(100).default(12),
    emaSlow: z.number().int().min(2).max(200).default(26),
    atrPeriod: z.number().int().min(2).max(50).default(14),
    minConfidence: z.number().min(0).max(1).default(0.3),
  }),
  logLevel: z.string().default("info"),
});

export type AppConfig = z.infer<typeof ConfigSchema>;
export type GridMode = z.infer<typeof GridModeSchema>;

/** Normalize BTC-USDT, btc_usdt → BTCUSDT */
export function normalizeSymbol(raw: string): string {
  return raw.replace(/[-_/ ]/g, "").toUpperCase();
}

export function loadConfig(overrides?: Partial<{ dryRun: boolean }>): AppConfig {
  return parseConfig(overrides, false);
}

/** Load config for public-only CLI commands (no API keys required). */
export function loadPublicConfig(): AppConfig {
  return parseConfig(undefined, true);
}

function parseConfig(
  overrides?: Partial<{ dryRun: boolean }>,
  allowMissingKeys = false,
): AppConfig {
  const lowerPrice = Number(process.env.GRID_LOWER_PRICE);
  const upperPrice = Number(process.env.GRID_UPPER_PRICE);

  const raw = {
    phemex: {
      apiKey:
        process.env.PHEMEX_API_KEY?.trim() ||
        (allowMissingKeys ? "public" : ""),
      apiSecret:
        process.env.PHEMEX_API_SECRET?.trim() ||
        (allowMissingKeys ? "public" : ""),
      baseUrl: process.env.PHEMEX_BASE_URL ?? "https://api.phemex.com",
    },
    trading: {
      symbol: normalizeSymbol(process.env.PHEMEX_SYMBOL ?? "BTCUSDT"),
      gridMode: (process.env.GRID_MODE ?? "arithmetic") as GridMode,
      lowerPrice,
      upperPrice,
      levels: Number(process.env.GRID_LEVELS ?? 10),
      orderSize: Number(process.env.GRID_ORDER_SIZE ?? 0.001),
      posSide: (process.env.POS_SIDE ?? "Merged") as "Merged" | "Long" | "Short",
      maxQuoteExposure: process.env.MAX_QUOTE_EXPOSURE
        ? Number(process.env.MAX_QUOTE_EXPOSURE)
        : undefined,
      stopLossPrice: process.env.STOP_LOSS_PRICE
        ? Number(process.env.STOP_LOSS_PRICE)
        : undefined,
      takeProfitPrice: process.env.TAKE_PROFIT_PRICE
        ? Number(process.env.TAKE_PROFIT_PRICE)
        : undefined,
      pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? 5000),
      dryRun: overrides?.dryRun ?? process.env.DRY_RUN === "true",
    },
    ai: {
      enabled: process.env.AI_ENABLED !== "false",
      reoptimizeIntervalMs: Number(process.env.AI_REOPTIMIZE_INTERVAL_MS ?? 300_000),
      rsiPeriod: Number(process.env.AI_RSI_PERIOD ?? 14),
      emaFast: Number(process.env.AI_EMA_FAST ?? 12),
      emaSlow: Number(process.env.AI_EMA_SLOW ?? 26),
      atrPeriod: Number(process.env.AI_ATR_PERIOD ?? 14),
      minConfidence: Number(process.env.AI_MIN_CONFIDENCE ?? 0.3),
    },
    logLevel: process.env.LOG_LEVEL ?? "info",
  };

  const parsed = ConfigSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid configuration:\n${issues}`);
  }

  if (parsed.data.trading.lowerPrice >= parsed.data.trading.upperPrice) {
    throw new Error("GRID_LOWER_PRICE must be less than GRID_UPPER_PRICE");
  }

  if (parsed.data.ai.emaFast >= parsed.data.ai.emaSlow) {
    throw new Error("AI_EMA_FAST must be less than AI_EMA_SLOW");
  }

  return parsed.data;
}
