import React from 'react';

function Portfolio() {
    return (
        <div className="max-w-4xl mx-auto mt-12">
            <h2 className="text-2xl font-bold mb-6">Your Portfolio</h2>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow">
                    <p className="text-gray-500 mb-1">Total Value</p>
                    <p className="text-3xl font-bold">$0.00</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow">
                    <p className="text-gray-500 mb-1">HALAL Balance</p>
                    <p className="text-2xl font-bold">0</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow">
                    <p className="text-gray-500 mb-1">HAL-GOLD Balance</p>
                    <p className="text-2xl font-bold">0.00</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow">
                <h3 className="font-bold text-lg mb-4">Transaction History</h3>
                <p className="text-gray-500 italic">No transactions found.</p>
            </div>
        </div>
    );
}

export default Portfolio;
