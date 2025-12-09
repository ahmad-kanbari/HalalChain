'use client';

import { useState } from 'react';
import { useWriteContract } from 'wagmi';
import { parseEther } from 'viem';
import { CONTRACTS, ABIS } from '@/lib/contracts';

export function SukukManagerCard() {
  const [projectData, setProjectData] = useState('');
  const [targetRaise, setTargetRaise] = useState('');
  const [maturity, setMaturity] = useState('');

  const { writeContract: listProject, isPending } = useWriteContract();

  const handleListProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectData || !targetRaise || !maturity) return;

    const maturityTimestamp = Math.floor(new Date(maturity).getTime() / 1000);

    listProject({
      address: CONTRACTS.SukukManager as `0x${string}`,
      abi: ABIS.SukukManager,
      functionName: 'listProject',
      args: [projectData, parseEther(targetRaise), BigInt(maturityTimestamp)],
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-3xl">📜</div>
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Sukuk Manager</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Asset-Backed Securities</p>
        </div>
      </div>

      <form onSubmit={handleListProject} className="space-y-3">
        <input
          type="text"
          value={projectData}
          onChange={(e) => setProjectData(e.target.value)}
          placeholder="IPFS Hash (QmXxx...)"
          className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
        />
        <input
          type="number"
          step="0.01"
          value={targetRaise}
          onChange={(e) => setTargetRaise(e.target.value)}
          placeholder="Target Raise Amount"
          className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
        />
        <input
          type="date"
          value={maturity}
          onChange={(e) => setMaturity(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
        />
        <button type="submit" disabled={isPending} className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg">
          {isPending ? 'Listing...' : 'List Sukuk Project'}
        </button>
      </form>
    </div>
  );
}
