# DRY_RUN → LIVE Rollout Checklist

## Phase 1 — Read-only (current)

- [x] Leader detection (Data API + optional live WS)
- [x] Crypto market filter
- [x] Signal validation with explicit reject codes
- [x] DRY_RUN execution logging
- [x] SQLite audit trail + CLI dashboard

## Before LIVE (Phase 2)

- [ ] At least 48h DRY_RUN with expected accept/reject ratios
- [ ] Health check passes: RPC latency, CLOB auth, pUSD balance, allowances
- [ ] `MAX_TRADE_USD` set to amount you can afford to lose per signal
- [ ] `MAX_DAILY_LOSS_USD` and `AUTO_PAUSE_ON_DRAWDOWN=true`
- [ ] `COPY_SELLS` policy decided (default `false`)
- [ ] Leader wallets re-verified on crypto markets only
- [ ] Dependency audit: `npm run audit:deps`

## Go-live sequence

1. Set `DRY_RUN=false`
2. Start with **one leader** and **minimum size**
3. Monitor `npm run dashboard` and structured logs
4. Export history: `npm run export:history`
5. Scale `POSITION_MULTIPLIER` gradually

## Rollback

Set `DRY_RUN=true` and restart — bot stops submitting orders immediately (Phase 2 execution respects this flag).
