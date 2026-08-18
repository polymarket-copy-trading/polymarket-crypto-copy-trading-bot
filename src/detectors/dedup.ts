export function stableSignalId(parts: {
  tradeId?: string;
  txHash?: string;
  conditionId?: string;
  side?: string;
  size?: number | string;
  price?: number | string;
  timestamp?: number | string;
  leader?: string;
}): string {
  if (parts.tradeId) return `trade:${parts.tradeId}`;
  if (parts.txHash) return `tx:${parts.txHash}`;
  return [
    parts.leader ?? "unknown",
    parts.conditionId ?? "unknown",
    parts.side ?? "unknown",
    parts.size ?? "0",
    parts.price ?? "0",
    parts.timestamp ?? "0",
  ].join(":");
}

export class SignalDeduper {
  private readonly seen = new Set<string>();
  private readonly order: string[] = [];
  private readonly maxSize: number;

  constructor(maxSize = 10_000) {
    this.maxSize = maxSize;
  }

  isDuplicate(id: string): boolean {
    if (this.seen.has(id)) return true;
    this.seen.add(id);
    this.order.push(id);
    if (this.order.length > this.maxSize) {
      const oldest = this.order.shift();
      if (oldest) this.seen.delete(oldest);
    }
    return false;
  }

  size(): number {
    return this.seen.size;
  }

  clear(): void {
    this.seen.clear();
    this.order.length = 0;
  }
}
