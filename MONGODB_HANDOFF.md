# CarbonIQ MongoDB Data Model Handoff

## 1) Goal

We need MongoDB storage keyed by wallet so we can show:

1. How much a user has staked
2. Current yield
3. Green score and yield boost
4. Past products/transactions and sustainability
5. Product recommendations routed from LLMs
6. Fast lookup by wallet address

This spec is implementation-ready for an agent.

---

## 2) Core Design Rules

1. Use `walletAddress` as the primary user key in all user-scoped collections.
2. Keep append-only event history for stakes, offsets, transactions, and recommendations.
3. Keep one current-state profile doc for fast dashboard reads.
4. Use UTC ISO timestamps for all time fields.
5. Never store private keys or wallet seed phrases.

---

## 3) Collections

## 3.1 `users` (current profile/read model)

**Purpose:** Fast read for dashboard and staking summary.

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Primary key |
| `walletAddress` | string | Unique |
| `greenScoreCurrent` | number | 0-100 |
| `greenTierCurrent` | string | seedling/sprout/tree/forest/earth_guardian |
| `greenScoreBreakdownCurrent` | object | transactionEfficiency, spendingHabits, carbonOffsets, communityImpact |
| `stakingSnapshot` | object | baseApy, greenBonus, effectiveApy, stakedAmount, accruedYield, stakeVaultAddress, updatedAt |
| `totals` | object | totalCo2eOffset, offsetCount |
| `createdAt` | date | |
| `updatedAt` | date | |

---

## 3.2 `stake_records` (staking history)

**Purpose:** Source of truth for stake history and staking aggregates.

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `walletAddress` | string | Indexed |
| `amount` | number | SOL |
| `durationDays` | number | |
| `greenScoreAtStake` | number | |
| `effectiveApy` | number | |
| `estimatedYield` | number | |
| `solanaTxHash` | string/null | Unique when present |
| `vaultAddress` | string/null | Destination account |
| `status` | string | simulated/confirmed/failed |
| `provider` | string | marinade/demo/jito/wallet_signed |
| `createdAt` | date | |

---

## 3.3 `impact_records` (offset history)

**Purpose:** Carbon offset events and on-chain proof tracking.

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `walletAddress` | string | Indexed |
| `co2OffsetGrams` | number | |
| `creditType` | string | renewable_energy/forestry/etc |
| `toucanTxHash` | string/null | |
| `onChainTxHash` | string/null | Unique when present |
| `proofPda` | string/null | |
| `status` | string | pending/purchased/recorded_on_chain/failed |
| `decisionContext` | object/null | budgetUsd, pricePerTonneUsd, projectName, verificationStandard |
| `recordedAt` | date | |

---

## 3.4 `transactions` (past products + sustainability)

**Purpose:** Persist analyzed transaction/product history with sustainability metadata.

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `walletAddress` | string | Indexed |
| `transactionId` | string | Unique per wallet |
| `description` | string | “product/purchase” text |
| `amountUsd` | number | |
| `mccCode` | string/null | |
| `date` | date | Transaction date |
| `category` | string | transportation/food_dining/etc |
| `emissionFactor` | number | |
| `co2eGrams` | number | |
| `source` | string | seeded/preset/upload/plaid |
| `sourceLabel` | string/null | preset:sustainable, upload, etc |
| `analyzedAt` | date | |

---

## 3.5 `recommendation_runs` (LLM outputs)

**Purpose:** Persist recommendation batches returned to users.

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `walletAddress` | string | Indexed |
| `categoriesRequested` | string[] | Optional filter used |
| `suggestions` | object[] | currentCategory, currentDescription, alternativeDescription, co2 metrics, priceDifferenceUsd, difficulty |
| `totalPotentialSavingsMonthly` | number | |
| `narratorProvider` | string | openai/template |
| `model` | string/null | LLM model used |
| `promptHash` | string/null | For replay/cache/debug |
| `createdAt` | date | |

---

## 3.6 `recommendation_actions` (user feedback)

**Purpose:** Persist UI actions like “Mark Adopted”.

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `walletAddress` | string | Indexed |
| `recommendationRunId` | ObjectId | Ref to `recommendation_runs` |
| `suggestionKey` | string | Deterministic identifier |
| `action` | string | adopted/unadopted |
| `actedAt` | date | |

---

## 3.7 `protocol_rate_snapshots` (APY source data)

**Purpose:** Keep historical protocol rates used to compute base APY.

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `provider` | string | marinade |
| `metric` | string | msol_price |
| `value` | number | |
| `capturedAt` | date | |

---

## 4) Index Plan

Create these indexes:

1. `users`: `{ walletAddress: 1 }` unique
2. `stake_records`: `{ walletAddress: 1, status: 1, createdAt: -1 }`
3. `stake_records`: `{ solanaTxHash: 1 }` unique, partial where `solanaTxHash` exists
4. `impact_records`: `{ walletAddress: 1, status: 1, recordedAt: -1 }`
5. `impact_records`: `{ onChainTxHash: 1 }` unique, partial where `onChainTxHash` exists
6. `impact_records`: `{ proofPda: 1 }`
7. `transactions`: `{ walletAddress: 1, date: -1 }`
8. `transactions`: `{ walletAddress: 1, category: 1, date: -1 }`
9. `transactions`: `{ walletAddress: 1, transactionId: 1 }` unique
10. `recommendation_runs`: `{ walletAddress: 1, createdAt: -1 }`
11. `recommendation_actions`: `{ walletAddress: 1, actedAt: -1 }`
12. `recommendation_actions`: `{ recommendationRunId: 1 }`
13. `protocol_rate_snapshots`: `{ provider: 1, metric: 1, capturedAt: -1 }`

---

## 5) Query Mapping To Product Requirements

1. **How much user has staked:** sum `stake_records.amount` for `walletAddress` where `status=confirmed` and `solanaTxHash != null`.
2. **Current yield:** sum `stake_records.estimatedYield` for same confirmed set, or read `users.stakingSnapshot.accruedYield`.
3. **Green score + yield boost:** `users.greenScoreCurrent` + `users.stakingSnapshot.greenBonus/effectiveApy`.
4. **Past products and sustainability:** `transactions` by wallet, sorted by `date desc`, with `category`, `co2eGrams`, `emissionFactor`.
5. **LLM recommendations:** latest docs in `recommendation_runs`, plus adoption state from `recommendation_actions`.
6. **Wallet-indexed access:** all key collections include indexed `walletAddress`.

---

## 6) Additional “Should Store” Items Found In Codebase

1. Recommendation run metadata (`narratorProvider`, `model`, `promptHash`) for reproducibility/debug.
2. Recommendation adoption actions (currently UI-only state).
3. Protocol APY snapshots used to compute staking base APY.
4. Source metadata for transactions (`seeded/preset/upload/plaid`) for analytics and debugging.
5. Optional offset decision context for auditability of `/trigger-offset`.

---

## 7) Migration Notes

1. Existing SQL `User`, `StakeRecord`, and `ImpactRecord` map directly to `users`, `stake_records`, and `impact_records`.
2. Existing SQL `TransactionAnalysis` appears underused in current API flow; move sustainability transaction history to `transactions` instead.
3. Keep response contracts unchanged while swapping storage backend.

---

## 8) Acceptance Checklist

1. Dashboard can fetch current score, APY, staked amount, accrued yield in one wallet lookup path.
2. Swaps page can fetch recommendations and preserve recommendation history across restarts.
3. Past transactions page can render analyzed products with category and CO2 fields.
4. Leaderboard/NFT calculations can be computed from `users` + `impact_records`.
5. All wallet-scoped endpoints perform indexed reads by `walletAddress`.
