# Crypto Leader Wallet Selection

Copy trading quality depends heavily on **who you follow**. This bot scopes mirroring to **crypto prediction markets only** — but you still want leaders with edge in BTC, ETH, ETF, regulation, and macro crypto events.

## Where to find leaders

1. **Polymarket crypto category** — sort by volume and recent activity.
2. **Data API** — query `/trades` on active BTC/ETH markets and note recurring profitable proxy wallets.
3. **Public profiles** — verify history across multiple resolved crypto markets.

## Evaluation criteria

| Signal | Why it matters |
|--------|----------------|
| Crypto market concentration | Aligns with `CRYPTO_ONLY=true` filter |
| Resolved market track record | Avoid one-lucky-bet wallets |
| Trade frequency | Too high → cap exhaustion; too low → idle capital |
| Average hold time | Match your risk horizon |
| Slippage sensitivity | Large size leaders may not mirror well at small caps |

## Recommended `.env` starting point

```env
LEADER_WALLETS=0xSingleLeaderToStart
POSITION_MULTIPLIER=0.25
MAX_TRADE_USD=25
MIN_TRADE_USD=5
COPY_SELLS=false
DRY_RUN=true
```

Run for several sessions in DRY_RUN, review reject reasons via `npm run dashboard`, then add leaders incrementally.

## Multi-leader tips

- Stagger leaders with different specialties (BTC price vs regulation vs L2 adoption).
- Watch `MAX_SESSION_NOTIONAL` and `MAX_PER_MARKET_NOTIONAL` when scaling.
