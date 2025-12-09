'use client';

import { useState } from 'react';
import { useWriteContract } from 'wagmi';
import { parseEther } from 'viem';
import { CONTRACTS, ABIS } from '@/lib/contracts';

export function ZakatVaultCard() {
  const [donateAmount, setDonateAmount] = useState('');
  const { writeContract: donate, isPending } = useWriteContract();

  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!donateAmount) return;

    donate({
      address: CONTRACTS.ZakatVault as `0x${string}`,
      abi: ABIS.ZakatVault,
      functionName: 'donate',
      args: [CONTRACTS.HalGoldStablecoin as `0x${string}`, parseEther(donateAmount)],
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-3xl">🤲</div>
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Zakat Vault</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Charity & Purification</p>
        </div>
      </div>

      <form onSubmit={handleDonate} className="space-y-3">
        <input
          type="number"
          step="0.01"
          value={donateAmount}
          onChange={(e) => setDonateAmount(e.target.value)}
          placeholder="Donation Amount (HAL-GOLD)"
          className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
        />
        <button type="submit" disabled={isPending} className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg">
          {isPending ? 'Donating...' : 'Donate Zakat'}
        </button>
      </form>
      <p className="text-xs text-gray-500 mt-2">💚 Fulfill your Zakat obligation on-chain</p>
    </div>
  );
}
