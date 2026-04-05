import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Slider } from "@/components/ui/Slider";
import { useSolanaStaking } from "@/hooks/useSolanaStaking";
import { useGreenScore } from "@/hooks/useGreenScore";
import { Landmark, Sparkles } from "lucide-react";

export default function Staking() {
  const { publicKey } = useWallet();
  const { data: greenScore } = useGreenScore(publicKey?.toBase58() ?? null);
  const { result, isCalculating, calculate, BASE_APY, GREEN_BONUS_MAX } =
    useSolanaStaking();

  const [amount, setAmount] = useState(1);
  const [duration, setDuration] = useState(30);

  const score = greenScore?.score ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Green Staking</h1>
        <p className="text-gray-400 mt-1">
          Earn boosted APY based on your environmental impact
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-accent-emerald" />
              Stake SOL
            </CardTitle>
            <CardDescription>
              Your Green Score of{" "}
              <span className="text-accent-emerald font-semibold">{score}</span>{" "}
              earns you a bonus APY
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Amount */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Amount (SOL)</span>
                <span className="font-mono text-accent-emerald">{amount}</span>
              </div>
              <Slider
                min={0.1}
                max={100}
                step={0.1}
                value={[amount]}
                onValueChange={([v]) => v !== undefined && setAmount(v)}
              />
            </div>

            {/* Duration */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Duration (days)</span>
                <span className="font-mono text-accent-emerald">{duration}</span>
              </div>
              <Slider
                min={7}
                max={365}
                step={1}
                value={[duration]}
                onValueChange={([v]) => v !== undefined && setDuration(v)}
              />
            </div>

            <Button
              className="w-full"
              size="lg"
              disabled={isCalculating}
              onClick={() => calculate(amount, duration, score)}
            >
              <Sparkles className="h-4 w-4" />
              {isCalculating ? "Calculating..." : "Simulate Staking"}
            </Button>
          </CardContent>
        </Card>

        {/* Results Card */}
        <Card className={result ? "glow-green" : ""}>
          <CardHeader>
            <CardTitle>Yield Estimate</CardTitle>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-4">
                {[
                  { label: "Base APY", value: `${BASE_APY}%` },
                  {
                    label: "Green Bonus",
                    value: `+${result.greenBonus}%`,
                    highlight: true,
                  },
                  { label: "Effective APY", value: `${result.apy.toFixed(2)}%` },
                  {
                    label: "Est. Yield",
                    value: `${result.estimatedYield} SOL`,
                    highlight: true,
                  },
                  {
                    label: "Total Return",
                    value: `${result.totalReward} SOL`,
                    large: true,
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between py-2 border-b border-surface-300/50 last:border-0"
                  >
                    <span className="text-sm text-gray-400">{row.label}</span>
                    <span
                      className={`font-mono font-semibold ${
                        row.highlight
                          ? "text-accent-emerald"
                          : row.large
                            ? "text-xl gradient-text"
                            : "text-white"
                      }`}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-gray-500 text-sm">
                <Landmark className="h-8 w-8 mb-3 opacity-30" />
                Configure your stake and click simulate
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
