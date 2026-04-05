import { useState, useCallback, useMemo } from "react";

interface StakingResult {
  principal: number;
  apy: number;
  durationDays: number;
  estimatedYield: number;
  greenBonus: number;
  totalReward: number;
}

/**
 * Hook to simulate SOL staking yield calculations with a green bonus multiplier.
 * The green bonus rewards users who maintain a higher green score.
 */
export function useSolanaStaking() {
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<StakingResult | null>(null);

  const BASE_APY = 6.5; // Average Solana staking APY
  const GREEN_BONUS_MAX = 2.5; // Max additional APY for top green scorers

  const calculate = useCallback(
    (principal: number, durationDays: number, greenScore: number) => {
      setIsCalculating(true);

      // Simulate async calculation
      setTimeout(() => {
        const greenBonus = (greenScore / 100) * GREEN_BONUS_MAX;
        const effectiveApy = BASE_APY + greenBonus;
        const dailyRate = effectiveApy / 100 / 365;
        const estimatedYield = principal * dailyRate * durationDays;
        const totalReward = principal + estimatedYield;

        setResult({
          principal,
          apy: effectiveApy,
          durationDays,
          estimatedYield: parseFloat(estimatedYield.toFixed(6)),
          greenBonus: parseFloat(greenBonus.toFixed(2)),
          totalReward: parseFloat(totalReward.toFixed(6)),
        });

        setIsCalculating(false);
      }, 300);
    },
    []
  );

  const reset = useCallback(() => {
    setResult(null);
  }, []);

  return useMemo(
    () => ({ result, isCalculating, calculate, reset, BASE_APY, GREEN_BONUS_MAX }),
    [result, isCalculating, calculate, reset]
  );
}
