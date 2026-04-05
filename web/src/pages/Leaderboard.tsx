import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { Trophy, Medal, Crown } from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  wallet: string;
  score: number;
  co2Offset: number;
}

const mockLeaderboard: LeaderboardEntry[] = [
  { rank: 1, wallet: "7xKX...m3Qp", score: 98, co2Offset: 12_450 },
  { rank: 2, wallet: "Bq4R...vN8j", score: 95, co2Offset: 11_200 },
  { rank: 3, wallet: "9mPL...kW2s", score: 93, co2Offset: 10_800 },
  { rank: 4, wallet: "Fh6Y...xT9r", score: 89, co2Offset: 9_340 },
  { rank: 5, wallet: "3aVZ...pB7c", score: 87, co2Offset: 8_900 },
  { rank: 6, wallet: "Kn2W...dF4m", score: 84, co2Offset: 8_100 },
  { rank: 7, wallet: "Xt8J...sQ6v", score: 81, co2Offset: 7_650 },
  { rank: 8, wallet: "Lp5R...hG3n", score: 78, co2Offset: 7_200 },
  { rank: 9, wallet: "Dw9M...aK1z", score: 75, co2Offset: 6_800 },
  { rank: 10, wallet: "Yc3T...eJ8b", score: 72, co2Offset: 6_400 },
];

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return <Crown className="h-5 w-5 text-yellow-400 drop-shadow-lg" />;
  if (rank === 2)
    return <Medal className="h-5 w-5 text-gray-300 drop-shadow-lg" />;
  if (rank === 3)
    return <Medal className="h-5 w-5 text-orange-400 drop-shadow-lg" />;
  return (
    <span className="text-sm font-mono text-gray-500 w-5 text-center">
      {rank}
    </span>
  );
}

export default function Leaderboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Leaderboard</h1>
        <p className="text-gray-400 mt-1">
          Top sustainability contributors on Solana
        </p>
      </div>

      {/* Top 3 Podium */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {mockLeaderboard.slice(0, 3).map((entry, i) => (
          <Card
            key={entry.wallet}
            className={`text-center ${
              i === 0 ? "glow-green md:order-2" : i === 1 ? "md:order-1" : "md:order-3"
            }`}
          >
            <CardContent className="pt-2 space-y-3">
              <div className="flex justify-center">
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-full ${
                    i === 0
                      ? "bg-yellow-400/10 border-2 border-yellow-400/30"
                      : i === 1
                        ? "bg-gray-300/10 border-2 border-gray-300/30"
                        : "bg-orange-400/10 border-2 border-orange-400/30"
                  }`}
                >
                  <RankBadge rank={entry.rank} />
                </div>
              </div>
              <p className="font-mono text-sm text-gray-400">{entry.wallet}</p>
              <p className="text-3xl font-bold gradient-text">{entry.score}</p>
              <p className="text-xs text-gray-500">
                {entry.co2Offset.toLocaleString()} kg CO₂ offset
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Full Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-400" />
            Full Rankings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {mockLeaderboard.map((entry) => (
              <div
                key={entry.wallet}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-surface-200 transition-colors"
              >
                <RankBadge rank={entry.rank} />
                <p className="font-mono text-sm flex-1">{entry.wallet}</p>
                <div className="w-32 hidden sm:block">
                  <Progress value={entry.score} />
                </div>
                <p className="font-semibold text-accent-emerald w-12 text-right">
                  {entry.score}
                </p>
                <p className="text-xs text-gray-500 w-28 text-right">
                  {entry.co2Offset.toLocaleString()} kg
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
