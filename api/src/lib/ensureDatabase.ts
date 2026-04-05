import { prisma } from "./prisma.js";

let ensured = false;

type SqliteColumnInfo = {
  name: string;
};

export async function ensureDatabaseSchema(): Promise<void> {
  if (ensured) {
    return;
  }

  await prisma.$executeRawUnsafe("PRAGMA foreign_keys = ON");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "walletAddress" TEXT NOT NULL,
      "greenScore" INTEGER NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "User_walletAddress_key"
    ON "User"("walletAddress")
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TransactionAnalysis" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "signature" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "computeUnits" INTEGER NOT NULL,
      "estimatedCO2" REAL NOT NULL,
      "transactionType" TEXT NOT NULL,
      "analyzedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "TransactionAnalysis_signature_key"
    ON "TransactionAnalysis"("signature")
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ImpactRecord" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "co2OffsetGrams" INTEGER NOT NULL,
      "creditType" TEXT NOT NULL DEFAULT 'forestry',
      "toucanTxHash" TEXT,
      "onChainTxHash" TEXT,
      "proofPda" TEXT,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "StakeRecord" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "amount" REAL NOT NULL,
      "durationDays" INTEGER NOT NULL,
      "greenScore" INTEGER NOT NULL,
      "effectiveApy" REAL NOT NULL,
      "estimatedYield" REAL NOT NULL,
      "solanaTxHash" TEXT,
      "vaultAddress" TEXT,
      "status" TEXT NOT NULL DEFAULT 'simulated',
      "simulatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    )
  `);
  const existingStakeColumns = new Set(
    (
      (await prisma.$queryRawUnsafe(
        `PRAGMA table_info("StakeRecord")`
      )) as SqliteColumnInfo[]
    ).map((column) => column.name)
  );
  if (!existingStakeColumns.has("solanaTxHash")) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "StakeRecord" ADD COLUMN "solanaTxHash" TEXT`
    );
  }
  if (!existingStakeColumns.has("vaultAddress")) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "StakeRecord" ADD COLUMN "vaultAddress" TEXT`
    );
  }
  if (!existingStakeColumns.has("status")) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "StakeRecord" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'simulated'`
    );
  }
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "StakeRecord_solanaTxHash_key"
    ON "StakeRecord"("solanaTxHash")
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ProtocolRateSnapshot" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "provider" TEXT NOT NULL,
      "metric" TEXT NOT NULL,
      "value" REAL NOT NULL,
      "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ProtocolRateSnapshot_provider_metric_capturedAt_idx"
    ON "ProtocolRateSnapshot"("provider", "metric", "capturedAt")
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "UserBehaviorState" (
      "userId" TEXT NOT NULL PRIMARY KEY,
      "irresponsibleStreak" INTEGER NOT NULL DEFAULT 0,
      "lastPenaltyPoints" INTEGER NOT NULL DEFAULT 0,
      "lastIrresponsibleShare" REAL NOT NULL DEFAULT 0,
      "lastSnapshotFingerprint" TEXT,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  const existingBehaviorColumns = new Set(
    (
      (await prisma.$queryRawUnsafe(
        `PRAGMA table_info("UserBehaviorState")`
      )) as SqliteColumnInfo[]
    ).map((column) => column.name)
  );
  if (!existingBehaviorColumns.has("lastPenaltyPoints")) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "UserBehaviorState" ADD COLUMN "lastPenaltyPoints" INTEGER NOT NULL DEFAULT 0`
    );
  }
  if (!existingBehaviorColumns.has("lastIrresponsibleShare")) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "UserBehaviorState" ADD COLUMN "lastIrresponsibleShare" REAL NOT NULL DEFAULT 0`
    );
  }
  if (!existingBehaviorColumns.has("lastSnapshotFingerprint")) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "UserBehaviorState" ADD COLUMN "lastSnapshotFingerprint" TEXT`
    );
  }
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "YieldRedistributionEvent" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "offenderUserId" TEXT NOT NULL,
      "triggeredScore" INTEGER NOT NULL,
      "resetAmount" REAL NOT NULL,
      "redistributedToUsers" REAL NOT NULL,
      "redistributedToNonprofits" REAL NOT NULL,
      "reason" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("offenderUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "YieldRedistributionEvent_offenderUserId_createdAt_idx"
    ON "YieldRedistributionEvent"("offenderUserId", "createdAt")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "YieldRedistributionCredit" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "eventId" INTEGER NOT NULL,
      "userId" TEXT NOT NULL,
      "amount" REAL NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("eventId") REFERENCES "YieldRedistributionEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "YieldRedistributionCredit_userId_createdAt_idx"
    ON "YieldRedistributionCredit"("userId", "createdAt")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SustainabilityFundLedger" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "eventId" INTEGER NOT NULL,
      "amount" REAL NOT NULL,
      "recipient" TEXT NOT NULL DEFAULT 'verified_nonprofit_pool',
      "note" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("eventId") REFERENCES "YieldRedistributionEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);

  ensured = true;
}
