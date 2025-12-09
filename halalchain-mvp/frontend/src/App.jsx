import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { bscTestnet } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

import Home from './pages/Home';
import Swap from './pages/Swap';
import Stake from './pages/Stake';
import Portfolio from './pages/Portfolio';

const config = getDefaultConfig({
  appName: 'HalalChain',
  projectId: 'YOUR_PROJECT_ID',
  chains: [bscTestnet],
  ssr: false,
});

const queryClient = new QueryClient();

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <Router>
            <div className="min-h-screen flex flex-col">
              {/* Navbar */}
              <nav className="bg-white shadow">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                  <Link to="/" className="text-2xl font-bold text-primary">HalalChain</Link>
                  <div className="flex gap-6">
                    <Link to="/" className="hover:text-primary">Home</Link>
                    <Link to="/swap" className="hover:text-primary">Swap</Link>
                    <Link to="/stake" className="hover:text-primary">Stake</Link>
                    <Link to="/portfolio" className="hover:text-primary">Portfolio</Link>
                  </div>
                  {/* Connect Button Placeholder - RainbowKit handles this via ConnectButton component */}
                  <div className="bg-gray-200 rounded">
                    <ConnectButton />
                  </div>
                </div>
              </nav>

              {/* Main Content */}
              <main className="flex-grow container mx-auto px-4 py-8">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/swap" element={<Swap />} />
                  <Route path="/stake" element={<Stake />} />
                  <Route path="/portfolio" element={<Portfolio />} />
                </Routes>
              </main>

              {/* Footer */}
              <footer className="bg-dark text-white py-6 text-center">
                <p>&copy; 2025 HalalChain. Sharia-compliant DeFi.</p>
              </footer>
            </div>
          </Router>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
