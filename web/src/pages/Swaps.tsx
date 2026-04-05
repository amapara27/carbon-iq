import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ArrowLeftRight, Leaf, ShieldCheck } from "lucide-react";

const tokens = [
  { symbol: "SOL", name: "Solana", greenRating: 92 },
  { symbol: "USDC", name: "USD Coin", greenRating: 85 },
  { symbol: "RAY", name: "Raydium", greenRating: 78 },
  { symbol: "BONK", name: "Bonk", greenRating: 45 },
];

export default function Swaps() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Green Swaps</h1>
        <p className="text-gray-400 mt-1">
          Swap tokens with environmental impact ratings
        </p>
      </div>

      {/* Swap Interface */}
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-accent-cyan" />
            Swap Tokens
          </CardTitle>
          <CardDescription>
            We prioritize low-emission liquidity pools
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* From */}
          <div className="glass p-4 space-y-2">
            <label className="text-xs text-gray-500 uppercase tracking-wider">
              From
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                placeholder="0.00"
                className="flex-1 bg-transparent text-2xl font-semibold outline-none placeholder:text-gray-600"
              />
              <Button variant="outline" size="sm">
                SOL
              </Button>
            </div>
          </div>

          <div className="flex justify-center">
            <button className="p-2 rounded-full bg-surface-200 border border-surface-300 hover:border-accent-cyan/50 transition-colors">
              <ArrowLeftRight className="h-4 w-4 text-accent-cyan" />
            </button>
          </div>

          {/* To */}
          <div className="glass p-4 space-y-2">
            <label className="text-xs text-gray-500 uppercase tracking-wider">
              To
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                placeholder="0.00"
                className="flex-1 bg-transparent text-2xl font-semibold outline-none placeholder:text-gray-600"
              />
              <Button variant="outline" size="sm">
                USDC
              </Button>
            </div>
          </div>

          <Button className="w-full" size="lg">
            <ShieldCheck className="h-4 w-4" />
            Swap (Coming Soon)
          </Button>
        </CardContent>
      </Card>

      {/* Token Sustainability Ratings */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Token Sustainability Ratings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {tokens.map((token) => (
            <Card key={token.symbol}>
              <CardContent className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-200 text-lg font-bold font-mono">
                  {token.symbol.slice(0, 2)}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{token.symbol}</p>
                  <p className="text-xs text-gray-500">{token.name}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Leaf
                    className={`h-4 w-4 ${
                      token.greenRating >= 80
                        ? "text-accent-emerald"
                        : token.greenRating >= 60
                          ? "text-yellow-400"
                          : "text-orange-400"
                    }`}
                  />
                  <span className="text-sm font-mono font-semibold">
                    {token.greenRating}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
