import { Progress } from "@/components/ui/Progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Leaf } from "lucide-react";

interface GreenScoreDisplayProps {
  score: number; // 0–100
  label?: string;
}

export default function GreenScoreDisplay({
  score,
  label = "Your Green Score",
}: GreenScoreDisplayProps) {
  const tier =
    score >= 80
      ? { name: "Platinum", color: "text-accent-emerald" }
      : score >= 60
        ? { name: "Gold", color: "text-yellow-400" }
        : score >= 40
          ? { name: "Silver", color: "text-gray-300" }
          : { name: "Bronze", color: "text-orange-400" };

  return (
    <Card className="relative overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-20 blur-3xl"
        style={{
          background: `radial-gradient(circle, rgba(34,197,94,0.6) 0%, transparent 70%)`,
        }}
      />

      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Leaf className="h-5 w-5 text-accent-emerald" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-3">
          <span className="text-5xl font-extrabold gradient-text tabular-nums">
            {score}
          </span>
          <span className="text-sm text-gray-500 pb-2">/ 100</span>
        </div>

        <Progress value={score} />

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Tier</span>
          <span className={`font-semibold ${tier.color}`}>{tier.name}</span>
        </div>
      </CardContent>
    </Card>
  );
}
