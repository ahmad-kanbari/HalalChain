'use client';

import { Button } from '@/components/ui/button';
import { Lock, TrendingUp, ShieldCheck } from 'lucide-react';

export default function VaultPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-4 mb-12">
                <h1 className="text-4xl font-bold">Mudarabah Vaults</h1>
                <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                    Deposit your assets into verified, ethical ventures. Profits are distributed monthly based on real performance.
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Vault Card 1 */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300">
                    <div className="bg-secondary/10 p-6 border-b border-secondary/10">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Gold Growth Fund</h3>
                                <p className="text-sm text-gray-500 mt-1">Low Risk • Commodity Backed</p>
                            </div>
                            <span className="bg-white px-3 py-1 rounded-full text-sm font-bold border shadow-sm">
                                V1
                            </span>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Projected APY</p>
                                <p className="text-4xl font-bold text-primary">8-12%</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-500 mb-1">TVL</p>
                                <p className="text-2xl font-bold text-gray-900">$2.4M</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                                <ShieldCheck className="w-5 h-5 text-primary" />
                                <span>120% Collateralized backed by Gold</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                                <Lock className="w-5 h-5 text-primary" />
                                <span>No lock-up period (T+1 Withdrawal)</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                                <TrendingUp className="w-5 h-5 text-primary" />
                                <span>Auto-compounding monthly profits</span>
                            </div>
                        </div>

                        <Button className="w-full" size="lg">Deposit HAL-GOLD</Button>
                    </div>
                </div>

                {/* Coming Soon Card */}
                <div className="bg-gray-50 rounded-2xl border border-gray-200 p-8 flex flex-col items-center justify-center text-center space-y-4 opacity-75 grayscale hover:grayscale-0 transition-all">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-3xl">
                        🏗️
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Real Estate Sukuk</h3>
                    <p className="text-gray-600">Fractionalized ownership in prime real estate developments.</p>
                    <span className="bg-gray-200 text-gray-600 px-4 py-1 rounded-full text-sm font-bold">
                        Coming Q2 2025
                    </span>
                </div>
            </div>
        </div>
    );
}
