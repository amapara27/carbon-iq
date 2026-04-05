import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Leaf, RefreshCw } from "lucide-react";

interface SwapSuggestionsResponse {
  wallet: string;
  totalPotentialSavingsMonthly: number;
  suggestions: Array<{
    currentCategory: string;
    currentDescription: string;
    currentCo2eMonthly: number;
    alternativeDescription: string;
    alternativeCo2eMonthly: number;
    co2eSavingsMonthly: number;
    priceDifferenceUsd: number;
    difficulty: "easy" | "moderate" | "hard";
  }>;
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unexpected error.";
}

export default function Swaps() {
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58() ?? null;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SwapSuggestionsResponse | null>(null);
  const [adopted, setAdopted] = useState<Record<number, boolean>>({});

  async function loadSuggestions() {
    if (!wallet) {
      setError("Connect your wallet first.");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/swap-suggestions?wallet=${wallet}`);
      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }
      const json = (await response.json()) as SwapSuggestionsResponse;
      setResult(json);
      setAdopted({});
    } catch (loadError) {
      setError(formatError(loadError));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Product Swaps</h1>
        <p className="text-gray-400 mt-1">
          AI suggests lower-emission alternatives you can adopt.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-forest-400" />
            Swap Suggestions
          </CardTitle>
          <CardDescription>
            This is product recommendation mode, not token DEX execution.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={loadSuggestions} disabled={isLoading}>
            <RefreshCw className="h-4 w-4" />
            {isLoading ? "Loading..." : "Load Suggestions"}
          </Button>
          {error && <p className="text-sm text-clay-400">{error}</p>}
          {result && (
            <p className="text-sm text-stone-300">
              Total potential savings:{" "}
              <span className="text-forest-300">
                {result.totalPotentialSavingsMonthly.toFixed(2)} g CO₂/month
              </span>
            </p>
          )}
        </CardContent>
      </Card>

      {result && (
        <div className="grid grid-cols-1 gap-4">
          {result.suggestions.map((suggestion, index) => (
            <Card key={`${suggestion.currentCategory}-${index}`}>
              <CardContent className="space-y-3">
                <p className="text-sm text-stone-400 uppercase">{suggestion.currentCategory}</p>
                <p className="text-sm text-stone-200">
                  <span className="text-stone-400">Current:</span> {suggestion.currentDescription}
                </p>
                <p className="text-sm text-forest-300">
                  <span className="text-stone-400">Alternative:</span>{" "}
                  {suggestion.alternativeDescription}
                </p>
                <p className="text-xs text-stone-500">
                  Saves {suggestion.co2eSavingsMonthly.toFixed(2)} g/month
                  {suggestion.priceDifferenceUsd <= 0
                    ? ` and costs $${Math.abs(suggestion.priceDifferenceUsd).toFixed(2)} less`
                    : ` and costs $${suggestion.priceDifferenceUsd.toFixed(2)} more`}
                </p>
                <Button
                  size="sm"
                  variant={adopted[index] ? "secondary" : "outline"}
                  onClick={() =>
                    setAdopted((prev) => ({ ...prev, [index]: !prev[index] }))
                  }
                >
                  {adopted[index] ? "Adopted" : "Mark Adopted"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
