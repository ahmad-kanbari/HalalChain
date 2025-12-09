'use client';

import { useState } from 'react';
import { useReadContract } from 'wagmi';
import { CONTRACTS, ABIS } from '@/lib/contracts';

export function ShariaRegistryCard() {
  const [checkAddress, setCheckAddress] = useState('');

  const { data: isCompliant } = useReadContract({
    address: CONTRACTS.ShariaRegistry as `0x${string}`,
    abi: ABIS.ShariaRegistry,
    functionName: 'isCompliant',
    args: checkAddress ? [checkAddress as `0x${string}`] : undefined,
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-3xl">📋</div>
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Sharia Registry</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Compliance Verification</p>
        </div>
      </div>

      <div className="space-y-3">
        <input
          type="text"
          value={checkAddress}
          onChange={(e) => setCheckAddress(e.target.value)}
          placeholder="Contract address to check"
          className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
        />
        {checkAddress && (
          <div className={`p-4 rounded-lg ${isCompliant ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
            <p className="font-semibold">
              {isCompliant ? '✅ Halal - Sharia Compliant' : '❌ Not Compliant'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
