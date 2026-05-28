# Phemex AI Optimized Trading Bot

Production-grade **Phemex USDT-M perpetual futures trading bot** written in TypeScript. Combines **AI-driven market analysis** (RSI, EMA, MACD, ATR, Bollinger Bands) with **adaptive grid optimization** to automatically adjust grid bounds, level count, and order sizing based on real-time market conditions.

---

## Features

| Feature | Description |
|---------|-------------|
| **AI signal engine** | Multi-indicator analysis with bullish/bearish/neutral bias scoring |
| **Adaptive grid** | Dynamic bounds, levels, and order size based on volatility regime |
| **Grid modes** | Arithmetic (equal steps) or geometric (equal % steps) — auto-selected by AI |
| **Auto-rebalance** | On fill: buy → place sell one level up; sell → place buy one level down |
| **Regime reoptimization** | Periodic AI re-analysis; redeploys grid on significant market shifts |
| **Risk controls** | Max quote exposure, order size validation, stop-loss / take-profit |
| **Dry run** | Full simulation without sending orders to the exchange |
| **CLI toolkit** | `analyze`, `simulate`, `status`, `ping`, `start` commands |
| **Type-safe** | Zod config validation, strict TypeScript, comprehensive test suite |

---

## Project structure

```
Phemex-AI-optimized-trading-bot/
├── src/
│   ├── api/phemex/           # Phemex REST client, HMAC auth, product registry
│   ├── ai/                   # Indicators, signal engine, adaptive optimizer
│   ├── config/               # Environment & Zod validation
│   ├── strategies/ai-grid/   # AI grid engine, levels, order manager
│   ├── services/             # Logger, risk manager, market data
│   ├── utils/                # Decimal math, retry, UUID helpers
│   ├── index.ts              # Main entry (long-running bot)
│   └── cli.ts                # CLI commands
├── tests/                    # Unit & integration tests
├── .env.example
├── package.json
└── README.md
```

---

## Requirements

- **Node.js** 20 or later
- **Phemex API key** with USDT-M futures trade permissions
- Sufficient margin on your Phemex account

---

## Quick start

```bash
cd Phemex-AI-optimized-trading-bot
npm install
cp .env.example .env
```

Edit `.env` with your Phemex credentials and trading parameters.

### Test API connectivity

```bash
npm run cli -- ping
```

### Run AI market analysis (no trading)

```bash
npm run cli -- analyze
```

### Preview AI-optimized grid (no live orders)

```bash
npm run cli -- simulate
```

### Dry run (simulated orders, no exchange writes)

```bash
npm run cli -- start --dry-run
```

### Start bot (live trading)

```bash
npm run build
npm start
```

Or for development:

```bash
npm run dev
```

---

## Configuration

Copy `.env.example` to `.env` and set:

| Variable | Description |
|----------|-------------|
| `PHEMEX_API_KEY` | API key from Phemex |
| `PHEMEX_API_SECRET` | API secret (Base64-encoded from Phemex) |
| `PHEMEX_BASE_URL` | `https://api.phemex.com` or testnet URL |
| `PHEMEX_SYMBOL` | Pair, e.g. `BTCUSDT` |
| `GRID_MODE` | `arithmetic` or `geometric` (AI may override) |
| `GRID_LOWER_PRICE` | Initial grid floor price |
| `GRID_UPPER_PRICE` | Initial grid ceiling price |
| `GRID_LEVELS` | Number of price levels (2–200) |
| `GRID_ORDER_SIZE` | Base order size (contracts) |
| `POS_SIDE` | `Merged` (one-way), `Long`, or `Short` (hedge mode) |
| `AI_ENABLED` | Enable AI optimization (`true`/`false`) |
| `AI_REOPTIMIZE_INTERVAL_MS` | How often to re-run AI analysis (default 300000) |
| `AI_RSI_PERIOD` | RSI lookback period (default 14) |
| `AI_EMA_FAST` / `AI_EMA_SLOW` | EMA periods for trend detection |
| `AI_ATR_PERIOD` | ATR period for volatility measurement |
| `AI_MIN_CONFIDENCE` | Minimum signal confidence (0–1) |
| `MAX_QUOTE_EXPOSURE` | Optional max USDT exposure |
| `STOP_LOSS_PRICE` | Optional stop-loss trigger price |
| `TAKE_PROFIT_PRICE` | Optional take-profit trigger price |
| `POLL_INTERVAL_MS` | Order sync interval (default 5000) |
| `DRY_RUN` | Set `true` to simulate without live orders |

---

## How AI grid trading works

1. **Analyze**: Fetch hourly klines and compute RSI, EMA, MACD, ATR, and Bollinger Bands.
2. **Signal**: Score market bias (-100 bearish to +100 bullish) with confidence level.
3. **Optimize**: Adjust grid bounds to ATR-based range, shift for trend bias, scale levels for volatility.
4. **Deploy**: Place buy limits below price and sell limits above on each grid level.
5. **Rebalance**: On each fill, place the counter-order at the adjacent level.
6. **Reoptimize**: Periodically re-analyze; redeploy grid if market regime shifts significantly.

```
Price →
  SELL @ 66k ─────────────
  SELL @ 65.5k ──────────
  ─── current ~ 65k ───   ← AI adjusts bounds dynamically
  BUY  @ 64.5k ──────────
  BUY  @ 64k ────────────
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled bot |
| `npm run dev` | Run with `tsx` (development) |
| `npm run cli -- ping` | Test Phemex API connectivity |
| `npm run cli -- analyze` | Run AI market analysis |
| `npm run cli -- simulate` | Preview AI-optimized grid |
| `npm run cli -- status` | Show live ticker |
| `npm run cli -- start --dry-run` | Start in dry-run mode |
| `npm test` | Run test suite |
| `npm run lint` | Typecheck without emit |

---

## Safety

- Always test with `--dry-run` first before live trading.
- Grid bots perform best in range-bound markets; strong trends can cause losses.
- Set `MAX_QUOTE_EXPOSURE` to cap downside.
- Use `STOP_LOSS_PRICE` and `TAKE_PROFIT_PRICE` for automated exit rules.
- Never commit `.env` or share API keys.
- Consider using Phemex testnet (`https://testnet-api.phemex.com`) for initial testing.

---

## License

MIT

---

## Technical support

> ### Need help?
>
> For setup, configuration, bugs, or trading-bot support, contact us on Telegram:
>
> # [@tradingtermin](https://t.me/tradingtermin)
>
> **Telegram:** [@tradingtermin](https://t.me/tradingtermin)

**Support contact (Telegram):** [**@tradingtermin**](https://t.me/tradingtermin)
