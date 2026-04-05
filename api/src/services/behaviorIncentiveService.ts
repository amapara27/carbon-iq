import { prisma } from "../lib/prisma.js";
import { clampGreenScore } from "../lib/blockchain.js";
import { roundTo } from "../lib/aiMath.js";

const IRRESPONSIBLE_SHARE_THRESHOLD = Number(
  process.env.GREEN_SCORE_IRRESPONSIBLE_SHARE_THRESHOLD ?? 0.5
);
const IRRESPONSIBLE_SPENDING_HABITS_THRESHOLD = Number(
  process.env.GREEN_SCORE_IRRESPONSIBLE_SPENDING_THRESHOLD ?? 42
);
const STREAK_PENALTY_START = Number(
  process.env.GREEN_SCORE_STREAK_PENALTY_START ?? 2
);
const PENALTY_PER_STREAK = Number(
  process.env.GREEN_SCORE_PENALTY_PER_STREAK ?? 3
);
const MAX_STREAK_PENALTY = Number(
  process.env.GREEN_SCORE_MAX_STREAK_PENALTY ?? 24
);
const LOW_SCORE_RESET_THRESHOLD = Number(
  process.env.GREEN_SCORE_RESET_THRESHOLD ?? 25
);
const HIGH_SCORER_THRESHOLD = Number(
  process.env.REDISTRIBUTION_HIGH_SCORER_THRESHOLD ?? 70
);
const USER_REDISTRIBUTION_SHARE = Number(
  process.env.REDISTRIBUTION_TO_USERS_SHARE ?? 0.7
);

let schemaEnsured = false;

type BehaviorStateRow = {
  irresponsibleStreak: number;
  lastPenaltyPoints: number;
  lastSnapshotFingerprint: string | null;
};

type AggregateRow = {
  total: number | null;
};

type RedistributionEventRow = {
  id: number;
};

type EligibleUserRow = {
  id: string;
};

async function ensureBehaviorSchema(): Promise<void> {
  if (schemaEnsured) {
    return;
  }

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
  const behaviorColumns = new Set(
    (
      (await prisma.$queryRawUnsafe(
        `PRAGMA table_info("UserBehaviorState")`
      )) as Array<{ name: string }>
    ).map((column) => column.name)
  );
  if (!behaviorColumns.has("lastPenaltyPoints")) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "UserBehaviorState" ADD COLUMN "lastPenaltyPoints" INTEGER NOT NULL DEFAULT 0`
    );
  }
  if (!behaviorColumns.has("lastIrresponsibleShare")) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "UserBehaviorState" ADD COLUMN "lastIrresponsibleShare" REAL NOT NULL DEFAULT 0`
    );
  }
  if (!behaviorColumns.has("lastSnapshotFingerprint")) {
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

  schemaEnsured = true;
}

function isIrresponsibleBehavior(input: {
  spendingHabits: number;
  irresponsibleSpendShare: number;
}): boolean {
  return (
    input.spendingHabits < IRRESPONSIBLE_SPENDING_HABITS_THRESHOLD ||
    input.irresponsibleSpendShare >= IRRESPONSIBLE_SHARE_THRESHOLD
  );
}

function computePenaltyPoints(input: {
  irresponsibleStreak: number;
  irresponsibleSpendShare: number;
}): number {
  const streakOverage = Math.max(0, input.irresponsibleStreak - STREAK_PENALTY_START + 1);
  const streakPenalty = streakOverage * PENALTY_PER_STREAK;
  const severityPenalty = Math.max(
    0,
    Math.round((input.irresponsibleSpendShare - IRRESPONSIBLE_SHARE_THRESHOLD) * 20)
  );
  return Math.max(0, Math.min(MAX_STREAK_PENALTY, streakPenalty + severityPenalty));
}

export async function applyBehaviorPenalty(input: {
  userId: string;
  baseScore: number;
  spendingHabits: number;
  irresponsibleSpendShare: number;
  snapshotFingerprint: string;
}): Promise<{ adjustedScore: number; penaltyPoints: number; irresponsibleStreak: number }> {
  await ensureBehaviorSchema();

  const currentRows = await prisma.$queryRaw<BehaviorStateRow[]>`
    SELECT "irresponsibleStreak", "lastPenaltyPoints", "lastSnapshotFingerprint"
    FROM "UserBehaviorState"
    WHERE "userId" = ${input.userId}
    LIMIT 1
  `;
  const currentState = currentRows[0];
  const currentStreak = currentState?.irresponsibleStreak ?? 0;
  if (currentState?.lastSnapshotFingerprint === input.snapshotFingerprint) {
    const adjustedScore = clampGreenScore(input.baseScore - currentState.lastPenaltyPoints);
    return {
      adjustedScore,
      penaltyPoints: currentState.lastPenaltyPoints,
      irresponsibleStreak: currentState.irresponsibleStreak,
    };
  }
  const flaggedIrresponsible = isIrresponsibleBehavior({
    spendingHabits: input.spendingHabits,
    irresponsibleSpendShare: input.irresponsibleSpendShare,
  });
  const nextStreak = flaggedIrresponsible
    ? currentStreak + 1
    : Math.max(0, currentStreak - 1);
  const penaltyPoints = computePenaltyPoints({
    irresponsibleStreak: nextStreak,
    irresponsibleSpendShare: input.irresponsibleSpendShare,
  });
  const adjustedScore = clampGreenScore(input.baseScore - penaltyPoints);

  await prisma.$executeRaw`
    INSERT INTO "UserBehaviorState" (
      "userId",
      "irresponsibleStreak",
      "lastPenaltyPoints",
      "lastIrresponsibleShare",
      "lastSnapshotFingerprint",
      "updatedAt"
    )
    VALUES (
      ${input.userId},
      ${nextStreak},
      ${penaltyPoints},
      ${input.irresponsibleSpendShare},
      ${input.snapshotFingerprint},
      CURRENT_TIMESTAMP
    )
    ON CONFLICT("userId") DO UPDATE SET
      "irresponsibleStreak" = excluded."irresponsibleStreak",
      "lastPenaltyPoints" = excluded."lastPenaltyPoints",
      "lastIrresponsibleShare" = excluded."lastIrresponsibleShare",
      "lastSnapshotFingerprint" = excluded."lastSnapshotFingerprint",
      "updatedAt" = excluded."updatedAt"
  `;

  return {
    adjustedScore,
    penaltyPoints,
    irresponsibleStreak: nextStreak,
  };
}

async function getConfirmedYieldEstimate(userId: string): Promise<number> {
  const stakeAgg = await prisma.stakeRecord.aggregate({
    where: {
      userId,
      solanaTxHash: { not: null },
      status: "confirmed",
    },
    _sum: { estimatedYield: true },
  });
  return stakeAgg._sum.estimatedYield ?? 0;
}

async function getResetDebits(userId: string): Promise<number> {
  await ensureBehaviorSchema();
  const rows = await prisma.$queryRaw<AggregateRow[]>`
    SELECT COALESCE(SUM("resetAmount"), 0) AS "total"
    FROM "YieldRedistributionEvent"
    WHERE "offenderUserId" = ${userId}
  `;
  return Number(rows[0]?.total ?? 0);
}

async function getRedistributionCredits(userId: string): Promise<number> {
  await ensureBehaviorSchema();
  const rows = await prisma.$queryRaw<AggregateRow[]>`
    SELECT COALESCE(SUM("amount"), 0) AS "total"
    FROM "YieldRedistributionCredit"
    WHERE "userId" = ${userId}
  `;
  return Number(rows[0]?.total ?? 0);
}

export async function getNetAccruedYieldForUser(userId: string): Promise<number> {
  const [baseYield, resetDebits, redistributionCredits] = await Promise.all([
    getConfirmedYieldEstimate(userId),
    getResetDebits(userId),
    getRedistributionCredits(userId),
  ]);

  const netYield = baseYield - resetDebits + redistributionCredits;
  return roundTo(Math.max(0, netYield), 6);
}

export async function enforceLowScoreYieldReset(input: {
  offenderUserId: string;
  offenderWallet: string;
  score: number;
}): Promise<void> {
  await ensureBehaviorSchema();
  if (input.score > LOW_SCORE_RESET_THRESHOLD) {
    return;
  }

  const currentAccrued = await getNetAccruedYieldForUser(input.offenderUserId);
  if (currentAccrued <= 0) {
    return;
  }

  const eligibleRows = await prisma.$queryRaw<EligibleUserRow[]>`
    SELECT "id"
    FROM "User"
    WHERE "id" != ${input.offenderUserId}
      AND "greenScore" >= ${HIGH_SCORER_THRESHOLD}
    ORDER BY "greenScore" DESC, "createdAt" ASC
    LIMIT 100
  `;

  const hasEligibleUsers = eligibleRows.length > 0;
  const usersShareRaw = hasEligibleUsers
    ? roundTo(currentAccrued * USER_REDISTRIBUTION_SHARE, 6)
    : 0;
  const nonprofitShareRaw = roundTo(currentAccrued - usersShareRaw, 6);

  const insertedRows = await prisma.$queryRaw<RedistributionEventRow[]>`
    INSERT INTO "YieldRedistributionEvent" (
      "offenderUserId",
      "triggeredScore",
      "resetAmount",
      "redistributedToUsers",
      "redistributedToNonprofits",
      "reason"
    )
    VALUES (
      ${input.offenderUserId},
      ${input.score},
      ${currentAccrued},
      ${usersShareRaw},
      ${nonprofitShareRaw},
      ${"low_score_reset"}
    )
    RETURNING "id"
  `;
  const eventId = insertedRows[0]?.id;
  if (!eventId) {
    return;
  }

  let creditedToUsers = 0;
  if (hasEligibleUsers && usersShareRaw > 0) {
    const perUser = roundTo(usersShareRaw / eligibleRows.length, 6);
    if (perUser > 0) {
      for (const row of eligibleRows) {
        await prisma.$executeRaw`
          INSERT INTO "YieldRedistributionCredit" ("eventId", "userId", "amount")
          VALUES (${eventId}, ${row.id}, ${perUser})
        `;
      }
      creditedToUsers = roundTo(perUser * eligibleRows.length, 6);
    }
  }

  const nonprofitShare = roundTo(currentAccrued - creditedToUsers, 6);
  if (nonprofitShare > 0) {
    const note = `reset_from_${input.offenderWallet}`;
    await prisma.$executeRaw`
      INSERT INTO "SustainabilityFundLedger" ("eventId", "amount", "note")
      VALUES (${eventId}, ${nonprofitShare}, ${note})
    `;
  }
}
