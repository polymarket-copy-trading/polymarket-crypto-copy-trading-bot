import type { AppConfig } from "../config/index.js";
import { apiRateLimiter } from "../utils/rate-limit.js";
import { withRetry } from "../utils/retry.js";

export interface GammaMarket {
  id?: string;
  conditionId?: string;
  condition_id?: string;
  question?: string;
  title?: string;
  slug?: string;
  tags?: string[] | string;
  category?: string;
  groupItemTitle?: string;
  endDate?: string;
  end_date_iso?: string;
  closed?: boolean;
  active?: boolean;
  resolved?: boolean;
  outcomes?: string[];
  clobTokenIds?: string[] | string;
}

export class GammaClient {
  constructor(private readonly config: Pick<AppConfig, "GAMMA_HOST">) {}

  async getMarketByConditionId(conditionId: string): Promise<GammaMarket | null> {
    await apiRateLimiter.acquire();
    const url = new URL("/markets", this.config.GAMMA_HOST);
    url.searchParams.set("condition_ids", conditionId);
    url.searchParams.set("limit", "1");

    const markets = await withRetry(
      async () => {
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(`Gamma API ${res.status}: ${await res.text()}`);
        return (await res.json()) as GammaMarket[];
      },
      { label: "gamma.getMarketByConditionId" },
    );

    return markets[0] ?? null;
  }

  async searchMarkets(query: string, limit = 20): Promise<GammaMarket[]> {
    await apiRateLimiter.acquire();
    const url = new URL("/markets", this.config.GAMMA_HOST);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("search", query);

    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Gamma API ${res.status}`);
    return (await res.json()) as GammaMarket[];
  }
}
