import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { ExternalLink, Landmark, PenLine, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Slider } from "@/components/ui/Slider";
import { useWalletState } from "@/hooks/useWalletState";
import {
  formatError,
  requestJson,
  type StakingInfoResponse,
} from "@/lib/api";
import { parseUploadFile, type DemoMode, type DemoTransactionInput } from "@/lib/demoBank";
import {
  markUploadCompleted,
  uploadEpochGate,
  isUploadRefreshRequiredForTimestamp,
} from "@/lib/uploadEpochGate";

interface SimulateStakeResponse {
  principal: number;
  durationDays: number;
  baseApy: number;
  greenBonus: number;
  effectiveApy: number;
  estimatedYield: number;
  totalReturn: number;
}

interface StakeResponse {
  wallet: string;
  amount: number;
  durationDays: number;
  greenScore: number;
  effectiveApy: number;
  estimatedYield: number;
  vaultAddress: string;
  solanaSignature: string;
  status: "confirmed" | "failed";
}

interface DemoConnectBankResponse {
  wallet: string;
  mode: DemoMode;
  sourceLabel: string;
  transactionCount: number;
  connectedAt: string;
}

function clampAmount(value: number): number {
  if (!Number.isFinite(value)) {
    return 0.1;
  }

  return Math.min(100, Math.max(0.1, Number(value.toFixed(1))));
}

function clampDuration(value: number): number {
  if (!Number.isFinite(value)) {
    return 7;
  }

  return Math.min(365, Math.max(7, Math.round(value)));
}

export default function Staking() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const wallet = publicKey?.toBase58() ?? null;
  const {
    data: walletState,
    isLoading: isHydratingState,
    error: walletStateError,
    refetch: refetchWalletState,
  } = useWalletState(wallet);

  const [amount, setAmount] = useState(1);
  const [duration, setDuration] = useState(30);
  const [simulation, setSimulation] = useState<SimulateStakeResponse | null>(null);
  const [stakeResult, setStakeResult] = useState<StakeResponse | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadedTransactions, setUploadedTransactions] =
    useState<DemoTransactionInput[] | null>(null);
  const [uploadSummary, setUploadSummary] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [isStaking, setIsStaking] = useState(false);
  const [isUploadingLedger, setIsUploadingLedger] = useState(false);
  const [uploadGateError, setUploadGateError] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const greenScore = walletState?.greenScore;
  const stakingInfo = walletState?.stakingInfo as StakingInfoResponse | null;
  const score = greenScore?.score ?? 0;
  const hasUploadedTransactions = walletState?.hasUploadedTransactions ?? false;
  const uploadRefreshRequired = useMemo(
    () => isUploadRefreshRequiredForTimestamp(walletState?.latestUploadAt),
    [walletState?.latestUploadAt]
  );
  const stakingBlocked =
    Boolean(wallet) &&
    !isHydratingState &&
    (!hasUploadedTransactions || uploadRefreshRequired);
  const explorerUrl = stakeResult?.solanaSignature
    ? `https://explorer.solana.com/tx/${stakeResult.solanaSignature}?cluster=devnet`
    : null;

  useEffect(() => {
    if (!wallet) {
      setShowUploadModal(false);
      setUploadedTransactions(null);
      setUploadSummary("");
      setUploadGateError("");
      setSimulation(null);
      setStakeResult(null);
      setError("");
      setMessage("");
      return;
    }

    if (!isHydratingState) {
      setShowUploadModal(stakingBlocked);
    }
  }, [wallet, isHydratingState, stakingBlocked]);

  async function handleUploadForGate(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const parsed = await parseUploadFile(file);
      setUploadedTransactions(parsed);
      setUploadSummary(`Loaded ${parsed.length} transactions from ${file.name}`);
      setUploadGateError("");
    } catch (uploadError) {
      setUploadedTransactions(null);
      setUploadSummary("");
      setUploadGateError(formatError(uploadError));
    } finally {
      event.target.value = "";
    }
  }

  async function handleUploadAndUnlock() {
    if (!wallet) {
      setUploadGateError("Connect your wallet first.");
      return;
    }

    if (!uploadedTransactions) {
      setUploadGateError("Upload a JSON or CSV file first.");
      return;
    }

    setUploadGateError("");
    setIsUploadingLedger(true);

    try {
      const response = await requestJson<DemoConnectBankResponse>("/api/demo/connect-bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet,
          mode: "upload",
          transactions: uploadedTransactions,
        }),
      });

      if (response.transactionCount > 0) {
        markUploadCompleted(wallet, response.connectedAt);
        await refetchWalletState();
        setShowUploadModal(false);
        setMessage("Transactions uploaded. Staking is now unlocked.");
      } else {
        setUploadGateError("No transactions were uploaded. Please try another file.");
      }
    } catch (uploadError) {
      setUploadGateError(formatError(uploadError));
    } finally {
      setIsUploadingLedger(false);
    }
  }

  async function simulate() {
    setError("");
    setMessage("");
    setIsSimulating(true);

    try {
      const response = await requestJson<SimulateStakeResponse>("/api/simulate-stake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          durationDays: duration,
          greenScore: score,
        }),
      });

      setSimulation(response);
    } catch (simulationError) {
      setError(formatError(simulationError));
    } finally {
      setIsSimulating(false);
    }
  }

  async function signAndStake() {
    if (!wallet || !publicKey || !sendTransaction) {
      setError("Connect a wallet with signing support first.");
      return;
    }

    if (stakingBlocked) {
      setShowUploadModal(true);
      setError("Upload recent transactions before staking.");
      return;
    }

    setError("");
    setMessage("");
    setIsStaking(true);

    try {
      const info = await requestJson<StakingInfoResponse>(
        `/api/staking-info?wallet=${encodeURIComponent(wallet)}`
      );
      if (!info.stakeVaultAddress) {
        throw new Error("Stake vault address is not configured.");
      }

      const lamports = Math.round(amount * LAMPORTS_PER_SOL);
      if (lamports <= 0) {
        throw new Error("Stake amount is too small.");
      }

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash("confirmed");
      const vaultPubkey = new PublicKey(info.stakeVaultAddress);

      const transaction = new Transaction({
        feePayer: publicKey,
        blockhash,
        lastValidBlockHeight,
      }).add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: vaultPubkey,
          lamports,
        })
      );

      const signature = await sendTransaction(transaction, connection, {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });

      await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        "confirmed"
      );

      const response = await requestJson<StakeResponse>("/api/stake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet,
          amount,
          durationDays: duration,
          solanaSignature: signature,
        }),
      });

      setStakeResult(response);
      setMessage(`Stake confirmed with wallet signature ${response.solanaSignature}.`);
      await refetchWalletState();
    } catch (stakeError) {
      setError(formatError(stakeError));
    } finally {
      setIsStaking(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Green Staking</h1>
        <p className="text-gray-400 mt-1">
          Simulate APY, then sign and submit a staking transfer from your wallet.
        </p>
      </div>

      {!wallet && (
        <Card>
          <CardHeader>
            <CardTitle>Connect Wallet to Continue</CardTitle>
            <CardDescription>
              Connect your wallet from the sidebar to load your staking state.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {wallet && isHydratingState && (
        <Card>
          <CardHeader>
            <CardTitle>Loading Staking State</CardTitle>
            <CardDescription>
              Restoring your latest uploads, score, and staking position from Mongo.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {wallet && walletStateError && !isHydratingState && (
        <Card>
          <CardHeader>
            <CardTitle>State Load Error</CardTitle>
            <CardDescription>{walletStateError}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-accent-emerald" />
              Stake SOL
            </CardTitle>
            <CardDescription>
              Current Green Score:{" "}
              <span className="text-accent-emerald font-semibold">{score.toFixed(2)}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <span className="text-gray-400">Amount (SOL)</span>
                <input
                  type="number"
                  min={0.1}
                  max={100}
                  step={0.1}
                  value={amount}
                  onChange={(event) => setAmount(clampAmount(Number(event.target.value)))}
                  className="w-28 rounded-lg border border-stone-800 bg-surface-950/60 px-3 py-2 text-right text-sm text-stone-200"
                />
              </div>
              <Slider
                min={0.1}
                max={100}
                step={0.1}
                value={[amount]}
                onValueChange={([value]) => value !== undefined && setAmount(clampAmount(value))}
              />
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <span className="text-gray-400">Duration (days)</span>
                <input
                  type="number"
                  min={7}
                  max={365}
                  step={1}
                  value={duration}
                  onChange={(event) => setDuration(clampDuration(Number(event.target.value)))}
                  className="w-28 rounded-lg border border-stone-800 bg-surface-950/60 px-3 py-2 text-right text-sm text-stone-200"
                />
              </div>
              <Slider
                min={7}
                max={365}
                step={1}
                value={[duration]}
                onValueChange={([value]) =>
                  value !== undefined && setDuration(clampDuration(value))
                }
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button size="lg" disabled={isSimulating || !wallet} onClick={simulate}>
                <Sparkles className="h-4 w-4" />
                {isSimulating ? "Simulating..." : "Simulate Yield"}
              </Button>
              <Button
                size="lg"
                variant="secondary"
                disabled={isStaking || stakingBlocked || isHydratingState || !wallet}
                onClick={signAndStake}
              >
                <PenLine className="h-4 w-4" />
                {isStaking ? "Signing + Staking..." : "Sign & Stake"}
              </Button>
            </div>

            {wallet && stakingBlocked && !isHydratingState && (
              <p className="text-sm text-solar-400">
                Upload recent transactions every {uploadEpochGate.refreshWindowDays} days to
                keep staking enabled.
              </p>
            )}
            {error && <p className="text-sm text-clay-400">{error}</p>}
            {message && <p className="text-sm text-forest-300">{message}</p>}
          </CardContent>
        </Card>

        <Card className={simulation || stakeResult ? "glow-green" : ""}>
          <CardHeader>
            <CardTitle>Yield + Status</CardTitle>
          </CardHeader>
          <CardContent>
            {simulation ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-surface-300/50">
                  <span className="text-sm text-gray-400">Base APY</span>
                  <span className="font-mono font-semibold text-white">
                    {simulation.baseApy.toFixed(4)}%
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-surface-300/50">
                  <span className="text-sm text-gray-400">Green Bonus</span>
                  <span className="font-mono font-semibold text-accent-emerald">
                    +{simulation.greenBonus.toFixed(4)}%
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-surface-300/50">
                  <span className="text-sm text-gray-400">Effective APY</span>
                  <span className="font-mono font-semibold text-white">
                    {simulation.effectiveApy.toFixed(4)}%
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-surface-300/50">
                  <span className="text-sm text-gray-400">Estimated Yield</span>
                  <span className="font-mono font-semibold text-accent-emerald">
                    {simulation.estimatedYield.toFixed(6)} SOL
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-400">Total Return</span>
                  <span className="font-mono text-xl gradient-text">
                    {simulation.totalReturn.toFixed(6)} SOL
                  </span>
                </div>
                {stakeResult && (
                  <div className="rounded-lg border border-stone-700 bg-surface-900/40 p-3 space-y-2">
                    <p className="text-xs text-stone-400">Latest Stake Signature</p>
                    <p className="font-mono text-xs break-all text-forest-300">
                      {stakeResult.solanaSignature}
                    </p>
                    {explorerUrl && (
                      <a
                        href={explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-forest-300 hover:text-forest-200"
                      >
                        View on Solana Explorer
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                )}
                {stakingInfo && (
                  <p className="text-xs text-stone-500">
                    Total staked: {stakingInfo.stakedAmount.toFixed(4)} SOL | Accrued yield:{" "}
                    {stakingInfo.accruedYield.toFixed(6)} SOL
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-gray-500 text-sm">
                <Landmark className="h-8 w-8 mb-3 opacity-30" />
                Configure inputs and simulate, then sign to stake.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {wallet && showUploadModal && !isHydratingState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-surface-950/85 backdrop-blur-sm"
            onClick={() => setShowUploadModal(false)}
            aria-label="Close upload prompt"
          />
          <Card className="relative z-10 w-full max-w-lg border-forest-600/35">
            <CardHeader>
              <CardTitle>Upload Transactions Before Staking</CardTitle>
              <CardDescription>
                {hasUploadedTransactions && uploadRefreshRequired
                  ? `Your last upload is older than ${uploadEpochGate.refreshWindowDays} days. Upload a fresh transaction file to keep staking enabled.`
                  : "We need recent uploaded transactions to calculate your green booster before you stake."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                type="file"
                accept=".json,.csv"
                onChange={handleUploadForGate}
                className="block w-full rounded-lg border border-stone-800 bg-surface-950/60 px-3 py-2 text-sm text-stone-300 file:mr-3 file:rounded-md file:border-0 file:bg-forest-600 file:px-3 file:py-1.5 file:text-white file:font-medium"
              />
              {uploadSummary && <p className="text-xs text-stone-400">{uploadSummary}</p>}
              {uploadGateError && <p className="text-sm text-clay-400">{uploadGateError}</p>}
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleUploadAndUnlock}
                  disabled={isUploadingLedger || !uploadedTransactions}
                >
                  {isUploadingLedger ? "Uploading..." : "Upload + Unlock Staking"}
                </Button>
                <Button variant="outline" onClick={() => setShowUploadModal(false)}>
                  Later
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
