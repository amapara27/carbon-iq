import { useState, useEffect, useCallback, useMemo } from "react";

interface GreenScoreData {
  score: number;
  breakdown: {
    transactionEfficiency: number;
    stakingHistory: number;
    carbonOffsets: number;
    communityImpact: number;
  };
  rank: number;
  totalUsers: number;
}

/**
 * Hook to fetch the user's green score from the backend API.
 * Falls back to mock data when the API is unavailable.
 */
export function useGreenScore(walletAddress: string | null) {
  const [data, setData] = useState<GreenScoreData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchScore = useCallback(async () => {
    if (!walletAddress) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/green-score?wallet=${walletAddress}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch {
      // Fallback to mock data during development
      setData({
        score: 72,
        breakdown: {
          transactionEfficiency: 85,
          stakingHistory: 60,
          carbonOffsets: 78,
          communityImpact: 65,
        },
        rank: 142,
        totalUsers: 1_893,
      });
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchScore();
  }, [fetchScore]);

  return useMemo(
    () => ({ data, isLoading, error, refetch: fetchScore }),
    [data, isLoading, error, fetchScore]
  );
}
