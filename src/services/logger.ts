import pino from "pino";
import type { AppConfig } from "../config/index.js";

export function createLogger(config: Pick<AppConfig, "LOG_LEVEL" | "LOG_PRETTY">) {
  return pino({
    level: config.LOG_LEVEL,
    redact: {
      paths: [
        "PRIVATE_KEY",
        "privateKey",
        "apiKey",
        "apiSecret",
        "passphrase",
        "creds.key",
        "creds.secret",
        "creds.passphrase",
      ],
      censor: "[REDACTED]",
    },
    transport: config.LOG_PRETTY
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        }
      : undefined,
  });
}

export type Logger = ReturnType<typeof createLogger>;
