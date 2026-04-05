import { type ChangeEvent, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Link } from "react-router-dom";
import GreenScoreDisplay from "@/components/dashboard/GreenScoreDisplay";
import CarbonFootprintChart from "@/components/dashboard/CarbonFootprintChart";
import { useGreenScore } from "@/hooks/useGreenScore";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { parseUploadFile, type DemoMode, type DemoScenario, type DemoTransactionInput } from "@/lib/demoBank";
import { Coins, Database, Globe, Landmark, TreePine, TrendingUp, Zap } from "lucide-react";

interface DemoConnectBankResponse {
  wallet: string;
  mode: DemoMode;
  sourceLabel: string;
  transactionCount: number;
  connectedAt: string;
}

interface AnalyzeResponse {
  wallet: string;
  transactionCount: number;
  totalCo2eGrams: number;
  transactions: Array<{
    transactionId: string;
    description: string;
    amountUsd: number;
    category: string;
    co2eGrams: number;
    date: string;
  }>;
}

interface StakingInfoResponse {
  wallet: string;
  greenScore: number;
  baseApy: number;
  greenBonus: number;
  effectiveApy: number;
  stakedAmount: number;
  accruedYield: number;
  stakeVaultAddress?: string;
}

const DEMO_SCENARIOS: DemoScenario[] = ["sustainable", "mixed", "irresponsible"];

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unexpected error. Please try again.";
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (typeof body?.error === "string") {
        message = body.error;
      }
    } catch {
      // fallback message
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

function hasNonSeededTransactions(response: AnalyzeResponse): boolean {
  if (response.transactionCount <= 0) {
    return false;
  }
  return response.transactions.some(
    (transaction) => !transaction.transactionId.startsWith("seeded_")
  );
}

export default function Dashboard() {
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58() ?? null;
  const { data: greenScore, refetch: refetchGreenScore } = useGreenScore(wallet);

  const [bankMode, setBankMode] = useState<DemoMode>("preset");
  const [scenario, setScenario] = useState<DemoScenario>("sustainable");
  const [uploadedTransactions, setUploadedTransactions] =
    useState<DemoTransactionInput[] | null>(null);
  const [uploadSummary, setUploadSummary] = useState("");
  const [bankConnectResult, setBankConnectResult] =
    useState<DemoConnectBankResponse | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(null);
  const [stakingInfo, setStakingInfo] = useState<StakingInfoResponse | null>(null);
  const [isConnectingBank, setIsConnectingBank] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCheckingTransactions, setIsCheckingTransactions] = useState(false);
  const [hasBankTransactions, setHasBankTransactions] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const hasStakePosition = (stakingInfo?.stakedAmount ?? 0) > 0;
  const dashboardLocked = Boolean(wallet) && hasBankTransactions === false;

  const tickerStats = [
    {
      label: "Total CO₂ Analyzed",
      value: analysisResult
        ? `${(analysisResult.totalCo2eGrams / 1000).toFixed(2)} kg`
        : "—",
      icon: TreePine,
      change: analysisResult ? "From connected bank feed" : "Connect bank to load data",
    },
    {
      label: "Transactions Analyzed",
      value: `${analysisResult?.transactionCount ?? 0}`,
      icon: Zap,
      change: analysisResult ? "Latest analysis run" : "Awaiting analysis",
    },
    {
      label: "Global Rank",
      value: `#${greenScore?.rank ?? "—"}`,
      icon: Globe,
      change: greenScore?.totalUsers
        ? `of ${greenScore.totalUsers} users`
        : "Refresh score to update",
    },
    {
      label: "Effective Staking APY",
      value: stakingInfo ? `${stakingInfo.effectiveApy.toFixed(2)}%` : "—",
      icon: TrendingUp,
      change: "Based on latest green score",
    },
  ];

  useEffect(() => {
    if (!wallet) {
      setStakingInfo(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const stakeInfo = await requestJson<StakingInfoResponse>(
          `/api/staking-info?wallet=${wallet}`
        );
        if (!cancelled) {
          setStakingInfo(stakeInfo);
        }
      } catch {
        if (!cancelled) {
          setStakingInfo(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [wallet]);

  useEffect(() => {
    if (!wallet) {
      setHasBankTransactions(null);
      setIsCheckingTransactions(false);
      return;
    }

    let cancelled = false;
    setIsCheckingTransactions(true);
    void (async () => {
      try {
        const response = await requestJson<AnalyzeResponse>("/api/analyze-transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet, limit: 1 }),
        });
        if (!cancelled) {
          setHasBankTransactions(hasNonSeededTransactions(response));
        }
      } catch {
        if (!cancelled) {
          setHasBankTransactions(false);
        }
      } finally {
        if (!cancelled) {
          setIsCheckingTransactions(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [wallet]);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const parsed = await parseUploadFile(file);
      setUploadedTransactions(parsed);
      setBankMode("upload");
      setUploadSummary(`Loaded ${parsed.length} transactions from ${file.name}`);
      setError("");
    } catch (uploadError) {
      setUploadedTransactions(null);
      setUploadSummary(formatError(uploadError));
    } finally {
      event.target.value = "";
    }
  }

  async function handleConnectBank() {
    if (!wallet) {
      setError("Connect your wallet first.");
      return;
    }

    if (bankMode === "upload" && !uploadedTransactions) {
      setError("Upload a JSON or CSV file before connecting.");
      return;
    }

    setError("");
    setMessage("");
    setIsConnectingBank(true);
    try {
      const payload =
        bankMode === "preset"
          ? { wallet, mode: "preset", scenario }
          : { wallet, mode: "upload", transactions: uploadedTransactions };
      const response = await requestJson<DemoConnectBankResponse>(
        "/api/demo/connect-bank",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      setBankConnectResult(response);
      setAnalysisResult(null);
      if (response.transactionCount > 0) {
        setHasBankTransactions(true);
      }
      setMessage(`Bank connected via ${response.sourceLabel}.`);
    } catch (connectError) {
      setError(formatError(connectError));
    } finally {
      setIsConnectingBank(false);
    }
  }

  async function handleAnalyzeTransactions() {
    if (!wallet) {
      setError("Connect your wallet first.");
      return;
    }

    setError("");
    setMessage("");
    setIsAnalyzing(true);
    try {
      const response = await requestJson<AnalyzeResponse>("/api/analyze-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, limit: 20 }),
      });
      setAnalysisResult(response);
      setHasBankTransactions(hasNonSeededTransactions(response));
      setMessage(`Analyzed ${response.transactionCount} transactions.`);
    } catch (analysisError) {
      setError(formatError(analysisError));
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleRefreshScore() {
    if (!wallet) {
      setError("Connect your wallet first.");
      return;
    }

    setError("");
    setMessage("");
    setIsRefreshing(true);
    try {
      const [, stakeInfo] = await Promise.all([
        refetchGreenScore(),
        requestJson<StakingInfoResponse>(`/api/staking-info?wallet=${wallet}`),
      ]);
      setStakingInfo(stakeInfo);
      setMessage("Performance metrics refreshed.");
    } catch (refreshError) {
      setError(formatError(refreshError));
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-display font-bold tracking-tight text-stone-50">
          Dashboard
        </h1>
        <p className="text-stone-400 text-base tracking-wide">
          Track your personal performance, then keep improving it over time.
        </p>
      </div>

      {!wallet && (
        <Card>
          <CardHeader>
            <CardTitle>Connect Wallet to Continue</CardTitle>
            <CardDescription>
              Connect your wallet from the sidebar to load your dashboard.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {wallet && isCheckingTransactions && (
        <Card>
          <CardHeader>
            <CardTitle>Checking Bank Transactions</CardTitle>
            <CardDescription>
              Verifying whether your wallet already has transactions in the database.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {wallet && !isCheckingTransactions && dashboardLocked && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Required Before Dashboard Access</CardTitle>
            <CardDescription>
              No bank transactions were found for this wallet. Upload a `.json` or `.csv`
              file to unlock your dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-stone-300">Upload `.json` or `.csv`</p>
              <input
                type="file"
                accept=".json,.csv"
                onChange={handleUpload}
                className="block w-full text-sm text-stone-300 file:mr-4 file:rounded-md file:border-0 file:bg-forest-600 file:px-3 file:py-2 file:text-white"
              />
              {uploadSummary && <p className="text-xs text-stone-500">{uploadSummary}</p>}
            </div>
            <Button
              onClick={() => handleConnectBank()}
              disabled={isConnectingBank || !uploadedTransactions}
            >
              {isConnectingBank ? "Uploading..." : "Upload Transactions + Unlock"}
            </Button>
            {error && <p className="text-sm text-clay-400">{error}</p>}
            {message && <p className="text-sm text-forest-300">{message}</p>}
          </CardContent>
        </Card>
      )}

      {wallet && !isCheckingTransactions && !dashboardLocked && (
        <>

          <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-[45.83%]">
              <GreenScoreDisplay
                score={greenScore?.score ?? 0}
                extraContent={
                  <>
                    <div className="p-4 rounded-lg bg-surface-900/40 border border-stone-800/60">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-forest-600/20 to-earth-600/15 border border-forest-600/20 flex-shrink-0">
                          <Landmark className="h-4 w-4 text-forest-400" strokeWidth={2.2} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                            Amount Staked
                          </p>
                          <p className="text-2xl font-display font-bold text-stone-100 tracking-tight">
                            {stakingInfo ? `${stakingInfo.stakedAmount.toFixed(4)} SOL` : "—"}
                          </p>
                          <p className="text-xs text-stone-500">
                            {hasStakePosition
                              ? "Current principal in stake vault"
                              : "No active stake yet"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-surface-900/40 border border-stone-800/60">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-forest-600/20 to-earth-600/15 border border-forest-600/20 flex-shrink-0">
                          <Coins className="h-4 w-4 text-forest-400" strokeWidth={2.2} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                            Amount Accrued So Far
                          </p>
                          <p className="text-2xl font-display font-bold text-stone-100 tracking-tight">
                            {stakingInfo ? `${stakingInfo.accruedYield.toFixed(6)} SOL` : "—"}
                          </p>
                          <p className="text-xs text-stone-500">
                            {hasStakePosition
                              ? "Yield earned to date"
                              : "Stake to start accruing rewards"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Button asChild size="lg" className="w-full">
                      <Link to="/staking">Stake More</Link>
                    </Button>
                  </>
                }
              />
            </div>
            <div className="lg:w-[54.17%] flex flex-col gap-3">
              {tickerStats.map((stat) => (
                <div
                  key={stat.label}
                  className="card-organic p-4 flex items-center gap-4 hover:scale-[1.01] transition-transform duration-300"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-forest-600/20 to-earth-600/15 border border-forest-600/20 flex-shrink-0">
                    <stat.icon className="h-4 w-4 text-forest-400" strokeWidth={2.2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-display font-bold text-stone-100 tracking-tight">
                      {stat.value}
                    </p>
                    <p className="text-xs text-stone-500">{stat.change}</p>
                  </div>
                </div>
              ))}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-forest-400" />
                    Bank Connect + Analysis
                  </CardTitle>
                  <CardDescription>
                    Use existing dashboard controls to run steps 3-5 of the workflow.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-3 items-center">
                    <label className="inline-flex items-center gap-2 text-sm text-stone-300">
                      <input
                        type="radio"
                        checked={bankMode === "preset"}
                        onChange={() => setBankMode("preset")}
                      />
                      Preset
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-stone-300">
                      <input
                        type="radio"
                        checked={bankMode === "upload"}
                        onChange={() => setBankMode("upload")}
                      />
                      Upload
                    </label>
                  </div>

                  {bankMode === "preset" && (
                    <div className="flex flex-wrap gap-2">
                      {DEMO_SCENARIOS.map((scenarioOption) => (
                        <Button
                          key={scenarioOption}
                          size="sm"
                          variant={scenarioOption === scenario ? "default" : "outline"}
                          onClick={() => setScenario(scenarioOption)}
                        >
                          {scenarioOption}
                        </Button>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-sm text-stone-300">Upload `.json` or `.csv`</p>
                    <input
                      type="file"
                      accept=".json,.csv"
                      onChange={handleUpload}
                      className="block w-full text-sm text-stone-300 file:mr-4 file:rounded-md file:border-0 file:bg-forest-600 file:px-3 file:py-2 file:text-white"
                    />
                    {uploadSummary && <p className="text-xs text-stone-500">{uploadSummary}</p>}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button onClick={handleConnectBank} disabled={isConnectingBank}>
                      {isConnectingBank ? "Connecting..." : "Connect Bank"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleAnalyzeTransactions}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? "Analyzing..." : "Analyze Transactions"}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={handleRefreshScore}
                      disabled={isRefreshing}
                    >
                      {isRefreshing ? "Refreshing..." : "Refresh Performance"}
                    </Button>
                  </div>

                  {bankConnectResult && (
                    <p className="text-sm text-forest-300">
                      Connected source: {bankConnectResult.sourceLabel} ({bankConnectResult.transactionCount} transactions)
                    </p>
                  )}

                  {error && <p className="text-sm text-clay-400">{error}</p>}
                  {message && <p className="text-sm text-forest-300">{message}</p>}
                </CardContent>
              </Card>
            </div>
          </div>

          {analysisResult && (
            <Card>
              <CardHeader>
                <CardTitle>Loaded Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-stone-400 border-b border-stone-800">
                        <th className="py-2 pr-3">Description</th>
                        <th className="py-2 pr-3">Amount</th>
                        <th className="py-2 pr-3">Category</th>
                        <th className="py-2 pr-3">CO₂e (g)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysisResult.transactions.map((transaction) => (
                        <tr
                          key={transaction.transactionId}
                          className="border-b border-stone-900 text-stone-300"
                        >
                          <td className="py-2 pr-3">{transaction.description}</td>
                          <td className="py-2 pr-3">${transaction.amountUsd.toFixed(2)}</td>
                          <td className="py-2 pr-3">{transaction.category}</td>
                          <td className="py-2 pr-3">{transaction.co2eGrams.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          <div>
            <CarbonFootprintChart />
          </div>
        </>
      )}
    </div>
  );
}
