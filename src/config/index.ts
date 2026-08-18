import { z } from "zod";

const orderTypeSchema = z.enum(["LIMIT", "FOK", "FAK"]);
const sizingModeSchema = z.enum(["fixed", "proportional", "balance_percent"]);

export const configSchema = z.object({
  PRIVATE_KEY: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "PRIVATE_KEY must be a 0x-prefixed 32-byte hex key"),
  RPC_URL: z.string().url(),
  LEADER_WALLETS: z
    .string()
    .min(1)
    .transform((v) =>
      v
        .split(",")
        .map((w) => w.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.string().regex(/^0x[a-fA-F0-9]{40}$/)).min(1)),
  FOLLOWER_WALLET: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .optional(),
  POSITION_MULTIPLIER: z.coerce.number().positive().default(0.25),
  MAX_TRADE_USD: z.coerce.number().positive().default(100),
  MIN_TRADE_USD: z.coerce.number().positive().default(5),
  SIZING_MODE: sizingModeSchema.default("proportional"),
  SLIPPAGE_TOLERANCE: z.coerce.number().min(0).max(1).default(0.02),
  ORDER_TYPE: orderTypeSchema.default("LIMIT"),
  COPY_SELLS: z
    .union([z.boolean(), z.string()])
    .transform((v) => v === true || v === "true")
    .default(false),
  MAX_SESSION_NOTIONAL: z.coerce.number().positive().default(500),
  MAX_PER_MARKET_NOTIONAL: z.coerce.number().positive().default(150),
  MAX_DAILY_LOSS_USD: z.coerce.number().positive().default(75),
  AUTO_PAUSE_ON_DRAWDOWN: z
    .union([z.boolean(), z.string()])
    .transform((v) => v === true || v === "true")
    .default(true),
  MAX_CONCURRENT_MARKETS: z.coerce.number().int().positive().default(8),
  USE_WEBSOCKET: z
    .union([z.boolean(), z.string()])
    .transform((v) => v === true || v === "true")
    .default(true),
  POLL_INTERVAL_MS: z.coerce.number().int().min(500).default(3000),
  BACKFILL_HISTORICAL: z
    .union([z.boolean(), z.string()])
    .transform((v) => v === true || v === "true")
    .default(false),
  CRYPTO_ONLY: z
    .union([z.boolean(), z.string()])
    .transform((v) => v === true || v === "true")
    .default(true),
  RESOLUTION_CUTOFF_HOURS: z.coerce.number().int().min(0).default(6),
  CLOB_HOST: z.string().url().default("https://clob.polymarket.com"),
  GAMMA_HOST: z.string().url().default("https://gamma-api.polymarket.com"),
  DATA_HOST: z.string().url().default("https://data-api.polymarket.com"),
  RELAYER_HOST: z.string().url().default("https://relayer-v2.polymarket.com"),
  WS_MARKET: z.string().url().default("wss://ws-subscriptions-clob.polymarket.com/ws/market"),
  WS_USER: z.string().url().default("wss://ws-subscriptions-clob.polymarket.com/ws/user"),
  WS_LIVE_DATA: z.string().url().default("wss://ws-live-data.polymarket.com"),
  POLY_BUILDER_CODE: z.string().optional(),
  DATABASE_PATH: z.string().default("./data/copy-bot.db"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  LOG_PRETTY: z
    .union([z.boolean(), z.string()])
    .transform((v) => v === true || v === "true")
    .default(true),
  METRICS_ENABLED: z
    .union([z.boolean(), z.string()])
    .transform((v) => v === true || v === "true")
    .default(false),
  METRICS_PORT: z.coerce.number().int().positive().default(9090),
  DRY_RUN: z
    .union([z.boolean(), z.string()])
    .transform((v) => v === true || v === "true")
    .default(true),
});

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = configSchema.safeParse(env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid configuration:\n${details}`);
  }
  return parsed.data;
}

export const ENDPOINTS = {
  clob: "https://clob.polymarket.com",
  gamma: "https://gamma-api.polymarket.com",
  data: "https://data-api.polymarket.com",
} as const;
