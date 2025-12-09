'use client';

import { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { CONTRACTS, ABIS } from '@/lib/contracts';

export function MudarabahVaultCard() {
  const { address } = useAccount();
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawShares, setWithdrawShares] = useState('');

  const { data: shares } = useReadContract({
    address: CONTRACTS.MudarabahVault as `0x${string}`,
    abi: ABIS.MudarabahVault,
    functionName: 'shares',
    args: [address],
  });

  const { data: totalAssets } = useReadContract({
    address: CONTRACTS.MudarabahVault as `0x${string}`,
    abi: ABIS.MudarabahVault,
    functionName: 'totalAssets',
  });

  const { writeContract: deposit, data: depositHash } = useWriteContract();
  const { writeContract: withdraw, data: withdrawHash } = useWriteContract();

  const { isLoading: isDepositing } = useWaitForTransactionReceipt({ hash: depositHash });
  const { isLoading: isWithdrawing } = useWaitForTransactionReceipt({ hash: withdrawHash });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-3xl">💰</div>
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Mudarabah Vault</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Profit-Sharing Investment</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">Your Shares</p>
            <p className="text-lg font-bold text-green-700 dark:text-green-400">
              {shares ? formatEther(shares as bigint).substring(0, 10) : '0'}
            </p>
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">Total Assets</p>
            <p className="text-lg font-bold text-indigo-700 dark:text-indigo-400">
              {totalAssets ? formatEther(totalAssets as bigint).substring(0, 10) : '0'}
            </p>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); deposit({ address: CONTRACTS.MudarabahVault as `0x${string}`, abi: ABIS.MudarabahVault, functionName: 'deposit', args: [parseEther(depositAmount)] }); }} className="space-y-3">
          <input
            type="number"
            step="0.01"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            placeholder="Amount to deposit"
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
          />
          <button type="submit" disabled={isDepositing} className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg">
            {isDepositing ? 'Depositing...' : 'Deposit'}
          </button>
        </form>

        <form onSubmit={(e) => { e.preventDefault(); withdraw({ address: CONTRACTS.MudarabahVault as `0x${string}`, abi: ABIS.MudarabahVault, functionName: 'withdraw', args: [parseEther(withdrawShares)] }); }} className="space-y-3">
          <input
            type="number"
            step="0.01"
            value={withdrawShares}
            onChange={(e) => setWithdrawShares(e.target.value)}
            placeholder="Shares to withdraw"
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
          />
          <button type="submit" disabled={isWithdrawing} className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg">
            {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
          </button>
        </form>
      </div>
    </div>
  );
}
