import type { AppConfig } from "../config/index.js";
import { apiRateLimiter } from "../utils/rate-limit.js";
import { withRetry } from "../utils/retry.js";

export interface DataTrade {
  id?: string;
  transactionHash?: string;
  proxyWallet?: string;
  user?: string;
  side?: string;
  size?: number | string;
  price?: number | string;
  timestamp?: number | string;
  conditionId?: string;
  condition_id?: string;
  asset?: string;
  outcome?: string;
  title?: string;
  slug?: string;
  market?: string;
  type?: string;
}

export interface DataActivity extends DataTrade {
  activityType?: string;
}

export interface DataPosition {
  conditionId?: string;
  condition_id?: string;
  size?: number | string;
  avgPrice?: number | string;
  currentValue?: number | string;
  cashPnl?: number | string;
  title?: string;
}

export class DataApiClient {
  constructor(private readonly config: Pick<AppConfig, "DATA_HOST">) {}

  async getTrades(user: string, options: { limit?: number; offset?: number; since?: number } = {}): Promise<DataTrade[]> {
    await apiRateLimiter.acquire();
    const url = new URL("/trades", this.config.DATA_HOST);
    url.searchParams.set("user", user);
    url.searchParams.set("limit", String(options.limit ?? 50));
    url.searchParams.set("offset", String(options.offset ?? 0));
    if (options.since) url.searchParams.set("start", String(Math.floor(options.since / 1000)));

    return withRetry(
      async () => {
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(`Data API trades ${res.status}`);
        return (await res.json()) as DataTrade[];
      },
      { label: "data.getTrades" },
    );
  }

  async getActivity(user: string, options: { limit?: number; type?: string } = {}): Promise<DataActivity[]> {
    await apiRateLimiter.acquire();
    const url = new URL("/activity", this.config.DATA_HOST);
    url.searchParams.set("user", user);
    url.searchParams.set("limit", String(options.limit ?? 50));
    if (options.type) url.searchParams.set("type", options.type);

    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Data API activity ${res.status}`);
    return (await res.json()) as DataActivity[];
  }

  async getPositions(user: string): Promise<DataPosition[]> {
    await apiRateLimiter.acquire();
    const url = new URL("/positions", this.config.DATA_HOST);
    url.searchParams.set("user", user);
    url.searchParams.set("limit", "100");

    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Data API positions ${res.status}`);
    return (await res.json()) as DataPosition[];
  }
}
