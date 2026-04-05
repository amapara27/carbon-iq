import { Router, type Request, type Response } from "express";
import { z } from "zod";

export const analyzeTransactionsRouter = Router();

const AnalyzeRequestSchema = z.object({
  wallet: z.string().min(32).max(44),
  limit: z.number().int().min(1).max(100).default(20),
});

/**
 * POST /api/analyze-transactions
 * Analyzes recent Solana transactions for a wallet and estimates
 * their environmental impact based on compute units consumed.
 */
analyzeTransactionsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { wallet, limit } = AnalyzeRequestSchema.parse(req.body);

    // TODO: Integrate with @solana/web3.js to fetch real transactions
    // For now, return mock analysis data
    const mockTransactions = Array.from({ length: limit }, (_, i) => ({
      signature: `mock_sig_${i}_${wallet.slice(0, 8)}`,
      computeUnits: Math.floor(Math.random() * 200_000) + 50_000,
      estimatedCO2Grams: parseFloat((Math.random() * 0.5).toFixed(4)),
      timestamp: Date.now() - i * 3_600_000,
      type: ["transfer", "swap", "stake", "nft_mint"][
        Math.floor(Math.random() * 4)
      ],
    }));

    const totalCO2 = mockTransactions.reduce(
      (sum, tx) => sum + tx.estimatedCO2Grams,
      0
    );

    res.json({
      wallet,
      transactionCount: mockTransactions.length,
      totalEstimatedCO2Grams: parseFloat(totalCO2.toFixed(4)),
      transactions: mockTransactions,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation error", details: err.errors });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});
