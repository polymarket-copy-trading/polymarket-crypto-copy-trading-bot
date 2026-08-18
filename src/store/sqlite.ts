import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { RejectReasonCode } from "../engine/validate.js";

export interface StoredSignal {
  id: string;
  leader: string;
  conditionId: string;
  side: string;
  notionalUsd: number;
  status: "accepted" | "rejected" | "dry_run";
  reason?: RejectReasonCode | string;
  sizedUsd?: number;
  source: string;
  createdAt: number;
}

export class StateStore {
  private readonly db: Database.Database;

  constructor(databasePath: string) {
    mkdirSync(dirname(databasePath), { recursive: true });
    this.db = new Database(databasePath);
    this.db.pragma("journal_mode = WAL");
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS signals (
        id TEXT PRIMARY KEY,
        leader TEXT NOT NULL,
        condition_id TEXT NOT NULL,
        side TEXT NOT NULL,
        notional_usd REAL NOT NULL,
        status TEXT NOT NULL,
        reason TEXT,
        sized_usd REAL,
        source TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS session_stats (
        key TEXT PRIMARY KEY,
        value REAL NOT NULL
      );

      CREATE TABLE IF NOT EXISTS reject_counts (
        reason TEXT PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 0
      );
    `);
  }

  recordSignal(row: StoredSignal): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO signals
         (id, leader, condition_id, side, notional_usd, status, reason, sized_usd, source, created_at)
         VALUES (@id, @leader, @conditionId, @side, @notionalUsd, @status, @reason, @sizedUsd, @source, @createdAt)`,
      )
      .run({
        ...row,
        reason: row.reason ?? null,
        sizedUsd: row.sizedUsd ?? null,
      });

    if (row.reason) {
      this.db
        .prepare(
          `INSERT INTO reject_counts (reason, count) VALUES (?, 1)
           ON CONFLICT(reason) DO UPDATE SET count = count + 1`,
        )
        .run(row.reason);
    }
  }

  getSessionStat(key: string): number {
    const row = this.db.prepare("SELECT value FROM session_stats WHERE key = ?").get(key) as { value: number } | undefined;
    return row?.value ?? 0;
  }

  setSessionStat(key: string, value: number): void {
    this.db
      .prepare(
        `INSERT INTO session_stats (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      )
      .run(key, value);
  }

  incrementSessionStat(key: string, delta: number): void {
    this.setSessionStat(key, this.getSessionStat(key) + delta);
  }

  recentSignals(limit = 20): StoredSignal[] {
    return this.db
      .prepare(
        `SELECT id, leader, condition_id as conditionId, side, notional_usd as notionalUsd,
                status, reason, sized_usd as sizedUsd, source, created_at as createdAt
         FROM signals ORDER BY created_at DESC LIMIT ?`,
      )
      .all(limit) as StoredSignal[];
  }

  rejectSummary(): Array<{ reason: string; count: number }> {
    return this.db.prepare("SELECT reason, count FROM reject_counts ORDER BY count DESC").all() as Array<{
      reason: string;
      count: number;
    }>;
  }

  exportJson(): StoredSignal[] {
    return this.db
      .prepare(
        `SELECT id, leader, condition_id as conditionId, side, notional_usd as notionalUsd,
                status, reason, sized_usd as sizedUsd, source, created_at as createdAt
         FROM signals ORDER BY created_at ASC`,
      )
      .all() as StoredSignal[];
  }

  close(): void {
    this.db.close();
  }
}
