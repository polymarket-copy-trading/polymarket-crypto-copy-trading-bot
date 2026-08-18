import type { GammaMarket } from "../../clients/gamma.js";
import type { GammaClient } from "../../clients/gamma.js";

const CRYPTO_KEYWORDS = [
  "bitcoin",
  "btc",
  "ethereum",
  "eth",
  "crypto",
  "solana",
  "sol",
  "defi",
  "stablecoin",
  "usdt",
  "usdc",
  "depeg",
  "etf",
  "halving",
  "layer 2",
  "l2",
  "blockchain",
  "token",
  "coinbase",
  "binance",
  "memecoin",
  "doge",
  "xrp",
  "altcoin",
  "web3",
  "nft",
  "sec crypto",
  "regulation crypto",
];

const EXCLUDE_KEYWORDS = ["nfl", "nba", "mlb", "soccer", "football", "election", "president", "senate", "congress"];

export interface CryptoFilterResult {
  isCrypto: boolean;
  reason: string;
  market?: GammaMarket;
}

export function normalizeTags(market: GammaMarket): string[] {
  if (Array.isArray(market.tags)) return market.tags.map((t) => t.toLowerCase());
  if (typeof market.tags === "string") {
    try {
      const parsed = JSON.parse(market.tags) as unknown;
      if (Array.isArray(parsed)) return parsed.map(String).map((t) => t.toLowerCase());
    } catch {
      return [market.tags.toLowerCase()];
    }
  }
  return [];
}

export function scoreCryptoMarket(market: GammaMarket): CryptoFilterResult {
  const text = [
    market.question,
    market.title,
    market.slug,
    market.category,
    market.groupItemTitle,
    ...normalizeTags(market),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (market.closed || market.resolved) {
    return { isCrypto: false, reason: "market_closed_or_resolved", market };
  }

  if (market.active === false) {
    return { isCrypto: false, reason: "market_inactive", market };
  }

  for (const bad of EXCLUDE_KEYWORDS) {
    if (text.includes(bad) && !text.includes("crypto")) {
      return { isCrypto: false, reason: "excluded_non_crypto_category", market };
    }
  }

  const matched = CRYPTO_KEYWORDS.filter((k) => text.includes(k));
  if (matched.length > 0) {
    return { isCrypto: true, reason: `crypto_keywords:${matched.slice(0, 3).join(",")}`, market };
  }

  const category = (market.category ?? "").toLowerCase();
  if (category.includes("crypto")) {
    return { isCrypto: true, reason: "category_crypto", market };
  }

  return { isCrypto: false, reason: "not_crypto_market", market };
}

export class CryptoMarketCache {
  private readonly cache = new Map<string, { market: GammaMarket | null; expiresAt: number }>();
  constructor(
    private readonly gamma: GammaClient,
    private readonly ttlMs = 5 * 60_000,
  ) {}

  async resolve(conditionId: string): Promise<CryptoFilterResult> {
    const cached = this.cache.get(conditionId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.market
        ? scoreCryptoMarket(cached.market)
        : { isCrypto: false, reason: "market_not_found" };
    }

    const market = await this.gamma.getMarketByConditionId(conditionId);
    this.cache.set(conditionId, { market, expiresAt: Date.now() + this.ttlMs });
    if (!market) return { isCrypto: false, reason: "market_not_found" };
    return scoreCryptoMarket(market);
  }
}
