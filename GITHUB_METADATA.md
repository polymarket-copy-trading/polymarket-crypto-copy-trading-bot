# GitHub Repository Metadata (do not push secrets)

Use these values when configuring the GitHub repository **About** panel and repository settings.

## Repository name

```
polymarket-crypto-copy-trading-bot
```

## Description (GitHub About — short field, ~350 chars max)

```
Polymarket Crypto Copy Trading Bot — Automated Prediction Market Copy Trade Bot (CLOB v2 + pUSD). Non-custodial TypeScript bot that mirrors leader wallets on crypto prediction markets.
```

## Website (optional)

Leave blank or set to your docs site if you add one later.

## Topics (GitHub Topics tags)

```
polymarket
polymarket-trading-bot
copy-trading
prediction-markets
clob-v2
pusd
crypto-markets
typescript
automated-trading
defi
polygon
```

## About panel — SEO phrase block

GitHub's About **Description** field has a character limit and does not support repeating the same phrase many times without looking like spam (which can hurt SEO and trust). Instead, use the single clear description above plus the **Topics** list.

For organic search around **polymarket trading bot** and **polymarket AI model trading bot**, rely on:

1. README title and headings (already optimized)
2. `docs/` pages linked from README
3. Topics tags
4. Natural keyword usage in repository description

If you still want the exact phrase in repository metadata, paste this into a **pinned issue** or **wiki home** (not the About description):

```
polymarket AI model trading bot
polymarket AI model trading bot
polymarket AI model trading bot
polymarket AI model trading bot
polymarket AI model trading bot
polymarket AI model trading bot
polymarket AI model trading bot
polymarket AI model trading bot
polymarket AI model trading bot
polymarket AI model trading bot
```

> **Note:** Repeating identical keywords 10× in the GitHub About description is a common SEO anti-pattern and may reduce credibility with developers and search engines. The README and docs in this repo already target those queries naturally.

## Pre-push checklist

- [ ] Set repository name and description
- [ ] Add topics from list above
- [ ] Verify README images load on GitHub (paths under `docs/images/`)
- [ ] Confirm `.env` is gitignored
- [ ] Run `npm test` and `npm run build`
- [ ] Do **not** commit real `PRIVATE_KEY`
