import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { DemoTransactionInputSchema } from "@carboniq/contracts";
import type { DemoConnectBankRequest, DemoTransactionInput } from "@carboniq/contracts";
import type { RawTransaction } from "../lib/aiRules.js";

type DemoScenario = NonNullable<DemoConnectBankRequest["scenario"]>;

const walletLedgers = new Map<string, RawTransaction[]>();
const scenarioFileMap: Record<DemoScenario, string> = {
  sustainable: "sustainable_transactions.json",
  mixed: "mixed_transactions.json",
  irresponsible: "irresponsible_transactions.json",
};

function resolveDemoDirectory(): string {
  const candidates = [
    path.resolve(process.cwd(), "../demo/synthetic_transactions"),
    path.resolve(process.cwd(), "demo/synthetic_transactions"),
  ];
  const resolved = candidates.find((candidate) => fs.existsSync(candidate));

  if (!resolved) {
    throw new Error("Unable to resolve demo/synthetic_transactions directory.");
  }

  return resolved;
}

function toRawTransaction(transaction: DemoTransactionInput): RawTransaction {
  return {
    transactionId: transaction.transactionId,
    description: transaction.description,
    amountUsd: transaction.amountUsd,
    mccCode: transaction.mccCode,
    date: transaction.date,
  };
}

function parseDemoLedger(raw: unknown): RawTransaction[] {
  const parsed = z.array(DemoTransactionInputSchema).parse(raw);
  return parsed.map(toRawTransaction);
}

export const demoBankLedgerService = {
  connectPreset(wallet: string, scenario: DemoScenario): RawTransaction[] {
    const fileName = scenarioFileMap[scenario];
    const filePath = path.join(resolveDemoDirectory(), fileName);
    const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const transactions = parseDemoLedger(raw);
    walletLedgers.set(wallet, transactions);
    return structuredClone(transactions);
  },

  connectUpload(wallet: string, transactions: DemoTransactionInput[]): RawTransaction[] {
    const parsedTransactions = parseDemoLedger(transactions);
    walletLedgers.set(wallet, parsedTransactions);
    return structuredClone(parsedTransactions);
  },

  getWalletLedger(wallet: string): RawTransaction[] | null {
    const found = walletLedgers.get(wallet);
    return found ? structuredClone(found) : null;
  },
};
