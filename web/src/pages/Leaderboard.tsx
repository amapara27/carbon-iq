import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { Trophy } from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  wallet: string;
  walletShort: string;
  score: number;
  totalCo2eOffset: number;
}

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  totalEntries: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unexpected error.";
}

export default function Leaderboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<LeaderboardResponse | null>(null);

  async function loadLeaderboard() {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/leaderboard?page=1&pageSize=20");
      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }
      const json = (await response.json()) as LeaderboardResponse;
      setData(json);
    } catch (loadError) {
      setError(formatError(loadError));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <h1 className="text-4xl font-display font-bold tracking-tight text-stone-50">
          Leaderboard
        </h1>
        <p className="text-stone-400 text-base tracking-wide">
          Live rankings based on stored green scores.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2.5">
            <Trophy className="h-4 w-4 text-solar-400" strokeWidth={2.5} />
            Full Rankings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={loadLeaderboard} disabled={isLoading}>
            {isLoading ? "Loading..." : "Load Leaderboard"}
          </Button>
          {error && <p className="text-sm text-clay-400">{error}</p>}
          {data && (
            <p className="text-xs text-stone-500">
              Showing {data.entries.length} of {data.totalEntries} entries
            </p>
          )}
          {data && (
            <div className="space-y-2">
              {data.entries.map((entry) => (
                <div
                  key={entry.wallet}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-surface-900/40 transition-all duration-300 border border-transparent hover:border-stone-800/60"
                >
                  <span className="text-sm font-mono text-stone-500 w-5 text-center">
                    {entry.rank}
                  </span>
                  <p className="font-mono text-sm flex-1 text-stone-400">
                    {entry.walletShort}
                  </p>
                  <div className="w-32 hidden sm:block">
                    <Progress value={entry.score} />
                  </div>
                  <p className="font-semibold text-forest-400 w-12 text-right">
                    {entry.score}
                  </p>
                  <p className="text-xs text-stone-500 w-28 text-right">
                    {(entry.totalCo2eOffset / 1000).toFixed(2)} kg
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
