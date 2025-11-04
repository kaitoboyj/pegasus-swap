import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

const JUPITER_API_URL = 'https://lite-api.jup.ag/ultra/v1/holdings/';

export interface TokenBalance {
  mint: string;
  balance: number;
  decimals: number;
}

export const useTokenBalances = () => {
  const { publicKey } = useWallet();
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    const fetchBalances = async () => {
      if (!publicKey) {
        setBalances([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${JUPITER_API_URL}${publicKey.toBase58()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch token balances');
        }
        const data = await response.json();
        
        const formattedBalances: TokenBalance[] = data.map((item: any) => ({
            mint: item.mint,
            balance: item.balance,
            decimals: item.decimals,
        }));

        setBalances(formattedBalances);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchBalances();

    const interval = setInterval(fetchBalances, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [publicKey]);

  return { balances, loading, error };
};