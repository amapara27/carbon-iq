# CarbonIQ

**🏆 1st Place Winner - Innovation Hacks (Sustainability Track)**

## About

CarbonIQ is a full-stack sustainability platform built around a Solana wallet identity. It empowers users to understand, manage, and mitigate the environmental footprint of their real-world activity. 

By ingesting fiat transaction history (such as credit card statements or bank uploads), CarbonIQ estimates CO2e emissions per purchase and computes a dynamic **Green Score**. This score isn't just for show—it directly shapes staking outcomes and yield opportunities. The platform also features a complete offset flow, allowing users to take climate action and record their verifiable proof-of-impact on the Solana devnet through a custom Anchor program. All wallet states, AI-driven recommendations, stake snapshots, and leaderboard rankings are persistently stored and restored via MongoDB.

## Problem Solved (Sustainability Track)

While many web3 sustainability tools focus solely on blockchain energy consumption, an individual's actual carbon footprint is largely driven by everyday real-world purchases. Currently, eco-conscious users lack an integrated way to bridge their fiat spending habits with web3 climate action and DeFi rewards.

**CarbonIQ solves this by:**
1. **Bridging Off-Chain to On-Chain:** Translating everyday credit card and bank transactions into understandable CO2e emission metrics using category rules and Climatiq spend-based estimates.
2. **Incentivizing Green Behavior:** Tying a user's fiat-derived "Green Score" to tangible decentralized finance (DeFi) outcomes, such as Solana staking yields. 
3. **Providing Verifiable Impact:** Using Solana's speed and low cost to mint immutable proof-of-impact state directly on-chain for offsets, preventing double-counting and greenwashing.

## Use Cases

* **Eco-Conscious Web3 Users:** Individuals who want to track the emissions of their everyday spending, offset their footprint, and earn competitive yields through sustainable staking options (like Marinade).
* **DeFi Protocols & DAOs:** Communities that want to integrate a real-world "Green Score" into their governance weight, airdrop eligibility, or yield distribution to reward sustainable participants.
* **Climate Tech Integrators:** Developers looking for a reference architecture on how to bridge off-chain carbon estimation APIs (Climatiq/OpenAI) with on-chain Anchor programs.

---

## Architecture

CarbonIQ bridges off-chain data processing with on-chain state execution. 

```text
┌─────────────┐     ┌─────────────┐     ┌──────────────────┐
│   /web      │────▶│   /api      │────▶│   /anchor        │
│ React +     │     │ Express +   │     │ Solana Program   │
│ Vite        │     │ TypeScript  │     │ (Rust/Anchor)    │
└─────────────┘     └─────────────┘     └──────────────────┘
      │                    │                     │
      ▼                    ▼                     ▼
 Wallet Auth         MongoDB State       On-Chain Impact PDA
```

---

## What It Currently Does

- **Frontend Application:** Wallet-based React app featuring pages for the Dashboard, Staking, Swaps, and a global Leaderboard. *(Note: the offset flow is API-complete, but there is no dedicated offset page in the current web UI).*
- **Data Ingestion:** Upload credit card statements or preset-connect bank transactions through `/api/demo/connect-bank`.
- **Emission Analysis:** Analyze fiat transaction emissions via specific category rules and optional Climatiq spend-based estimates.
- **Green Score Engine:** Compute and persist a Green Score with a detailed component breakdown and behavior penalties based on spending habits.
- **Smart Recommendations:** Generate eco-friendly swap suggestions using templates or an OpenAI-backed recommender, and track user adoption actions.
- **DeFi Staking:** Simulate stake outcomes, execute live stake flows (Marinade, wallet-signed, or demo transfer fallback), collect yield, and withdraw principal.
- **On-Chain Offsets:** Trigger and record offset actions, updating Solana proof PDAs and storing historical impact.
- **Gamification:** Serve leaderboard rankings and Metaplex-compatible impact NFT metadata.

## Repo Layout

- `web/` — React 19 + Vite frontend (wallet connect, dashboard, staking, swaps, leaderboard).
- `api/` — Express TypeScript backend with strict route validation utilizing `@carboniq/contracts`.
- `contracts/` — Shared Zod schemas, types, and constants utilized by both the web and API layers.
- `anchor/` — Solana program (`record_impact`, `update_impact`) and Anchor tests.
- `demo/` — Synthetic transaction datasets used by demo upload and preset flows.

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
