'use client';

import { useState } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { CONTRACTS, ABIS } from '@/lib/contracts';

export function TreasuryCard() {
  const { address } = useAccount();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');

  const { data: halalBalance } = useReadContract({
    address: CONTRACTS.HalalToken as `0x${string}`,
    abi: ABIS.HalalToken,
    functionName: 'balanceOf',
    args: [CONTRACTS.Treasury as `0x${string}`],
  });

  const { data: halGoldBalance } = useReadContract({
    address: CONTRACTS.HalGoldStablecoin as `0x${string}`,
    abi: ABIS.HalGoldStablecoin,
    functionName: 'balanceOf',
    args: [CONTRACTS.Treasury as `0x${string}`],
  });

  const { data: totalAllocated } = useReadContract({
    address: CONTRACTS.Treasury as `0x${string}`,
    abi: ABIS.Treasury,
    functionName: 'totalAllocated',
  });

  const { writeContract: allocate, isPending: isAllocating } = useWriteContract();

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient || !amount) return;

    allocate({
      address: CONTRACTS.Treasury as `0x${string}`,
      abi: ABIS.Treasury,
      functionName: 'allocate',
      args: [recipient as `0x${string}`, parseEther(amount), 'Treasury allocation'],
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-3xl">🏦</div>
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Treasury</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">DAO Fund Management</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Treasury Balances */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">HALAL Balance</p>
            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
              {halalBalance ? formatEther(halalBalance as bigint).substring(0, 10) : '0'}
            </p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">HAL-GOLD Balance</p>
            <p className="text-lg font-bold text-yellow-700 dark:text-yellow-400">
              {halGoldBalance ? formatEther(halGoldBalance as bigint).substring(0, 10) : '0'}
            </p>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400">Total Allocated</p>
          <p className="text-lg font-bold text-blue-700 dark:text-blue-400">
            {totalAllocated ? formatEther(totalAllocated as bigint).substring(0, 10) : '0'} HAL-GOLD
          </p>
        </div>

        {/* Allocate Funds */}
        <form onSubmit={handleAllocate} className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Allocate Funds
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Recipient address"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-2"
            />
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount (HAL-GOLD)"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={isAllocating}
            className="w-full py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
          >
            {isAllocating ? 'Allocating...' : 'Allocate Funds'}
          </button>
        </form>

        <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
          ⚠️ Allocation requires DAO approval via governance proposal
        </div>
      </div>
    </div>
  );
}
