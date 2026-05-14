# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Node is at `/opt/homebrew/bin/node` and is not on PATH by default — prefix all npm/npx commands:

```bash
PATH=/opt/homebrew/bin:$PATH npm run dev        # Vite dev server on :5174
PATH=/opt/homebrew/bin:$PATH npx tsc --noEmit   # Type-check
PATH=/opt/homebrew/bin:$PATH npm run build      # Production build → dist/
PATH=/opt/homebrew/bin:$PATH npx vercel --prod  # Deploy (static SPA)
```

No backend, no env vars, no test suite.

## Architecture

Pure static React 18 + TypeScript + Vite + Tailwind + Recharts single-page app. No router. All state lives in `App.tsx` and persists to `localStorage` key `pft-v2` via `src/lib/storage.ts`. Each browser holds its own data — sharing the URL just shares the code, not state.

### Two tabs

- **Timeline** (default): forward-looking 24-month cash projection. Top is a Recharts `LineChart` of ending cash per month with the minimum-cash-buffer drawn as a dashed reference line and the area below it shaded rose. Below the chart, one `MonthCard` per month shows chronological events (recurring expenses, credit-card payments, one-offs, income, sells) plus any recommended sells in the right column with Accept buttons.
- **Setup**: stacked editor sections for accounts, recurring expenses, one-offs, credit-card bills, stock holdings, and income/buffer.

### Data model (`src/types.ts`)

`AppState` holds: `accounts`, `lots`, `recurringExpenses`, `oneOffExpenses`, `creditCardBills`, `plannedSells`, `jobStartDate`, `annualIncome`, `filingStatus`, `minimumCashBuffer`. Credit card metadata (due day per card) is a constant `CARD_DUE_DAY` — Amex 16th, Chase 20th.

### Timeline engine (`src/lib/timeline.ts`)

Pure functions:
- `buildEvents(state, today)` — expand recurring, one-offs, credit-card bills, paychecks (monthly from `jobStartDate`, 72% of gross / 12), and accepted `plannedSells` into a flat `TimelineEvent[]` over the next 24 months.
- `project(state, events, today)` — bucket events by month, walk forward with a running balance starting from sum of checking + savings, return `MonthBucket[]` with `belowBuffer` and `shortfall`.
- `scheduleSells(state, today)` — month-by-month, when projected ending cash dips below `minimumCashBuffer`, call `pickLotsForMonth` to choose lots to sell, inject the net proceeds as a synthetic `sell` event on day 1 of that month, then continue. Returns `{ months, recommendedSells, momentumAvailable }`.

### Sell ranking (`src/lib/taxOptimizer.ts`)

`pickLotsForMonth(lots, alreadySold, target, income, filing, asOfMonth)`:
- Per-lot score = `efficiency × (1 + MOMENTUM_WEIGHT × combinedMomentumScore)` where `efficiency = netAfterTax / proceeds` and momentum is the average of 30d and 90d return clamped to ±0.5.
- Sort: losses first (largest absolute loss for harvesting), then descending score.
- `isLongTermAt(purchaseDate, asOfMonth)` makes the LT/ST determination time-aware, so a lot that crosses the 1-year mark mid-projection is correctly LT in later months.
- Constants `MOMENTUM_WEIGHT = 0.5` and `OVERPULL_RATIO = 1.10` (over-pull by 10% so we don't have to sell again next month for trivial amounts) are exported and tunable.

2026 federal LTCG + ordinary-income brackets + PA flat 3.07%. Brackets need annual update.

### Stock prices + momentum (`src/lib/yahoo.ts`, `src/lib/momentum.ts`)

`fetchPrices` returns current prices; `fetchHistories` returns 3-month daily closes from Yahoo's chart API. Browser CORS may block in production — the Refresh Prices button surfaces errors gracefully and lots keep their last fetched values. With no momentum data, the scheduler silently falls back to tax-only ranking (`combinedMomentumScore` returns 0) and the timeline shows a one-line "momentum unavailable" note.

## Adding a new credit card

`CARD_DUE_DAY` and `CARD_LABEL` in `src/types.ts` define the supported cards. To add a third: extend the `CardKey` union, add entries to both maps. `CreditCardBillsEditor` reads from `CARD_DUE_DAY` so it picks up the new card automatically.
