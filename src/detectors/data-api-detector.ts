import type { DataTrade } from "../clients/data.js";
import type { DataApiClient } from "../clients/data.js";
import { SignalDeduper, stableSignalId } from "./dedup.js";
import type { Logger } from "../services/logger.js";

export interface LeaderSignal {
  id: string;
  leader: string;
  side: "BUY" | "SELL";
  conditionId: string;
  tokenId?: string;
  size: number;
  price: number;
  notionalUsd: number;
  timestampMs: number;
  txHash?: string;
  source: "data-api" | "live-ws" | "polygon-logs";
  raw: DataTrade;
}

function parseNum(v: number | string | undefined, fallback = 0): number {
  if (v === undefined) return fallback;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : fallback;
}

function normalizeSide(side?: string): "BUY" | "SELL" | null {
  const s = (side ?? "").toUpperCase();
  if (s === "BUY" || s === "BUYER") return "BUY";
  if (s === "SELL" || s === "SELLER") return "SELL";
  return null;
}

export function tradeToSignal(trade: DataTrade, leader: string, source: LeaderSignal["source"]): LeaderSignal | null {
  const side = normalizeSide(trade.side);
  const conditionId = (trade.conditionId ?? trade.condition_id ?? trade.market ?? "").toLowerCase();
  if (!side || !conditionId) return null;

  const size = parseNum(trade.size);
  const price = parseNum(trade.price);
  const timestampRaw = parseNum(trade.timestamp);
  const timestampMs = timestampRaw > 1e12 ? timestampRaw : timestampRaw * 1000;
  const notionalUsd = size * price;

  const id = stableSignalId({
    tradeId: trade.id,
    txHash: trade.transactionHash,
    conditionId,
    side,
    size,
    price,
    timestamp: timestampMs,
    leader,
  });

  return {
    id,
    leader: leader.toLowerCase(),
    side,
    conditionId,
    tokenId: trade.asset,
    size,
    price,
    notionalUsd,
    timestampMs,
    txHash: trade.transactionHash,
    source,
    raw: trade,
  };
}

export class DataApiDetector {
  private readonly deduper = new SignalDeduper();
  private readonly lastSeenByLeader = new Map<string, number>();

  constructor(
    private readonly data: DataApiClient,
    private readonly leaders: string[],
    private readonly logger: Logger,
    private readonly startupTs: number,
    private readonly backfill: boolean,
  ) {}

  async poll(): Promise<LeaderSignal[]> {
    const signals: LeaderSignal[] = [];

    for (const leader of this.leaders) {
      try {
        const trades = await this.data.getTrades(leader, { limit: 25 });
        for (const trade of trades) {
          const signal = tradeToSignal(trade, leader, "data-api");
          if (!signal) continue;
          if (!this.backfill && signal.timestampMs < this.startupTs) continue;
          if (this.deduper.isDuplicate(signal.id)) continue;

          const last = this.lastSeenByLeader.get(leader) ?? 0;
          if (signal.timestampMs <= last) continue;
          this.lastSeenByLeader.set(leader, Math.max(last, signal.timestampMs));
          signals.push(signal);
        }
      } catch (error) {
        this.logger.warn({ leader, error: String(error) }, "Data API poll failed");
      }
    }

    return signals.sort((a, b) => a.timestampMs - b.timestampMs);
  }
}

export { SignalDeduper, stableSignalId };
