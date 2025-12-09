'use client';

import { useAccount, useBalance } from 'wagmi';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function DashboardPage() {
    const { address, isConnected } = useAccount();
    const { data: balance } = useBalance({ address });

    if (!isConnected) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
                <div className="text-6xl">🔐</div>
                <h2 className="text-2xl font-bold">Wallet Disconnected</h2>
                <p className="text-gray-500 max-w-md">Please connect your wallet to view your personalized dashboard and assets.</p>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <div className="text-sm bg-white border px-4 py-2 rounded-lg text-gray-500">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                </div>
            </div>

            {/* Portfolio Overview */}
            <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-primary text-white p-6 rounded-2xl shadow-lg bg-gradient-to-br from-primary to-emerald-600">
                    <p className="text-emerald-100 font-medium mb-1">Total Net Worth</p>
                    <p className="text-4xl font-bold">$0.00</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-gray-500 font-medium mb-1">BNB Balance</p>
                    <p className="text-3xl font-bold">{balance?.formatted.slice(0, 6)} <span className="text-sm text-gray-400">BNB</span></p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-gray-500 font-medium mb-1">HAL-GOLD</p>
                    <p className="text-3xl font-bold">0.00 <span className="text-sm text-gray-400">g</span></p>
                </div>
            </div>

            {/* Recent Activity / Actions */}
            <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
                    <h3 className="text-xl font-bold mb-6">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <Link href="/swap" className="block">
                            <Button variant="outline" className="w-full h-32 flex flex-col gap-2 hover:border-primary hover:bg-emerald-50">
                                <span className="text-2xl">🔄</span>
                                <span>Swap Tokens</span>
                            </Button>
                        </Link>
                        <Link href="/vault" className="block">
                            <Button variant="outline" className="w-full h-32 flex flex-col gap-2 hover:border-secondary hover:bg-amber-50">
                                <span className="text-2xl">💰</span>
                                <span>Invest in Vault</span>
                            </Button>
                        </Link>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
                    <h3 className="text-xl font-bold mb-4">Investments</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center text-lg">🏦</div>
                                <div>
                                    <p className="font-bold">Mudarabah Vault V1</p>
                                    <p className="text-xs text-gray-500">Auto-Compounding</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold">0.00 HAL-GOLD</p>
                                <p className="text-xs text-green-600">+0.00 Earned</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
