'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { CONTRACTS, ABIS } from '@/lib/contracts';

export function HalalTokenCard() {
  const { address } = useAccount();
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [delegateTo, setDelegateTo] = useState('');

  const { data: balance } = useReadContract({
    address: CONTRACTS.HalalToken as `0x${string}`,
    abi: ABIS.HalalToken,
    functionName: 'balanceOf',
    args: [address],
  });

  const { data: totalSupply } = useReadContract({
    address: CONTRACTS.HalalToken as `0x${string}`,
    abi: ABIS.HalalToken,
    functionName: 'totalSupply',
  });

  const { data: votes } = useReadContract({
    address: CONTRACTS.HalalToken as `0x${string}`,
    abi: ABIS.HalalToken,
    functionName: 'getVotes',
    args: [address],
  });

  const { writeContract: transfer, data: transferHash } = useWriteContract();
  const { writeContract: delegate, data: delegateHash } = useWriteContract();

  const { isLoading: isTransferring } = useWaitForTransactionReceipt({ hash: transferHash });
  const { isLoading: isDelegating } = useWaitForTransactionReceipt({ hash: delegateHash });

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferTo || !transferAmount) return;

    transfer({
      address: CONTRACTS.HalalToken as `0x${string}`,
      abi: ABIS.HalalToken,
      functionName: 'transfer',
      args: [transferTo as `0x${string}`, parseEther(transferAmount)],
    });
  };

  const handleDelegate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delegateTo) return;

    delegate({
      address: CONTRACTS.HalalToken as `0x${string}`,
      abi: ABIS.HalalToken,
      functionName: 'delegate',
      args: [delegateTo as `0x${string}`],
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-3xl">🪙</div>
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">HALAL Token</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Governance Token</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">Your Balance</p>
            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
              {balance ? formatEther(balance as bigint).substring(0, 10) : '0'} HALAL
            </p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">Voting Power</p>
            <p className="text-lg font-bold text-blue-700 dark:text-blue-400">
              {votes ? formatEther(votes as bigint).substring(0, 10) : '0'}
            </p>
          </div>
        </div>

        {/* Transfer Form */}
        <form onSubmit={handleTransfer} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Transfer To
            </label>
            <input
              type="text"
              value={transferTo}
              onChange={(e) => setTransferTo(e.target.value)}
              placeholder="0x..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Amount
            </label>
            <input
              type="number"
              step="0.01"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              placeholder="0.0"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={isTransferring}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
          >
            {isTransferring ? 'Transferring...' : 'Transfer'}
          </button>
        </form>

        {/* Delegate Form */}
        <form onSubmit={handleDelegate} className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Delegate Votes To
            </label>
            <input
              type="text"
              value={delegateTo}
              onChange={(e) => setDelegateTo(e.target.value)}
              placeholder="0x... or your address"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={isDelegating}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
          >
            {isDelegating ? 'Delegating...' : 'Delegate'}
          </button>
        </form>
      </div>
    </div>
  );
}
