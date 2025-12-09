import React, { useState } from 'react';

function Swap() {
    const [val, setVal] = useState("");

    return (
        <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow mt-12">
            <h2 className="text-2xl font-bold mb-6">Swap Tokens</h2>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">From (BNB)</label>
                    <input
                        type="number"
                        placeholder="0.0"
                        className="w-full p-3 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary"
                        value={val}
                        onChange={(e) => setVal(e.target.value)}
                    />
                </div>

                <div className="flex justify-center">
                    <span className="bg-gray-100 p-2 rounded-full">↓</span>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">To (HAL-GOLD)</label>
                    <input
                        type="number"
                        disabled
                        placeholder="0.0"
                        className="w-full p-3 border rounded-lg bg-gray-100 text-gray-500"
                        value={val ? parseFloat(val) * 0.8 : ""} // Mock rate
                    />
                </div>

                <button className="w-full bg-primary text-white py-3 rounded-lg font-bold hover:bg-emerald-600 transition">
                    Swap Now
                </button>
            </div>
        </div>
    );
}

export default Swap;
