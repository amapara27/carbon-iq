import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { analyzeTransactionsRouter } from "./routes/analyzeTransactions.js";
import { greenScoreRouter } from "./routes/greenScore.js";
import { simulateStakeRouter } from "./routes/simulateStake.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "carboniq-api", timestamp: Date.now() });
});

// Routes
app.use("/api/analyze-transactions", analyzeTransactionsRouter);
app.use("/api/green-score", greenScoreRouter);
app.use("/api/simulate-stake", simulateStakeRouter);

// 404
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(PORT, () => {
  console.log(`🌱 CarbonIQ API running on http://localhost:${PORT}`);
});
