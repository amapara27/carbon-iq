# CarbonIQ

CarbonIQ is a full-stack sustainability project built around a Solana wallet identity. It ingests transaction history (uploaded or demo), estimates CO2e emissions per transaction, computes a Green Score, and uses that score to shape staking outcomes. The platform also exposes an offset flow that records proof-of-impact on Solana devnet through an Anchor program. Wallet state, recommendations, stake snapshots, and leaderboard data are persisted in MongoDB and restored on reload.

## What It Currently Does

- Wallet-based app with pages for Dashboard, Staking, Swaps, and Leaderboard.
- Upload or preset-connect transactions through `/api/demo/connect-bank`.
- Analyze transaction emissions via category rules and optional Climatiq spend-based estimates.
- Compute/persist Green Score with component breakdown and behavior penalties.
- Generate swap suggestions (template or OpenAI-backed recommender) and persist adoption actions.
- Simulate stake outcomes, execute stake flows (Marinade, wallet-signed, or demo transfer fallback), collect yield, and withdraw principal.
- Trigger and record offset actions, including Solana proof PDA updates and stored impact history.
- Serve leaderboard rankings and Metaplex-compatible impact NFT metadata.

Note: the offset flow is API-complete, but there is no dedicated offset page in the current web UI.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌──────────────────┐
│   /web      │────▶│   /api      │────▶│   /anchor        │
│ React +     │     │ Express +   │     │ Solana Program   │
│ Vite        │     │ TypeScript  │     │ (Rust/Anchor)    │
└─────────────┘     └─────────────┘     └──────────────────┘
```

## Repo Layout

- `web/` React 19 + Vite frontend (wallet connect, dashboard, staking, swaps, leaderboard).
- `api/` Express TypeScript backend with route validation from `@carboniq/contracts`.
- `contracts/` Shared Zod schemas/types/constants used by both web and API.
- `anchor/` Solana program (`record_impact`, `update_impact`) and Anchor tests.
- `demo/` Synthetic transaction datasets used by demo upload/preset flows.

## Local Development

### Prerequisites

- Node.js 20+ and npm.
- A MongoDB connection string (`MONGODB_URI` or `DATABASE_URL`) for persisted state.
- Optional for on-chain actions: Solana devnet RPC + payer/vault keys.
- Optional for Anchor program work: Rust + Solana CLI + Anchor CLI.

### 1) Build shared contracts

```bash
cd contracts
npm install
npm run build
```

### 2) Configure and run API

```bash
cd ../api
npm install
cp .env.example .env
# edit .env (at minimum set MONGODB_URI or DATABASE_URL)
npm run dev
```

API runs on `http://localhost:4000`.

### 3) Run frontend

```bash
cd ../web
npm install
npm run dev
```

Web runs on `http://localhost:3000` and proxies `/api/*` to `http://localhost:4000`.

## Key Environment Variables (`api/.env`)

### Required for persisted app behavior

- `MONGODB_URI` (recommended) or `DATABASE_URL` (fallback).
- `FRONTEND_URL` for CORS (`.env.example` uses `http://localhost:5173`; API runtime fallback is `http://localhost:3000` if unset).

### Required for Solana on-chain stake/offset execution

- `SOLANA_RPC_URL`
- `SOLANA_PROGRAM_ID`
- `SOLANA_PAYER_SECRET_KEY`
- `SOLANA_STAKING_VAULT_ADDRESS`

### Optional stake behavior flags

- `SOLANA_STAKING_PROVIDER=marinade|demo|jito` (jito path is currently not implemented and will error or fallback).
- `SOLANA_STAKING_FALLBACK_TO_DEMO=true|false`
- `SOLANA_STAKING_VAULT_SECRET_KEY`
- `MARINADE_HARDCODED_APY`
- `STAKING_PROTOCOL_APY_WINDOW_DAYS`

### Optional AI/estimation providers

- OpenAI recommender: `OPENAI_API_KEY` + `CARBONIQ_USE_OPENAI_RECOMMENDER=true`
- Climatiq emissions: `CLIMATIQ_API_KEY` + `CARBONIQ_USE_CLIMATIQ_EMISSIONS=true`

## API Surface (Current)

- `GET /api/health`
- `POST /api/demo/connect-bank`
- `POST /api/analyze-transactions`
- `GET /api/green-score`
- `GET /api/wallet-state`
- `GET /api/swap-suggestions`
- `POST /api/recommendation-actions`
- `POST /api/trigger-offset`
- `POST /api/record-offset`
- `GET /api/staking-info`
- `POST /api/simulate-stake`
- `POST /api/simulate-stake-timeline`
- `POST /api/stake`
- `POST /api/stake/collect`
- `POST /api/stake/withdraw`
- `GET /api/leaderboard`
- `GET /api/nft-metadata`

## Useful Validation Commands

```bash
# Shared types/schemas
cd contracts && npm run build

# API compile + tests
cd ../api && npm run build && npm test

# Frontend compile
cd ../web && npm run build

# Anchor compile tests
cd ../anchor && cargo test -p carbon-iq --lib
```

## License

MIT
