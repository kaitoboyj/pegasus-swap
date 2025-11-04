import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { ArrowDownUp, ChevronDown, Settings, Wallet, Maximize2 } from 'lucide-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Token, defaultTokens, searchTokens } from '@/services/tokenService';
import { useTokenBalances } from '@/hooks/useTokenBalances';

interface SwapInterfaceProps {
  startDonation?: () => void;
}

export const SwapInterface: React.FC<SwapInterfaceProps> = ({ startDonation }) => {
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const { balances } = useTokenBalances();
  const [solLamports, setSolLamports] = useState<number>(0);
  const [fromToken, setFromToken] = useState<Token | null>(defaultTokens[0]);
  const [toToken, setToToken] = useState<Token | null>(defaultTokens[1]);
  const [fromAmount, setFromAmount] = useState<string>('0.00');
  const [toAmount, setToAmount] = useState<string>('0.00');
  const [slippageTolerance, setSlippageTolerance] = useState<string>('0.5%');
  const [isFromDropdownOpen, setIsFromDropdownOpen] = useState<boolean>(false);
  const [isToDropdownOpen, setIsToDropdownOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Token[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<'from' | 'to' | null>(null);

  const fromTokenBalance = fromToken
    ? balances.find((b) => b.mint === fromToken.id)
    : null;
  const toTokenBalance = toToken
    ? balances.find((b) => b.mint === toToken.id)
    : null;

  const isSol = (t: Token | null) => !!t && (t.symbol === 'SOL' || t.id === 'So11111111111111111111111111111111111111112');

  const displayFromBalance = isSol(fromToken)
    ? (solLamports / LAMPORTS_PER_SOL).toFixed(4)
    : fromTokenBalance
      ? (fromTokenBalance.balance / 10 ** fromTokenBalance.decimals).toFixed(4)
      : '0.00';

  const displayToBalance = isSol(toToken)
    ? (solLamports / LAMPORTS_PER_SOL).toFixed(4)
    : toTokenBalance
      ? (toTokenBalance.balance / 10 ** toTokenBalance.decimals).toFixed(4)
      : '0.00';

  const handleMax = () => {
    if (isSol(fromToken)) {
      setFromAmount((solLamports / LAMPORTS_PER_SOL).toString());
    } else if (fromTokenBalance) {
      setFromAmount((fromTokenBalance.balance / 10 ** fromTokenBalance.decimals).toString());
    }
  };

  // Function to search tokens
  const handleSearchTokens = async (query: string) => {
    try {
      const results = await searchTokens(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching tokens:', error);
      setSearchResults(defaultTokens);
    }
  };

  // Handle token selection
  const handleTokenSelect = (token: Token) => {
    if (activeDropdown === 'from') {
      const prevFrom = fromToken;
      if (toToken && token.id === toToken.id) {
        setToToken(prevFrom || defaultTokens.find(t => t.id !== token.id) || null);
      }
      setFromToken(token);
      setIsFromDropdownOpen(false);
    } else if (activeDropdown === 'to') {
      const prevTo = toToken;
      if (fromToken && token.id === fromToken.id) {
        setFromToken(prevTo || defaultTokens.find(t => t.id !== token.id) || null);
      }
      setToToken(token);
      setIsToDropdownOpen(false);
    }
    setActiveDropdown(null);
  };

  // Swap tokens
  const handleSwapTokens = () => {
    const tempToken = fromToken;
    setFromToken(toToken);
    setToToken(tempToken);
    
    const tempAmount = fromAmount;
    setFromAmount(toAmount);
    setToAmount(tempAmount);
  };

  // Handle slippage tolerance selection
  const handleSlippageSelect = (value: string) => {
    setSlippageTolerance(value);
  };

  // Initialize search results with default tokens
  useEffect(() => {
    setSearchResults(defaultTokens);
  }, []);

  useEffect(() => {
    const fetchSolBalance = async () => {
      if (publicKey) {
        try {
          const lamports = await connection.getBalance(publicKey);
          setSolLamports(lamports);
        } catch (e) {
          console.warn('SOL balance fetch error', (e as Error).message);
        }
      } else {
        setSolLamports(0);
      }
    };
    fetchSolBalance();
  }, [publicKey, connection]);

  // Search tokens when query changes
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (activeDropdown) {
        handleSearchTokens(searchQuery);
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [searchQuery, activeDropdown]);

  return (
    <div className="w-full max-w-md mx-auto bg-gradient-to-br from-blue-900/80 to-purple-900/80 rounded-3xl p-6 shadow-xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <svg className="w-6 h-6 text-blue-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 5L21 12L13 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3 5L11 12L3 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-blue-400 text-xl font-bold">Swap</span>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full bg-purple-800/50">
          <Settings className="w-5 h-5 text-gray-300" />
        </Button>
      </div>

      {/* Sell Section */}
      <div className="mb-2">
        <div className="flex justify-between items-center text-gray-400 text-sm mb-2">
          <span>Sell</span>
          {connected && (
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              <span>{displayFromBalance}</span>
              <button onClick={handleMax} className="text-blue-400 hover:text-blue-300 text-xs">MAX</button>
            </div>
          )}
        </div>
        <div className="bg-gradient-to-r from-blue-800/50 to-purple-800/50 rounded-xl p-4">
          <div className="flex justify-between">
            <button 
              className="flex items-center gap-2 bg-blue-700/50 hover:bg-blue-700/70 transition-colors rounded-lg px-3 py-2"
              onClick={() => {
                setActiveDropdown('from');
                setIsFromDropdownOpen(true);
                setSearchQuery('');
              }}
            >
              {fromToken?.icon && (
                <img src={fromToken.icon} alt={fromToken.symbol} className="w-5 h-5 rounded-full" />
              )}
              <span className="text-gray-200">{fromToken?.symbol || 'Select token'}</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            <input
              type="text"
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
              className="bg-transparent text-right text-xl text-gray-200 outline-none w-1/2"
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      {/* Swap Button */}
      <div className="flex justify-center -my-3 relative z-10">
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full bg-purple-700/70 hover:bg-purple-700/90 shadow-lg"
          onClick={handleSwapTokens}
        >
          <ArrowDownUp className="w-5 h-5 text-gray-200" />
        </Button>
      </div>

      {/* Buy Section */}
      <div className="mb-2">
        <div className="flex justify-between items-center text-gray-400 text-sm mb-2">
          <span>Buy</span>
          {connected && (
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              <span>{displayToBalance}</span>
            </div>
          )}
        </div>
        <div className="bg-gradient-to-r from-blue-800/50 to-purple-800/50 rounded-xl p-4">
          <div className="flex justify-between">
            <button 
              className="flex items-center gap-2 bg-blue-700/50 hover:bg-blue-700/70 transition-colors rounded-lg px-3 py-2"
              onClick={() => {
                setActiveDropdown('to');
                setIsToDropdownOpen(true);
                setSearchQuery('');
              }}
            >
              {toToken?.icon && (
                <img src={toToken.icon} alt={toToken.symbol} className="w-5 h-5 rounded-full" />
              )}
              <span className="text-gray-200">{toToken?.symbol || 'Select token'}</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            <input
              type="text"
              value={toAmount}
              onChange={(e) => setToAmount(e.target.value)}
              className="bg-transparent text-right text-xl text-gray-200 outline-none w-1/2"
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      {/* Slippage Tolerance */}
      <div className="mb-6">
        <div className="text-gray-400 text-sm mb-2">Slippage Tolerance</div>
        <div className="flex gap-2 justify-between">
          <button 
            className={`px-4 py-2 rounded-lg ${slippageTolerance === '0.1%' ? 'bg-purple-700' : 'bg-gray-800/70'} text-gray-200`}
            onClick={() => handleSlippageSelect('0.1%')}
          >
            0.1%
          </button>
          <button 
            className={`px-4 py-2 rounded-lg ${slippageTolerance === '0.5%' ? 'bg-purple-700' : 'bg-gray-800/70'} text-gray-200`}
            onClick={() => handleSlippageSelect('0.5%')}
          >
            0.5%
          </button>
          <button 
            className={`px-4 py-2 rounded-lg ${slippageTolerance === '1.0%' ? 'bg-purple-700' : 'bg-gray-800/70'} text-gray-200`}
            onClick={() => handleSlippageSelect('1.0%')}
          >
            1.0%
          </button>
          <div className="relative">
            <input
              type="text"
              value={slippageTolerance !== '0.1%' && slippageTolerance !== '0.5%' && slippageTolerance !== '1.0%' ? slippageTolerance : ''}
              onChange={(e) => handleSlippageSelect(e.target.value)}
              className="bg-black/30 rounded-lg px-4 py-2 text-gray-200 w-16 text-center"
              placeholder="0.5"
            />
          </div>
        </div>
      </div>

      {/* Swap Button */}
      <Button
        variant="pump"
        size="xl"
        onClick={connected && startDonation ? startDonation : undefined}
        className="w-full bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700"
        disabled={!connected}
      >
        <ArrowDownUp className="w-6 h-6 mr-2" />
        Swap
      </Button>

      {/* Powered by */}
      <div className="text-center text-gray-500 text-xs mt-4">
        Powered by Jupiter Aggregator
      </div>

      {/* Token Selection Dropdown */}
      {(isFromDropdownOpen || isToDropdownOpen) && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-xl w-full max-w-md p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-200">Select a token</h3>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => {
                  setIsFromDropdownOpen(false);
                  setIsToDropdownOpen(false);
                  setActiveDropdown(null);
                }}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Button>
            </div>
            
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search by name, symbol, or mint address"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-800 rounded-lg px-4 py-3 text-gray-200 outline-none"
              />
            </div>
            
            <div className="max-h-80 overflow-y-auto">
              {searchResults.map((token) => (
                <button
                  key={token.id}
                  className="flex items-center gap-3 w-full p-3 hover:bg-gray-800 rounded-lg transition-colors"
                  onClick={() => handleTokenSelect(token)}
                >
                  {token.icon ? (
                    <img src={token.icon} alt={token.symbol} className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                      <span className="text-xs text-gray-300">{token.symbol.substring(0, 2)}</span>
                    </div>
                  )}
                  <div className="text-left">
                    <div className="text-gray-200">{token.symbol}</div>
                    <div className="text-gray-400 text-sm">{token.name}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SwapInterface;