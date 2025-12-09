import React from 'react';
import { Link } from 'react-router-dom';

function Home() {
    return (
        <div className="text-center space-y-12">
            <section className="space-y-6 mt-12">
                <h1 className="text-5xl font-bold text-gray-900">
                    The First <span className="text-primary">Sharia-Compliant</span> DeFi Ecosystem on BSC
                </h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                    Trade, stake, and earn with peace of mind. No interest. No gambling. Just pure profit sharing.
                </p>
                <div className="flex justify-center gap-4">
                    <Link to="/swap" className="bg-primary hover:bg-emerald-600 text-white px-8 py-3 rounded-lg font-bold transition">
                        Get Started
                    </Link>
                    <Link to="/stake" className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-900 px-8 py-3 rounded-lg font-bold transition">
                        View Vaults
                    </Link>
                </div>
            </section>

            <section className="grid md:grid-cols-3 gap-8 py-12">
                <div className="p-6 bg-white rounded-xl shadow border border-gray-100">
                    <h3 className="text-secondary font-bold text-lg mb-2">Total Value Locked</h3>
                    <p className="text-4xl font-bold text-gray-900">$10,420</p>
                </div>
                <div className="p-6 bg-white rounded-xl shadow border border-gray-100">
                    <h3 className="text-secondary font-bold text-lg mb-2">HALAL Price</h3>
                    <p className="text-4xl font-bold text-gray-900">$0.05</p>
                </div>
                <div className="p-6 bg-white rounded-xl shadow border border-gray-100">
                    <h3 className="text-secondary font-bold text-lg mb-2">Active Users</h3>
                    <p className="text-4xl font-bold text-gray-900">142</p>
                </div>
            </section>
        </div>
    );
}

export default Home;
