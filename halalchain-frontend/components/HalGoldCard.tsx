'use client';

import { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { CONTRACTS, ABIS } from '@/lib/contracts';

export function HalGoldCard() {
  const { address } = useAccount();
  const [mintTo, setMintTo] = useState('');
  const [mintAmount, setMintAmount] = useState('');

  const { data: balance } = useReadContract({
    address: CONTRACTS.HalGoldStablecoin as `0x${string}`,
    abi: ABIS.HalGoldStablecoin,
    functionName: 'balanceOf',
    args: [address],
  });

  const { data: totalSupply } = useReadContract({
    address: CONTRACTS.HalGoldStablecoin as `0x${string}`,
    abi: ABIS.HalGoldStablecoin,
    functionName: 'totalSupply',
  });

  const { data: paused } = useReadContract({
    address: CONTRACTS.HalGoldStablecoin as `0x${string}`,
    abi: ABIS.HalGoldStablecoin,
    functionName: 'paused',
  });

  const { writeContract: mint, data: mintHash } = useWriteContract();
  const { isLoading: isMinting } = useWaitForTransactionReceipt({ hash: mintHash });

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mintTo || !mintAmount) return;

    mint({
      address: CONTRACTS.HalGoldStablecoin as `0x${string}`,
      abi: ABIS.HalGoldStablecoin,
      functionName: 'mint',
      args: [mintTo as `0x${string}`, parseEther(mintAmount)],
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-3xl">🥇</div>
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">HAL-GOLD</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">100% Gold-Backed Stablecoin</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">Your Balance</p>
            <p className="text-lg font-bold text-yellow-700 dark:text-yellow-400">
              {balance ? formatEther(balance as bigint).substring(0, 10) : '0'} H-GOLD
            </p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">Status</p>
            <p className="text-lg font-bold text-purple-700 dark:text-purple-400">
              {paused ? '⏸️ Paused' : '✅ Active'}
            </p>
          </div>
        </div>

        <form onSubmit={handleMint} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Mint To Address
            </label>
            <input
              type="text"
              value={mintTo}
              onChange={(e) => setMintTo(e.target.value)}
              placeholder="0x..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Amount (grams of gold)
            </label>
            <input
              type="number"
              step="0.01"
              value={mintAmount}
              onChange={(e) => setMintAmount(e.target.value)}
              placeholder="0.0"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={isMinting || paused}
            className="w-full py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
          >
            {isMinting ? 'Minting...' : paused ? 'Contract Paused' : 'Mint HAL-GOLD'}
          </button>
        </form>

        <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
          ⚠️ Minting requires OPERATOR_ROLE and sufficient reserves
        </div>
      </div>
    </div>
  );
}
