import { Router, type Request, type Response } from "express";
import { z } from "zod";

export const simulateStakeRouter = Router();

const SimulateSchema = z.object({
  amount: z.number().positive().max(1_000_000),
  durationDays: z.number().int().min(1).max(365),
  greenScore: z.number().min(0).max(100),
});

const BASE_APY = 6.5;
const GREEN_BONUS_MAX = 2.5;

/**
 * POST /api/simulate-stake
 * Simulates staking yield with a green score bonus.
 */
simulateStakeRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { amount, durationDays, greenScore } = SimulateSchema.parse(req.body);

    const greenBonus = (greenScore / 100) * GREEN_BONUS_MAX;
    const effectiveApy = BASE_APY + greenBonus;
    const dailyRate = effectiveApy / 100 / 365;
    const estimatedYield = amount * dailyRate * durationDays;

    res.json({
      principal: amount,
      durationDays,
      baseApy: BASE_APY,
      greenBonus: parseFloat(greenBonus.toFixed(2)),
      effectiveApy: parseFloat(effectiveApy.toFixed(2)),
      estimatedYield: parseFloat(estimatedYield.toFixed(6)),
      totalReturn: parseFloat((amount + estimatedYield).toFixed(6)),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation error", details: err.errors });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});
