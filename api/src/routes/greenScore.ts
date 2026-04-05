import { Router, type Request, type Response } from "express";
import { z } from "zod";

export const greenScoreRouter = Router();

const WalletQuerySchema = z.object({
  wallet: z.string().min(32).max(44),
});

/**
 * GET /api/green-score?wallet=<address>
 * Returns the composite green score for a wallet.
 */
greenScoreRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { wallet } = WalletQuerySchema.parse(req.query);

    // TODO: Replace with real scoring logic from Prisma DB + on-chain data
    // Deterministic mock based on wallet address
    const seed = wallet
      .split("")
      .reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const baseScore = 40 + (seed % 55);

    const breakdown = {
      transactionEfficiency: 60 + (seed % 35),
      stakingHistory: 40 + ((seed * 3) % 50),
      carbonOffsets: 50 + ((seed * 7) % 45),
      communityImpact: 30 + ((seed * 11) % 60),
    };

    const score = Math.min(
      100,
      Math.round(
        (breakdown.transactionEfficiency * 0.25 +
          breakdown.stakingHistory * 0.25 +
          breakdown.carbonOffsets * 0.3 +
          breakdown.communityImpact * 0.2)
      )
    );

    res.json({
      wallet,
      score,
      breakdown,
      rank: Math.max(1, 200 - (seed % 180)),
      totalUsers: 1_893,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation error", details: err.errors });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});
