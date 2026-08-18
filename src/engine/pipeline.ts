import type { AppConfig } from "../config/index.js";
import { ClobService } from "../clients/clob.js";
import { DataApiClient } from "../clients/data.js";
import { GammaClient } from "../clients/gamma.js";
import { PolygonClient } from "../clients/polygon.js";
import { DataApiDetector } from "../detectors/data-api-detector.js";
import { LiveDataWebSocketDetector } from "../detectors/live-data-ws.js";
import { ExecutionEngine } from "../engine/execute.js";
import { sizeMirrorTrade } from "../engine/size.js";
import { validateSignal } from "../engine/validate.js";
import { CryptoMarketCache } from "../filters/crypto/index.js";
import { RiskManager } from "../risk/index.js";
import type { Logger } from "../services/logger.js";
import { StateStore } from "../store/sqlite.js";
import { sleep } from "../utils/retry.js";

export class CopyTradingPipeline {
  private readonly data: DataApiClient;
  private readonly gamma: GammaClient;
  private readonly polygon: PolygonClient;
  private readonly clob: ClobService;
  private readonly store: StateStore;
  private readonly risk: RiskManager;
  private readonly crypto: CryptoMarketCache;
  private readonly executor: ExecutionEngine;
  private readonly detector: DataApiDetector;
  private liveWs?: LiveDataWebSocketDetector;
  private running = false;
  private readonly startupTs: number;

  constructor(
    private readonly config: AppConfig,
    private readonly logger: Logger,
  ) {
    this.startupTs = Date.now();
    this.data = new DataApiClient(this.config);
    this.gamma = new GammaClient(this.config);
    this.polygon = new PolygonClient(this.config);
    this.clob = new ClobService(this.config, this.logger);
    this.store = new StateStore(this.config.DATABASE_PATH);
    this.risk = new RiskManager(this.config);
    this.crypto = new CryptoMarketCache(this.gamma);
    this.executor = new ExecutionEngine(this.config, this.clob, this.logger);
    this.detector = new DataApiDetector(
      this.data,
      this.config.LEADER_WALLETS,
      this.logger,
      this.startupTs,
      this.config.BACKFILL_HISTORICAL,
    );
  }

  async start(): Promise<void> {
    this.running = true;
    const rpcLatency = await this.polygon.measureLatencyMs();
    const health = await this.clob.healthCheck(rpcLatency);
    this.logger.info({ health }, "Startup health check");

    if (this.config.USE_WEBSOCKET) {
      this.liveWs = new LiveDataWebSocketDetector(
        this.config.WS_LIVE_DATA,
        new Set(this.config.LEADER_WALLETS.map((w) => w.toLowerCase())),
        this.logger,
        this.startupTs,
        (signal) => void this.processSignal(signal),
      );
      this.liveWs.start();
    }

    while (this.running) {
      const signals = await this.detector.poll();
      for (const signal of signals) {
        await this.processSignal(signal);
      }
      await sleep(this.config.POLL_INTERVAL_MS);
    }
  }

  stop(): void {
    this.running = false;
    this.liveWs?.stop();
    this.store.close();
  }

  getStore(): StateStore {
    return this.store;
  }

  getRisk(): RiskManager {
    return this.risk;
  }

  async processSignal(signal: import("../detectors/data-api-detector.js").LeaderSignal): Promise<void> {
    const crypto = await this.crypto.resolve(signal.conditionId);
    const balanceUsd = (await this.clob.healthCheck(0)).balanceUsd ?? 0;

    const validation = validateSignal(
      {
        side: signal.side,
        isCrypto: crypto.isCrypto || !this.config.CRYPTO_ONLY,
        cryptoReason: crypto.reason,
        leaderNotionalUsd: signal.notionalUsd,
        estimatedSlippage: 0.005,
        spread: 0.02,
        hasPosition: false,
        copySellsEnabled: this.config.COPY_SELLS,
        perMarketExposure: this.risk.getMarketExposure(signal.conditionId),
        sessionExposure: this.risk.getSessionNotional(),
        duplicate: false,
        riskPaused: this.risk.isPaused(),
      },
      {
        minTradeUsd: this.config.MIN_TRADE_USD,
        maxTradeUsd: this.config.MAX_TRADE_USD,
        slippageTolerance: this.config.SLIPPAGE_TOLERANCE,
        maxPerMarketNotional: this.config.MAX_PER_MARKET_NOTIONAL,
        maxSessionNotional: this.config.MAX_SESSION_NOTIONAL,
      },
    );

    if (!validation.accepted) {
      this.store.recordSignal({
        id: signal.id,
        leader: signal.leader,
        conditionId: signal.conditionId,
        side: signal.side,
        notionalUsd: signal.notionalUsd,
        status: "rejected",
        reason: validation.reason,
        source: signal.source,
        createdAt: Date.now(),
      });
      this.logger.info({ signalId: signal.id, reason: validation.reason }, "Signal rejected");
      return;
    }

    const size = sizeMirrorTrade(this.config, {
      leaderNotionalUsd: signal.notionalUsd,
      price: signal.price,
      availableBalanceUsd: balanceUsd,
    });

    const result = await this.executor.execute(signal, size);
    this.risk.recordAcceptedTrade(signal.conditionId, size.usd);
    this.store.recordSignal({
      id: signal.id,
      leader: signal.leader,
      conditionId: signal.conditionId,
      side: signal.side,
      notionalUsd: signal.notionalUsd,
      status: this.config.DRY_RUN ? "dry_run" : "accepted",
      sizedUsd: size.usd,
      source: signal.source,
      createdAt: Date.now(),
    });

    this.logger.info(
      { signalId: signal.id, latencyMs: result.latencyMs, sizedUsd: size.usd },
      this.config.DRY_RUN ? "Dry-run mirror decision logged" : "Trade executed",
    );
  }
}
