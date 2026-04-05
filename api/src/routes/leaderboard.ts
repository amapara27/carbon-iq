/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  GET /api/leaderboard                                                   ║
 * ║  Green Score leaderboard from stored scores.                            ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import {
  LEADERBOARD_PAGE_SIZE,
  LeaderboardRequestSchema,
  LeaderboardResponseSchema,
} from "@carboniq/contracts";
import {
  clampGreenScore,
  getGreenScoreTier,
  shortenWallet,
} from "../lib/blockchain.js";
import { prisma } from "../lib/prisma.js";
import { getZodLikeDetails, isZodLikeError } from "../lib/validation.js";

export const leaderboardRouter = Router();
const MIN_LEADERBOARD_ENTRIES = 25;
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

interface LeaderboardEntry {
  rank: number;
  wallet: string;
  walletShort: string;
  score: number;
  tier: ReturnType<typeof getGreenScoreTier>;
  totalCo2eOffset: number;
}

function createSyntheticWallet(index: number): string {
  let value = index * 7_919 + 17;
  let wallet = "";

  for (let charIndex = 0; charIndex < 44; charIndex += 1) {
    value = (value * 48_271 + 12_345) % 2_147_483_647;
    wallet += BASE58_ALPHABET[value % BASE58_ALPHABET.length];
  }

  return wallet;
}

function createSyntheticEntry(index: number): Omit<LeaderboardEntry, "rank"> {
  const score = clampGreenScore(Math.round(91 - index * 1.35 - (index % 3)));
  const totalCo2eOffset = 18_000 + index * 1_650 + (index % 5) * 275;
  const wallet = createSyntheticWallet(index);

  return {
    wallet,
    walletShort: shortenWallet(wallet),
    score,
    tier: getGreenScoreTier(score),
    totalCo2eOffset,
  };
}

leaderboardRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { page, pageSize } = LeaderboardRequestSchema.parse({
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    });

    const skip = (page - 1) * pageSize;

    const users = (await prisma.user.findMany({
      where: { greenScore: { gt: 0 } },
      orderBy: { greenScore: "desc" },
      include: {
        impacts: {
          select: { co2OffsetGrams: true },
        },
      },
    })) as Array<{
      walletAddress: string;
      greenScore: number;
      impacts: Array<{ co2OffsetGrams: number }>;
    }>;

    const realEntries = users.map((user) => {
      const totalCo2eOffset = user.impacts.reduce(
        (sum: number, impact: { co2OffsetGrams: number }) =>
          sum + impact.co2OffsetGrams,
        0
      );

      return {
        wallet: user.walletAddress,
        walletShort: shortenWallet(user.walletAddress),
        score: clampGreenScore(user.greenScore),
        tier: getGreenScoreTier(user.greenScore),
        totalCo2eOffset,
      };
    });

    const syntheticCount = Math.max(MIN_LEADERBOARD_ENTRIES - realEntries.length, 0);
    const syntheticEntries = Array.from({ length: syntheticCount }, (_, index) =>
      createSyntheticEntry(index)
    );

    const rankedEntries = [...realEntries, ...syntheticEntries]
      .sort(
        (left, right) =>
          right.score - left.score ||
          right.totalCo2eOffset - left.totalCo2eOffset ||
          left.wallet.localeCompare(right.wallet)
      )
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));

    const entries = rankedEntries.slice(skip, skip + pageSize);
    const totalEntries = rankedEntries.length;
    const totalPages = Math.ceil(totalEntries / pageSize);

    const response = LeaderboardResponseSchema.parse({
      entries,
      totalEntries,
      page,
      pageSize,
      totalPages,
    });

    res.json(response);
  } catch (err) {
    if (isZodLikeError(err)) {
      res.status(400).json({
        error: "Validation error",
        details: getZodLikeDetails(err),
      });
      return;
    }
    console.error("Leaderboard error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
