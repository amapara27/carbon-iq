import { useWallet } from "@solana/wallet-adapter-react";
import GreenScoreDisplay from "@/components/dashboard/GreenScoreDisplay";
import CarbonFootprintChart from "@/components/dashboard/CarbonFootprintChart";
import { useGreenScore } from "@/hooks/useGreenScore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Zap, TreePine, Globe, TrendingUp } from "lucide-react";

export default function Dashboard() {
  const { publicKey } = useWallet();
  const { data: greenScore } = useGreenScore(
    publicKey?.toBase58() ?? null
  );

  const stats = [
    {
      label: "Total CO₂ Offset",
      value: "2,450 kg",
      icon: TreePine,
      change: "+12.5%",
    },
    {
      label: "Transactions Analyzed",
      value: "1,284",
      icon: Zap,
      change: "+8.3%",
    },
    {
      label: "Global Rank",
      value: `#${greenScore?.rank ?? "—"}`,
      icon: Globe,
      change: "Top 8%",
    },
    {
      label: "Staking APY",
      value: "8.2%",
      icon: TrendingUp,
      change: "+1.7% bonus",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-400 mt-1">
          Track your sustainability impact on Solana
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-gray-400">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-accent-emerald font-medium">
                  {stat.change}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-200">
                <stat.icon className="h-5 w-5 text-accent-emerald" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CarbonFootprintChart />
        </div>
        <div>
          <GreenScoreDisplay score={greenScore?.score ?? 0} />
        </div>
      </div>
    </div>
  );
}
