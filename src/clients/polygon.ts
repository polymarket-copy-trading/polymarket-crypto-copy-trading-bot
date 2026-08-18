import { createPublicClient, http, type PublicClient } from "viem";
import { polygon } from "viem/chains";
import type { AppConfig } from "../config/index.js";

export class PolygonClient {
  readonly client: PublicClient;

  constructor(private readonly config: Pick<AppConfig, "RPC_URL">) {
    this.client = createPublicClient({
      chain: polygon,
      transport: http(config.RPC_URL, { timeout: 10_000 }),
    });
  }

  async measureLatencyMs(): Promise<number> {
    const start = Date.now();
    await this.client.getBlockNumber();
    return Date.now() - start;
  }
}
