# FAQ — Polymarket Trading Bot

## Is this a Polymarket trading bot for crypto markets only?

Yes. With `CRYPTO_ONLY=true` (default), the bot mirrors leader trades **only** when Gamma metadata indicates crypto-related prediction markets (BTC, ETH, ETF, regulation, etc.).

## Does this use CLOB v2 and pUSD?

Yes. The project targets production endpoints after the April 28, 2026 upgrade and uses `@polymarket/clob-client-v2` with pUSD collateral.

## Is my private key custodied?

No. This is **non-custodial** — your key signs orders locally from `.env`.

## Why are some leader trades rejected?

Every rejection includes a reason code, e.g. `MARKET_NOT_CRYPTO`, `SESSION_CAP`, `SLIPPAGE_EXCEEDED`. Run `npm run dashboard` to inspect counts.

## Can I run without websockets?

Set `USE_WEBSOCKET=false` — the bot falls back to Data API polling via `POLL_INTERVAL_MS`.

## Does Phase 1 place real orders?

No. Phase 1 logs DRY_RUN decisions only. Live execution arrives in Phase 2.

## How do I export trade history?

```bash
npm run export:history
```

## Where is historical backfill?

Disabled by default (`BACKFILL_HISTORICAL=false`). The bot copies signals **after startup** to avoid accidental bulk mirroring.

## Websocket disconnects?

The live-data detector reconnects with exponential backoff + jitter and deduplicates signals to prevent double-copy.

## Contact

See the README — the developer welcomes discussion and collaboration.
