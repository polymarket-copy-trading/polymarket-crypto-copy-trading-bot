import type { AppConfig } from "../config/index.js";

export interface RiskState {
  paused: boolean;
  pauseReason?: string;
  sessionNotional: number;
  perMarket: Map<string, number>;
  executionFailures: number;
  dailyPnlUsd: number;
}

export class RiskManager {
  private state: RiskState = {
    paused: false,
    sessionNotional: 0,
    perMarket: new Map(),
    executionFailures: 0,
    dailyPnlUsd: 0,
  };

  constructor(private readonly config: AppConfig) {}

  isPaused(): boolean {
    return this.state.paused;
  }

  pause(reason: string): void {
    this.state.paused = true;
    this.state.pauseReason = reason;
  }

  resume(): void {
    this.state.paused = false;
    this.state.pauseReason = undefined;
  }

  recordExecutionFailure(): void {
    this.state.executionFailures += 1;
    if (this.state.executionFailures >= 5) {
      this.pause("execution_failure_circuit");
    }
  }

  recordAcceptedTrade(conditionId: string, notionalUsd: number): void {
    this.state.sessionNotional += notionalUsd;
    const current = this.state.perMarket.get(conditionId) ?? 0;
    this.state.perMarket.set(conditionId, current + notionalUsd);
  }

  getMarketExposure(conditionId: string): number {
    return this.state.perMarket.get(conditionId) ?? 0;
  }

  getSessionNotional(): number {
    return this.state.sessionNotional;
  }

  updateDailyPnl(delta: number): void {
    this.state.dailyPnlUsd += delta;
    if (this.config.AUTO_PAUSE_ON_DRAWDOWN && this.state.dailyPnlUsd <= -this.config.MAX_DAILY_LOSS_USD) {
      this.pause("max_daily_loss");
    }
  }

  canOpenNewMarket(): boolean {
    return this.state.perMarket.size < this.config.MAX_CONCURRENT_MARKETS;
  }

  snapshot(): RiskState {
    return {
      ...this.state,
      perMarket: new Map(this.state.perMarket),
    };
  }
}
