'use client';

import { useState } from 'react';
import { useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { CONTRACTS, ABIS } from '@/lib/contracts';

export function OracleHubCard() {
  const [asset, setAsset] = useState('GOLD');

  const { data: goldPrice } = useReadContract({
    address: CONTRACTS.OracleHub as `0x${string}`,
    abi: ABIS.OracleHub,
    functionName: 'getPrice',
    args: ['GOLD'],
  });

  const { data: usdtPrice } = useReadContract({
    address: CONTRACTS.OracleHub as `0x${string}`,
    abi: ABIS.OracleHub,
    functionName: 'getPrice',
    args: ['USDT'],
  });

  const { data: bnbPrice } = useReadContract({
    address: CONTRACTS.OracleHub as `0x${string}`,
    abi: ABIS.OracleHub,
    functionName: 'getPrice',
    args: ['BNB'],
  });

  const { data: selectedAssetPrice } = useReadContract({
    address: CONTRACTS.OracleHub as `0x${string}`,
    abi: ABIS.OracleHub,
    functionName: 'getPrice',
    args: asset ? [asset] : undefined,
  });

  const formatPrice = (price: any) => {
    if (!price) return '0.00';
    // Prices come with 8 decimals from Chainlink
    return parseFloat(formatUnits(price as bigint, 8)).toFixed(2);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-3xl">📊</div>
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Oracle Hub</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Real-Time Price Feeds</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Live Price Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg text-center">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">🥇 GOLD</p>
            <p className="text-lg font-bold text-yellow-700 dark:text-yellow-400">
              ${formatPrice(goldPrice)}
            </p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-center">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">💵 USDT</p>
            <p className="text-lg font-bold text-green-700 dark:text-green-400">
              ${formatPrice(usdtPrice)}
            </p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg text-center">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">🔶 BNB</p>
            <p className="text-lg font-bold text-orange-700 dark:text-orange-400">
              ${formatPrice(bnbPrice)}
            </p>
          </div>
        </div>

        {/* Custom Asset Lookup */}
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Check Price
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={asset}
              onChange={(e) => setAsset(e.target.value.toUpperCase())}
              placeholder="Asset symbol (e.g., GOLD)"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          {selectedAssetPrice && (
            <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">{asset} Price</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                ${formatPrice(selectedAssetPrice)}
              </p>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
          📡 Powered by Chainlink Oracles • Updates prevent Gharar (uncertainty)
        </div>
      </div>
    </div>
  );
}
