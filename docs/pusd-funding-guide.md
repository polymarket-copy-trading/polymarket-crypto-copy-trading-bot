# pUSD Funding & CLOB v2 Setup

After Polymarket's **April 28, 2026 CLOB v2** upgrade, collateral is **pUSD** (not USDC.e).

## Funding checklist

1. **Bridge/deposit pUSD** to your Polymarket trading wallet on Polygon.
2. **Approve pUSD** for the CLOB exchange contracts (the bot checks allowance on startup).
3. **Derive L2 API credentials** automatically via `createOrDeriveApiKey()` using EIP-712 `ClobAuth`.
4. Verify with `npm run health` — look for `balanceUsd` and `allowanceOk: true`.

## Wrap flow (API-only traders)

If you hold USDC on Polygon and need pUSD:

1. Use Polymarket's official wrap/deposit UI or relayer v2 (`https://relayer-v2.polymarket.com`).
2. Confirm pUSD balance via health check before live trading.

## V2 order signing reminders

| V1 (deprecated) | V2 (required) |
|-----------------|---------------|
| `nonce`, `feeRateBps`, `taker` in signed struct | `timestamp` (ms), `metadata`, `builder` |
| USDC.e collateral | pUSD collateral |
| `@polymarket/clob-client` | `@polymarket/clob-client-v2` |
| Exchange domain version `"1"` | Exchange domain version `"2"` |

## Builder attribution (optional)

Set `POLY_BUILDER_CODE` in `.env` to attach builder metadata to mirrored orders.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `allowanceOk: false` | Approve pUSD + outcome tokens for exchange |
| Auth failures | Ensure `PRIVATE_KEY` matches Polymarket wallet |
| Zero balance | Deposit/wrap pUSD on Polygon |
| Legacy SDK errors | Remove `@polymarket/clob-client` — use v2 only |
