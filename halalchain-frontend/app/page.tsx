'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { HalalTokenCard } from '@/components/HalalTokenCard';
import { HalGoldCard } from '@/components/HalGoldCard';
import { MudarabahVaultCard } from '@/components/MudarabahVaultCard';
import { SukukManagerCard } from '@/components/SukukManagerCard';
import { ZakatVaultCard } from '@/components/ZakatVaultCard';
import { ShariaRegistryCard } from '@/components/ShariaRegistryCard';
import { HalalDAOCard } from '@/components/HalalDAOCard';
import { OracleHubCard } from '@/components/OracleHubCard';
import { TreasuryCard } from '@/components/TreasuryCard';

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-gray-900 dark:to-gray-800">
      <header className="border-b border-emerald-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">
                🕌 HalalChain DApp
              </h1>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                Sharia-Compliant Decentralized Finance
              </p>
            </div>
            <ConnectButton />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!isConnected ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12 max-w-md">
              <div className="text-6xl mb-6">🔐</div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                Connect Your Wallet
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Connect your wallet to interact with HalalChain smart contracts on BSC Testnet
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700 rounded-lg p-4">
              <h3 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-2">
                📋 Testing Instructions:
              </h3>
              <ul className="text-sm text-emerald-800 dark:text-emerald-200 space-y-1 list-disc list-inside">
                <li>Make sure you have BSC Testnet selected in your wallet</li>
                <li>Get test BNB from BSC Testnet Faucet</li>
                <li>Update contract addresses in lib/contracts.ts after deployment</li>
              </ul>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              <HalalTokenCard />
              <HalGoldCard />
              <MudarabahVaultCard />
              <SukukManagerCard />
              <ZakatVaultCard />
              <ShariaRegistryCard />
              <HalalDAOCard />
              <OracleHubCard />
              <TreasuryCard />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
