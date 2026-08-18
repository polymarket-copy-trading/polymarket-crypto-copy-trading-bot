import WebSocket from "ws";
import type { Logger } from "../services/logger.js";
import type { LeaderSignal } from "./data-api-detector.js";
import { tradeToSignal } from "./data-api-detector.js";
import type { DataTrade } from "../clients/data.js";
import { SignalDeduper } from "./dedup.js";

export class LiveDataWebSocketDetector {
  private ws?: WebSocket;
  private readonly deduper = new SignalDeduper();
  private reconnectAttempts = 0;
  private pingTimer?: NodeJS.Timeout;

  constructor(
    private readonly wsUrl: string,
    private readonly leaders: Set<string>,
    private readonly logger: Logger,
    private readonly startupTs: number,
    private readonly onSignal: (signal: LeaderSignal) => void,
  ) {}

  start(): void {
    this.connect();
  }

  stop(): void {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.ws?.close();
  }

  private connect(): void {
    this.ws = new WebSocket(this.wsUrl);

    this.ws.on("open", () => {
      this.reconnectAttempts = 0;
      this.logger.info("Live data websocket connected");
      this.pingTimer = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) this.ws.ping();
      }, 10_000);

      const payload = JSON.stringify({
        type: "subscribe",
        channel: "activity",
      });
      this.ws?.send(payload);
    });

    this.ws.on("message", (data) => {
      try {
        const msg = JSON.parse(String(data)) as Record<string, unknown>;
        this.handleMessage(msg);
      } catch {
        /* ignore malformed */
      }
    });

    this.ws.on("close", () => {
      if (this.pingTimer) clearInterval(this.pingTimer);
      this.scheduleReconnect();
    });

    this.ws.on("error", (err) => {
      this.logger.warn({ err: String(err) }, "Live data websocket error");
    });
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts += 1;
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30_000);
    const jitter = Math.floor(Math.random() * 500);
    setTimeout(() => this.connect(), delay + jitter);
  }

  private handleMessage(msg: Record<string, unknown>): void {
    const wallet = String(msg.proxyWallet ?? msg.user ?? msg.wallet ?? "").toLowerCase();
    if (!wallet || !this.leaders.has(wallet)) return;

    const trade = msg as unknown as DataTrade;
    const signal = tradeToSignal(trade, wallet, "live-ws");
    if (!signal || signal.timestampMs < this.startupTs) return;
    if (this.deduper.isDuplicate(signal.id)) return;
    this.onSignal(signal);
  }
}
