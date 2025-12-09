'use client';

import { useState } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { parseEther, formatEther, encodeFunctionData } from 'viem';
import { CONTRACTS, ABIS } from '@/lib/contracts';

export function HalalDAOCard() {
  const { address } = useAccount();
  const [proposalDescription, setProposalDescription] = useState('');
  const [proposalId, setProposalId] = useState('');
  const [voteSupport, setVoteSupport] = useState<0 | 1 | 2>(1); // 0=Against, 1=For, 2=Abstain

  const { data: votingPower } = useReadContract({
    address: CONTRACTS.HalalToken as `0x${string}`,
    abi: ABIS.HalalToken,
    functionName: 'getVotes',
    args: [address],
  });

  const { data: proposalState } = useReadContract({
    address: CONTRACTS.HalalDAO as `0x${string}`,
    abi: ABIS.HalalDAO,
    functionName: 'state',
    args: proposalId ? [BigInt(proposalId)] : undefined,
  });

  const { writeContract: propose, isPending: isProposing } = useWriteContract();
  const { writeContract: vote, isPending: isVoting } = useWriteContract();

  const handlePropose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposalDescription) return;

    // Simple proposal: send 100 HAL-GOLD from treasury to an address
    const targets = [CONTRACTS.HalGoldStablecoin];
    const values = [BigInt(0)];
    const calldatas = [encodeFunctionData({
      abi: ABIS.HalGoldStablecoin,
      functionName: 'transfer',
      args: [address as `0x${string}`, parseEther('100')]
    })];

    propose({
      address: CONTRACTS.HalalDAO as `0x${string}`,
      abi: ABIS.HalalDAO,
      functionName: 'propose',
      args: [targets, values, calldatas, proposalDescription],
    });
  };

  const handleVote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposalId) return;

    vote({
      address: CONTRACTS.HalalDAO as `0x${string}`,
      abi: ABIS.HalalDAO,
      functionName: 'castVote',
      args: [BigInt(proposalId), voteSupport],
    });
  };

  const stateNames = ['Pending', 'Active', 'Canceled', 'Defeated', 'Succeeded', 'Queued', 'Expired', 'Executed'];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-3xl">🏛️</div>
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">HalalDAO</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Decentralized Governance</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Voting Power */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400">Your Voting Power</p>
          <p className="text-lg font-bold text-blue-700 dark:text-blue-400">
            {votingPower ? formatEther(votingPower as bigint).substring(0, 10) : '0'} votes
          </p>
        </div>

        {/* Create Proposal */}
        <form onSubmit={handlePropose} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Create Proposal
            </label>
            <textarea
              value={proposalDescription}
              onChange={(e) => setProposalDescription(e.target.value)}
              placeholder="Describe your proposal (e.g., Send 100 HAL-GOLD to address)"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={3}
            />
          </div>
          <button
            type="submit"
            disabled={isProposing}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
          >
            {isProposing ? 'Creating Proposal...' : 'Create Proposal'}
          </button>
        </form>

        {/* Vote on Proposal */}
        <form onSubmit={handleVote} className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Proposal ID
            </label>
            <input
              type="text"
              value={proposalId}
              onChange={(e) => setProposalId(e.target.value)}
              placeholder="Enter proposal ID"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {proposalId && proposalState !== undefined && (
            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
              <p className="text-xs text-gray-600 dark:text-gray-400">Proposal Status</p>
              <p className="text-sm font-bold text-purple-700 dark:text-purple-400">
                {stateNames[Number(proposalState)] || 'Unknown'}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Your Vote
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setVoteSupport(0)}
                className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
                  voteSupport === 0
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Against
              </button>
              <button
                type="button"
                onClick={() => setVoteSupport(1)}
                className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
                  voteSupport === 1
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                For
              </button>
              <button
                type="button"
                onClick={() => setVoteSupport(2)}
                className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
                  voteSupport === 2
                    ? 'bg-gray-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Abstain
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isVoting}
            className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
          >
            {isVoting ? 'Voting...' : 'Cast Vote'}
          </button>
        </form>

        <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
          💡 You must delegate votes to yourself before voting
        </div>
      </div>
    </div>
  );
}
