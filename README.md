# 🌱 CarbonIQ — Sustainability on Solana

**Track your carbon footprint. Stake green. Earn impact.**

CarbonIQ is a Solana-based sustainability platform that analyzes on-chain transactions for environmental impact, rewards eco-conscious behavior with boosted staking yields, and records verifiable proofs of carbon offsets on-chain.

---

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌──────────────────┐
│   /web      │────▶│   /api      │────▶│   /anchor        │
│   React +   │     │   Express + │     │   Solana Program │
│   Vite      │     │   Prisma    │     │   (Rust)         │
└─────────────┘     └─────────────┘     └──────────────────┘
```

## Quick Start

```bash
# 1. Install dependencies
cd web && npm install
cd ../api && npm install

# 2. Start the API server
cd api && cp .env.example .env && npm run dev

# 3. Start the frontend (in another terminal)
cd web && npm run dev

# 4. (Optional) Build the Anchor program
cd anchor && anchor build
```

## Tech Stack

| Layer      | Technology                                         |
|------------|----------------------------------------------------|
| Frontend   | React 19, Vite, TypeScript, Tailwind CSS, Recharts |
| Auth       | Clerk + Solana Wallet Adapter                      |
| Blockchain | Solana (Anchor 0.30, Rust)                         |
| Backend    | Express.js, Prisma ORM, Zod                        |
| Database   | SQLite (dev) → PostgreSQL (prod)                   |

## License

MIT