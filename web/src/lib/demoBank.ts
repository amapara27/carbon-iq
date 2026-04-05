export type DemoMode = "preset" | "upload";
export type DemoScenario = "sustainable" | "mixed" | "irresponsible";

export interface DemoTransactionInput {
  transactionId: string;
  description: string;
  amountUsd: number;
  mccCode?: string;
  date: string;
}

function ensureTransactionShape(raw: unknown, index: number): DemoTransactionInput {
  if (!raw || typeof raw !== "object") {
    throw new Error(`Transaction row ${index + 1} is invalid.`);
  }

  const row = raw as Record<string, unknown>;
  const amount = Number(row.amountUsd);
  const date = String(row.date ?? "");
  const transactionId = String(row.transactionId ?? "");
  const description = String(row.description ?? "");

  if (!transactionId || !description || Number.isNaN(amount) || !date) {
    throw new Error(`Transaction row ${index + 1} is missing required fields.`);
  }

  return {
    transactionId,
    description,
    amountUsd: amount,
    mccCode: row.mccCode ? String(row.mccCode) : undefined,
    date,
  };
}

function parseCsvTransactions(csvContent: string): DemoTransactionInput[] {
  const lines = csvContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("CSV must include headers and at least one transaction row.");
  }

  const headers = lines[0]!.split(",").map((header) => header.trim());
  const requiredHeaders = ["transactionId", "description", "amountUsd", "date"];

  for (const required of requiredHeaders) {
    if (!headers.includes(required)) {
      throw new Error(`CSV is missing required header: ${required}`);
    }
  }

  return lines.slice(1).map((line, index) => {
    const values = line.split(",").map((value) => value.trim());
    if (values.length !== headers.length) {
      throw new Error(
        `CSV row ${index + 2} has ${values.length} fields, expected ${headers.length}.`
      );
    }

    const row: Record<string, string> = {};
    headers.forEach((header, valueIndex) => {
      row[header] = values[valueIndex] ?? "";
    });

    return ensureTransactionShape(row, index);
  });
}

export async function parseUploadFile(file: File): Promise<DemoTransactionInput[]> {
  const text = await file.text();
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith(".json")) {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      throw new Error("JSON upload must be an array of transactions.");
    }
    return parsed.map((entry, index) => ensureTransactionShape(entry, index));
  }

  if (lowerName.endsWith(".csv")) {
    return parseCsvTransactions(text);
  }

  throw new Error("Unsupported file type. Please upload .json or .csv.");
}
