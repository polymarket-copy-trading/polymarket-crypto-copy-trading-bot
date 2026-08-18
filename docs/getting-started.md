# Getting Started — Polymarket Copy Trading Bot

This guide walks through installing and running **Phase 1** (read-only follower with `DRY_RUN` decisions).

## Prerequisites

- Node.js 20+
- Polygon RPC URL
- Polymarket proxy wallet private key (EOA that controls your Polymarket account)
- pUSD collateral for live trading (Phase 2+)

## Install

```bash
git clone https://github.com/YOUR_ORG/polymarket-crypto-copy-trading-bot.git
cd polymarket-crypto-copy-trading-bot
npm install
cp .env.example .env
```

## Configure leaders

Edit `.env`:

```env
LEADER_WALLETS=0xLeaderProxyWallet1,0xLeaderProxyWallet2
DRY_RUN=true
CRYPTO_ONLY=true
PRIVATE_KEY=0x...
RPC_URL=https://polygon-rpc.com
```

Use **proxy wallet addresses** from Polymarket profiles, not signing keys.

## Health check

```bash
npm run health
```

Expected output includes `clobOk: true`, `authOk: true`, and pUSD balance when funded.

## Run Phase 1 bot

```bash
npm run dry-run
```

The bot will:

1. Poll leader trades via Data API
2. Optionally listen on `wss://ws-live-data.polymarket.com`
3. Filter to crypto markets via Gamma metadata
4. Log accept/reject decisions to SQLite
5. **Not** submit live orders while `DRY_RUN=true`

## Dashboard

```bash
npm run dashboard
```

## Next steps

- [pUSD funding guide](./pusd-funding-guide.md)
- [Leader selection for crypto markets](./crypto-leader-selection.md)
- [DRY_RUN → LIVE checklist](./dry-run-to-live-checklist.md)
- [FAQ](./faq.md)
