import type { PhemexClient } from "../../api/phemex/client.js";
import type { AppConfig } from "../../config/index.js";
import {
  analyzeSignal,
  computeIndicators,
  hasSignificantRegimeChange,
  optimizeGridParams,
  type OptimizedGridParams,
  type TradingSignal,
} from "../../ai/index.js";
import type { Logger } from "../../services/logger.js";
import { MarketDataService } from "../../services/market-data.js";
import { RiskManager } from "../../services/risk-manager.js";
import {
  buildGridLevels,
  getLevelAbove,
  getLevelBelow,
  type GridLevel,
} from "./grid-config.js";
import { OrderManager } from "./order-manager.js";

export interface AiGridEngineStats {
  totalBuys: number;
  totalSells: number;
  profitCycles: number;
  activeOrders: number;
  lastPrice: number;
  lastSignal?: TradingSignal;
  lastOptimization?: OptimizedGridParams;
  aiReoptimizations: number;
}

export class AiGridEngine {
  private levels: GridLevel[] = [];
  private orderManager: OrderManager;
  private readonly riskManager: RiskManager;
  private readonly marketData: MarketDataService;
  private running = false;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private reoptTimer: ReturnType<typeof setInterval> | null = null;
  private currentOrderSize: number;
  private lastOptimization: OptimizedGridParams | null = null;
  private stats: AiGridEngineStats = {
    totalBuys: 0,
    totalSells: 0,
    profitCycles: 0,
    activeOrders: 0,
    lastPrice: 0,
    aiReoptimizations: 0,
  };

  constructor(
    private readonly client: PhemexClient,
    private readonly config: AppConfig,
    private readonly logger: Logger,
  ) {
    this.currentOrderSize = config.trading.orderSize;

    this.orderManager = new OrderManager(
      client,
      {
        symbol: config.trading.symbol,
        posSide: config.trading.posSide,
        dryRun: config.trading.dryRun,
      },
      logger,
    );

    this.riskManager = new RiskManager({
      maxQuoteExposure: config.trading.maxQuoteExposure,
      orderSize: config.trading.orderSize,
      stopLossPrice: config.trading.stopLossPrice,
      takeProfitPrice: config.trading.takeProfitPrice,
    });

    this.marketData = new MarketDataService(client);
  }

  getLevels(): GridLevel[] {
    return [...this.levels];
  }

  getStats(): AiGridEngineStats {
    return {
      ...this.stats,
      activeOrders: this.orderManager.getActiveOrders().length,
      lastOptimization: this.lastOptimization ?? undefined,
    };
  }

  async runAiAnalysis(): Promise<{
    signal: TradingSignal;
    optimized: OptimizedGridParams;
  }> {
    const candles = await this.marketData.getCandles(
      this.config.trading.symbol,
      3600,
      100,
    );

    const indicators = computeIndicators(candles, {
      rsiPeriod: this.config.ai.rsiPeriod,
      emaFast: this.config.ai.emaFast,
      emaSlow: this.config.ai.emaSlow,
      atrPeriod: this.config.ai.atrPeriod,
    });

    const signal = analyzeSignal(indicators, {
      minConfidence: this.config.ai.minConfidence,
    });

    const optimized = optimizeGridParams(this.config, signal);
    this.stats.lastSignal = signal;
    this.lastOptimization = optimized;

    return { signal, optimized };
  }

  private applyOptimizedParams(optimized: OptimizedGridParams): void {
    this.levels = buildGridLevels({
      mode: optimized.gridMode,
      lowerPrice: optimized.lowerPrice,
      upperPrice: optimized.upperPrice,
      levels: optimized.levels,
      orderSize: optimized.orderSize,
    });
    this.currentOrderSize = optimized.orderSize;
    this.stats.lastOptimization = optimized;
  }

  async initialize(): Promise<void> {
    await this.client.getProducts();

    const { optimized } = await this.runAiAnalysis();
    this.applyOptimizedParams(optimized);

    const riskCheck = this.riskManager.validateGridConfig(this.levels);
    if (!riskCheck.allowed) {
      throw new Error(riskCheck.reason);
    }

    try {
      const precision = this.client.getSymbolPrecision(
        this.config.trading.symbol,
      );
      this.logger.info(
        {
          symbol: this.config.trading.symbol,
          tickSize: precision.tickSize,
          stepSize: precision.stepSize,
          minQty: precision.minQty,
        },
        "Symbol precision loaded",
      );
    } catch (err) {
      this.logger.warn({ err }, "Could not load symbol info; using defaults");
    }

    const snapshot = await this.marketData.getSnapshot(
      this.config.trading.symbol,
    );
    this.stats.lastPrice = snapshot.lastPrice;

    this.logger.info(
      {
        levels: this.levels.length,
        range: [this.levels[0]!.price, this.levels.at(-1)!.price],
        lastPrice: snapshot.lastPrice,
        mode: this.lastOptimization?.gridMode,
        dryRun: this.config.trading.dryRun,
        aiEnabled: this.config.ai.enabled,
        signal: this.stats.lastSignal?.bias,
      },
      "AI grid engine initialized",
    );
  }

  async deployInitialGrid(): Promise<void> {
    const snapshot = await this.marketData.getSnapshot(
      this.config.trading.symbol,
    );
    const lastPrice = snapshot.lastPrice;
    this.stats.lastPrice = lastPrice;

    for (const level of this.levels) {
      if (level.price < lastPrice) {
        await this.placeBuyIfAllowed(level.index, level.price, this.currentOrderSize);
      } else if (level.price > lastPrice) {
        await this.placeSellIfAllowed(level.index, level.price, this.currentOrderSize);
      }
    }

    this.logger.info(
      {
        lastPrice,
        activeOrders: this.orderManager.getActiveOrders().length,
      },
      "Initial AI-optimized grid deployed",
    );
  }

  private async placeBuyIfAllowed(
    levelIndex: number,
    price: number,
    size: number,
  ): Promise<void> {
    if (this.orderManager.findOrderByLevel(levelIndex, "Buy")) return;

    const risk = this.riskManager.canPlaceBuyOrder(price, size);
    if (!risk.allowed) {
      this.logger.warn({ levelIndex, reason: risk.reason }, "Buy blocked by risk");
      return;
    }

    await this.orderManager.placeLimitOrder(levelIndex, "Buy", price, size);
    this.riskManager.recordBuy(price, size);
    this.stats.totalBuys += 1;
  }

  private async placeSellIfAllowed(
    levelIndex: number,
    price: number,
    size: number,
  ): Promise<void> {
    if (this.orderManager.findOrderByLevel(levelIndex, "Sell")) return;

    await this.orderManager.placeLimitOrder(levelIndex, "Sell", price, size);
    this.stats.totalSells += 1;
  }

  async onOrderFilled(levelIndex: number, side: "Buy" | "Sell"): Promise<void> {
    if (side === "Buy") {
      const above = getLevelAbove(this.levels, levelIndex);
      if (above) {
        await this.placeSellIfAllowed(
          above.index,
          above.price,
          this.currentOrderSize,
        );
        this.stats.profitCycles += 1;
      }
    } else {
      const below = getLevelBelow(this.levels, levelIndex);
      if (below) {
        await this.placeBuyIfAllowed(
          below.index,
          below.price,
          this.currentOrderSize,
        );
        this.riskManager.recordSell(
          this.levels[levelIndex]!.price,
          this.currentOrderSize,
        );
      }
    }
  }

  async pollAndRebalance(): Promise<void> {
    const snapshot = await this.marketData.getSnapshot(
      this.config.trading.symbol,
    );
    const lastPrice = snapshot.lastPrice;
    this.stats.lastPrice = lastPrice;

    const trigger = this.riskManager.checkPriceTriggers(lastPrice);
    if (trigger) {
      this.logger.warn({ trigger, lastPrice }, "Price trigger hit — shutting down");
      await this.shutdown(true);
      return;
    }

    const previousOrders = this.orderManager.getActiveOrders();
    await this.orderManager.syncWithExchange();
    const currentOrders = this.orderManager.getActiveOrders();

    const filled = previousOrders.filter(
      (prev) =>
        !currentOrders.some((c) => c.clientOrderId === prev.clientOrderId),
    );

    for (const order of filled) {
      if (order.state === "live" || order.state === "filled") {
        this.logger.info(
          { levelIndex: order.levelIndex, side: order.side, price: order.price },
          "Order filled — rebalancing grid",
        );
        await this.onOrderFilled(order.levelIndex, order.side);
      }
    }

    this.stats.activeOrders = this.orderManager.getActiveOrders().length;
  }

  async reoptimizeIfNeeded(): Promise<void> {
    if (!this.config.ai.enabled) return;

    const previous = this.lastOptimization;
    const { signal, optimized } = await this.runAiAnalysis();

    this.logger.info(
      {
        bias: signal.bias,
        score: signal.score,
        confidence: signal.confidence,
        reasons: signal.reasons,
      },
      "AI signal analysis complete",
    );

    if (!previous || !hasSignificantRegimeChange(previous, optimized)) {
      return;
    }

    this.logger.info(
      { adjustments: optimized.adjustments },
      "Significant regime change — reoptimizing grid",
    );

    await this.orderManager.cancelAllLocal();
    if (!this.config.trading.dryRun) {
      try {
        await this.client.cancelAllOrders(this.config.trading.symbol);
      } catch (err) {
        this.logger.error({ err }, "Failed to cancel orders during reoptimization");
      }
    }

    this.orderManager.clear();
    this.applyOptimizedParams(optimized);
    await this.deployInitialGrid();
    this.stats.aiReoptimizations += 1;
  }

  startPolling(): void {
    if (this.running) return;
    this.running = true;

    const pollInterval = this.config.trading.pollIntervalMs;
    this.pollTimer = setInterval(() => {
      void this.pollAndRebalance().catch((err) => {
        this.logger.error({ err }, "Poll cycle failed");
      });
    }, pollInterval);

    if (this.config.ai.enabled) {
      const reoptInterval = this.config.ai.reoptimizeIntervalMs;
      this.reoptTimer = setInterval(() => {
        void this.reoptimizeIfNeeded().catch((err) => {
          this.logger.error({ err }, "AI reoptimization failed");
        });
      }, reoptInterval);
    }

    this.logger.info(
      {
        pollIntervalMs: pollInterval,
        reoptimizeIntervalMs: this.config.ai.reoptimizeIntervalMs,
      },
      "AI grid polling started",
    );
  }

  stop(): void {
    this.running = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.reoptTimer) {
      clearInterval(this.reoptTimer);
      this.reoptTimer = null;
    }
    this.logger.info("AI grid engine stopped");
  }

  async shutdown(cancelOrders = true): Promise<void> {
    this.stop();

    if (cancelOrders && !this.config.trading.dryRun) {
      try {
        await this.client.cancelAllOrders(this.config.trading.symbol);
        this.logger.info("All open orders canceled");
      } catch (err) {
        this.logger.error({ err }, "Failed to cancel orders on shutdown");
      }
    }
  }
}
