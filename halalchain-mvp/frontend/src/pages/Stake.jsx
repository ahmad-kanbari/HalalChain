import React from 'react';

function Stake() {
    return (
        <div className="max-w-2xl mx-auto space-y-6 mt-12">
            <div className="bg-white p-8 rounded-xl shadow">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Mudarabah Vault</h2>
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">Healthy</span>
                </div>

                <p className="text-gray-600 mb-6">
                    Deposit your HAL-GOLD stablecoins to verify-able profit generating strategies.
                    Profits are distributed monthly based on actual performance.
                </p>

                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500">Projected APY</p>
                        <p className="text-2xl font-bold text-primary">8% - 12%</p>
                        <p className="text-xs text-gray-400">*Variable</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500">Total Staked</p>
                        <p className="text-2xl font-bold text-gray-900">50,000 HAL-GOLD</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <input
                        type="number"
                        placeholder="Amount to Stake"
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                    <button className="w-full bg-secondary text-gray-900 py-3 rounded-lg font-bold hover:bg-yellow-400 transition">
                        Deposit HAL-GOLD
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Stake;
