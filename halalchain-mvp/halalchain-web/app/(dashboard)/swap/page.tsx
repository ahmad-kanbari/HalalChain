'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAccount } from 'wagmi';

export default function SwapPage() {
    const { isConnected } = useAccount();
    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Mock calculations
    const rate = 80; // 1 BNB = 80 HAL-GOLD
    const receivedAmount = amount ? (parseFloat(amount) * rate).toFixed(2) : '0.00';

    const handleSwap = async () => {
        setIsLoading(true);
        // Simulator delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsLoading(false);
        alert('Swap functionality requires deployed contracts on testnet!');
    };

    return (
        <div className="max-w-md mx-auto pt-10">
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Swap</h1>
                    <span className="text-sm text-gray-500">Slippage: Auto</span>
                </div>

                <div className="space-y-4">
                    {/* From Input */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 hover:border-primary/30 transition-colors">
                        <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">You Pay</label>
                        <div className="flex gap-4">
                            <input
                                type="number"
                                placeholder="0.0"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full bg-transparent text-3xl font-bold outline-none placeholder:text-gray-300"
                            />
                            <div className="bg-white px-3 py-1 rounded-lg border shadow-sm flex items-center gap-2 font-bold shrink-0">
                                <span className="w-6 h-6 bg-yellow-500 rounded-full"></span> BNB
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center -my-2 relative z-10">
                        <div className="bg-white p-2 rounded-full shadow border text-gray-400">
                            ↓
                        </div>
                    </div>

                    {/* To Input */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">You Receive</label>
                        <div className="flex gap-4">
                            <input
                                type="text"
                                disabled
                                value={receivedAmount}
                                className="w-full bg-transparent text-3xl font-bold outline-none text-gray-600"
                            />
                            <div className="bg-white px-3 py-1 rounded-lg border shadow-sm flex items-center gap-2 font-bold shrink-0">
                                <span className="w-6 h-6 bg-secondary rounded-full"></span> GOLD
                            </div>
                        </div>
                    </div>

                    {/* Rate Info */}
                    <div className="flex justify-between text-sm text-gray-500 px-2">
                        <span>Rate</span>
                        <span>1 BNB ≈ {rate} HAL-GOLD</span>
                    </div>

                    <Button
                        size="lg"
                        className="w-full text-lg shadow-lg shadow-primary/20"
                        disabled={!isConnected || !amount}
                        isLoading={isLoading}
                        onClick={handleSwap}
                    >
                        {!isConnected ? 'Connect Wallet' : 'Swap via Smart Contract'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
