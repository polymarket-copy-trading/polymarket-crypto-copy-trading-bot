import type { AppConfig } from "../config/index.js";
import type { ClobService } from "../clients/clob.js";
import type { LeaderSignal } from "../detectors/data-api-detector.js";
import type { Logger } from "../services/logger.js";
import type { SizeResult } from "./size.js";

export interface ExecutionResult {
  dryRun: boolean;
  submitted: boolean;
  orderId?: string;
  metadata: string;
  latencyMs: number;
  error?: string;
}

export class ExecutionEngine {
  constructor(
    private readonly config: AppConfig,
    private readonly clob: ClobService,
    private readonly logger: Logger,
  ) {}

  async execute(signal: LeaderSignal, size: SizeResult): Promise<ExecutionResult> {
    const start = Date.now();
    const metadata = this.clob.buildOrderMetadata(signal.id);

    if (this.config.DRY_RUN) {
      this.logger.info(
        {
          signalId: signal.id,
          leader: signal.leader,
          side: signal.side,
          conditionId: signal.conditionId,
          sizeUsd: size.usd,
          shares: size.shares,
          orderType: this.config.ORDER_TYPE,
          metadata,
        },
        "DRY_RUN: would mirror leader trade",
      );

      return {
        dryRun: true,
        submitted: false,
        metadata,
        latencyMs: Date.now() - start,
      };
    }

    // Phase 2: live order placement via ClobClient v2
    return {
      dryRun: false,
      submitted: false,
      metadata,
      latencyMs: Date.now() - start,
      error: "Live execution enabled in Phase 2",
    };
  }

  buildV2OrderFields(signal: LeaderSignal, size: SizeResult) {
    return {
      tokenID: signal.tokenId ?? "",
      price: signal.price,
      side: signal.side,
      size: size.shares,
      timestamp: Date.now(),
      metadata: this.clob.buildOrderMetadata(signal.id),
      builder: this.config.POLY_BUILDER_CODE ?? undefined,
    };
  }
}
