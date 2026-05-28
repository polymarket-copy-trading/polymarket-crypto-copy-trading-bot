import pino from "pino";

export type Logger = pino.Logger;

export function createLogger(level = "info"): Logger {
  const isDev = process.env.NODE_ENV !== "production";

  return pino({
    level,
    transport: isDev
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
