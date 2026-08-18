# Security Policy

## Key handling

- Store `PRIVATE_KEY` only in local `.env` or a secrets manager — never commit it.
- The bot signs orders locally (non-custodial). No private keys are sent to Polymarket servers.
- CLOB L2 API credentials are derived from your wallet via EIP-712 `ClobAuth` and cached in memory only.
- Structured logs redact `PRIVATE_KEY`, API secrets, and passphrases automatically.

## Operational guidance

1. Start with `DRY_RUN=true` until signal filtering and sizing behave as expected.
2. Fund with small pUSD amounts before enabling live execution (Phase 2+).
3. Set conservative `MAX_TRADE_USD`, `MAX_SESSION_NOTIONAL`, and `MAX_DAILY_LOSS_USD`.
4. Rotate API credentials if a machine is compromised.
5. Run `npm run audit:deps` regularly and apply security patches.

## Reporting vulnerabilities

If you discover a security issue, please open a private GitHub security advisory or contact the maintainer via the Telegram link in the README. Do not disclose exploit details publicly before a fix is available.

## Network endpoints

This project targets **production CLOB v2** endpoints only:

- `https://clob.polymarket.com`
- `https://gamma-api.polymarket.com`
- `https://data-api.polymarket.com`

Legacy V1 SDK packages (`@polymarket/clob-client`, `py-clob-client`) must not be used.
