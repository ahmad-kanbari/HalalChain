'use client';

import { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { CONTRACTS, ABIS } from '@/lib/contracts';

export function StrategyManagerCard() {
  const { address } = useAccount();
  const [strategyId, setStrategyId] = useState('');
  const [allocateAmount, setAllocateAmount] = useState('');

  // Read total allocated and APY
  const { data: totalAllocated } = useReadContract({
    address: CONTRACTS.StrategyManager as `0x${string}`,
    abi: ABIS.StrategyManager,
    functionName: 'totalAllocated',
  });

  const { data: totalAPY } = useReadContract({
    address: CONTRACTS.StrategyManager as `0x${string}`,
    abi: ABIS.StrategyManager,
    functionName: 'getTotalAPY',
  });

  const { data: totalReturns } = useReadContract({
    address: CONTRACTS.StrategyManager as `0x${string}`,
    abi: ABIS.StrategyManager,
    functionName: 'totalReturnsEarned',
  });

  const { data: totalPendingReturns } = useReadContract({
    address: CONTRACTS.StrategyManager as `0x${string}`,
    abi: ABIS.StrategyManager,
    functionName: 'getTotalPendingReturns',
  });

  // Strategy 0 - Sukuk Strategy
  const { data: strategy0 } = useReadContract({
    address: CONTRACTS.StrategyManager as `0x${string}`,
    abi: ABIS.StrategyManager,
    functionName: 'getStrategy',
    args: [BigInt(0)],
  });

  // Strategy 1 - Treasury Bill Strategy
  const { data: strategy1 } = useReadContract({
    address: CONTRACTS.StrategyManager as `0x${string}`,
    abi: ABIS.StrategyManager,
    functionName: 'getStrategy',
    args: [BigInt(1)],
  });

  // Strategy 2 - Business Financing Strategy
  const { data: strategy2 } = useReadContract({
    address: CONTRACTS.StrategyManager as `0x${string}`,
    abi: ABIS.StrategyManager,
    functionName: 'getStrategy',
    args: [BigInt(2)],
  });

  const { writeContract: harvestAll, data: harvestHash } = useWriteContract();
  const { writeContract: allocate, data: allocateHash } = useWriteContract();

  const { isLoading: isHarvesting } = useWaitForTransactionReceipt({ hash: harvestHash });
  const { isLoading: isAllocating } = useWaitForTransactionReceipt({ hash: allocateHash });

  const handleHarvestAll = () => {
    harvestAll({
      address: CONTRACTS.StrategyManager as `0x${string}`,
      abi: ABIS.StrategyManager,
      functionName: 'harvestAll',
    });
  };

  const handleAllocate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!strategyId || !allocateAmount) return;

    allocate({
      address: CONTRACTS.StrategyManager as `0x${string}`,
      abi: ABIS.StrategyManager,
      functionName: 'allocateToStrategy',
      args: [BigInt(strategyId), parseEther(allocateAmount)],
    });
  };

  const formatAPY = (apy: any) => {
    if (!apy) return '0.00';
    return (Number(apy) / 100).toFixed(2);
  };

  const renderStrategy = (strategy: any, id: number) => {
    if (!strategy || strategy[0] === '0x0000000000000000000000000000000000000000') return null;

    const [, allocation, , totalReturns, , active, name] = strategy;

    return (
      <div key={id} className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-gray-800 dark:text-white text-sm">{name || `Strategy ${id}`}</h4>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            active ? 'bg-green-500/20 text-green-700 dark:text-green-400' : 'bg-red-500/20 text-red-700 dark:text-red-400'
          }`}>
            {active ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-gray-600 dark:text-gray-400">Allocated</p>
            <p className="font-bold text-gray-800 dark:text-white">
              {allocation ? formatEther(allocation as bigint).substring(0, 8) : '0'} HAL
            </p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">Returns</p>
            <p className="font-bold text-emerald-700 dark:text-emerald-400">
              {totalReturns ? formatEther(totalReturns as bigint).substring(0, 8) : '0'} HAL
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-3xl">📈</div>
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Strategy Manager</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Yield Generation Hub</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Overall Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">Total Allocated</p>
            <p className="text-lg font-bold text-blue-700 dark:text-blue-400">
              {totalAllocated ? formatEther(totalAllocated as bigint).substring(0, 10) : '0'} HAL
            </p>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">Weighted APY</p>
            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
              {formatAPY(totalAPY)}%
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">Total Returns Earned</p>
            <p className="text-lg font-bold text-purple-700 dark:text-purple-400">
              {totalReturns ? formatEther(totalReturns as bigint).substring(0, 10) : '0'} HAL
            </p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">Pending Returns</p>
            <p className="text-lg font-bold text-yellow-700 dark:text-yellow-400">
              {totalPendingReturns ? formatEther(totalPendingReturns as bigint).substring(0, 10) : '0'} HAL
            </p>
          </div>
        </div>

        {/* Harvest Button */}
        <button
          onClick={handleHarvestAll}
          disabled={isHarvesting}
          className="w-full py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold rounded-lg transition-colors"
        >
          {isHarvesting ? 'Harvesting...' : '🌾 Harvest All Returns'}
        </button>

        {/* Active Strategies */}
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-800 dark:text-white mb-3">Active Strategies</h3>
          <div className="space-y-2">
            {renderStrategy(strategy0, 0)}
            {renderStrategy(strategy1, 1)}
            {renderStrategy(strategy2, 2)}
          </div>
        </div>

        {/* Allocate Form (Manager Only) */}
        <form onSubmit={handleAllocate} className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-800 dark:text-white">Allocate Capital (Manager)</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Strategy ID
            </label>
            <select
              value={strategyId}
              onChange={(e) => setStrategyId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Select Strategy</option>
              <option value="0">0 - Sukuk Investment</option>
              <option value="1">1 - Treasury Bills</option>
              <option value="2">2 - Business Financing</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Amount (HAL-GOLD)
            </label>
            <input
              type="number"
              step="0.01"
              value={allocateAmount}
              onChange={(e) => setAllocateAmount(e.target.value)}
              placeholder="Amount to allocate"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={isAllocating}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
          >
            {isAllocating ? 'Allocating...' : 'Allocate to Strategy'}
          </button>
        </form>

        {/* Info */}
        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg text-xs text-gray-700 dark:text-gray-300">
          <p className="font-semibold mb-1">💡 How It Works:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Strategies invest pool funds into halal opportunities</li>
            <li>Returns are generated from real business activities</li>
            <li>Anyone can harvest to collect profits</li>
            <li>Profits increase share value for all depositors</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
