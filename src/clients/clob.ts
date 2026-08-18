import { Chain, ClobClient } from "@polymarket/clob-client-v2";
import { createWalletClient, http, type WalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { polygon } from "viem/chains";
import type { AppConfig } from "../config/index.js";
import type { Logger } from "../services/logger.js";
import { withRetry } from "../utils/retry.js";

export interface HealthReport {
  ok: boolean;
  rpcLatencyMs: number;
  clobOk: boolean;
  authOk: boolean;
  followerWallet: string;
  balanceUsd?: number;
  allowanceOk?: boolean;
  errors: string[];
}

export class ClobService {
  readonly walletClient: WalletClient;
  readonly followerAddress: string;
  private client?: ClobClient;
  private creds?: Awaited<ReturnType<ClobClient["createOrDeriveApiKey"]>>;

  constructor(
    private readonly config: AppConfig,
    private readonly logger: Logger,
  ) {
    const account = privateKeyToAccount(config.PRIVATE_KEY as `0x${string}`);
    this.followerAddress = (config.FOLLOWER_WALLET ?? account.address).toLowerCase();
    this.walletClient = createWalletClient({
      account,
      chain: polygon,
      transport: http(config.RPC_URL),
    });
  }

  async initialize(): Promise<ClobClient> {
    const bootstrap = new ClobClient({
      host: this.config.CLOB_HOST,
      chain: Chain.POLYGON,
      signer: this.walletClient,
    });

    this.creds = await withRetry(() => bootstrap.createOrDeriveApiKey(), { label: "clob.createOrDeriveApiKey" });
    this.client = new ClobClient({
      host: this.config.CLOB_HOST,
      chain: Chain.POLYGON,
      signer: this.walletClient,
      creds: this.creds,
    });

    this.logger.info({ follower: this.followerAddress }, "CLOB v2 client initialized");
    return this.client;
  }

  getClient(): ClobClient {
    if (!this.client) throw new Error("CLOB client not initialized");
    return this.client;
  }

  async healthCheck(rpcLatencyMs: number): Promise<HealthReport> {
    const errors: string[] = [];
    let clobOk = false;
    let authOk = false;
    let balanceUsd: number | undefined;
    let allowanceOk: boolean | undefined;

    try {
      const client = this.client ?? (await this.initialize());
      await withRetry(() => client.getOk(), { label: "clob.getOk" });
      clobOk = true;
      authOk = Boolean(this.creds?.key);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }

    try {
      const client = this.getClient();
      const bal = await client.getBalanceAllowance({ asset_type: "COLLATERAL" as never });
      const raw = Number((bal as { balance?: string }).balance ?? 0);
      balanceUsd = raw / 1e6;
      const allowance = Number((bal as { allowance?: string }).allowance ?? 0);
      allowanceOk = allowance > 0;
    } catch (error) {
      errors.push(`balance/allowance: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      ok: clobOk && authOk && errors.length === 0,
      rpcLatencyMs,
      clobOk,
      authOk,
      followerWallet: this.followerAddress,
      balanceUsd,
      allowanceOk,
      errors,
    };
  }

  buildOrderMetadata(signalId: string): string {
    return JSON.stringify({
      source: "poly-copy-bot",
      signalId,
      builder: this.config.POLY_BUILDER_CODE ?? null,
      version: 2,
    });
  }
}
