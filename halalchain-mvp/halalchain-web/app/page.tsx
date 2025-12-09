import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="container mx-auto px-4 pt-24 pb-32 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div className="inline-block bg-primary/10 text-primary px-4 py-2 rounded-full font-semibold text-sm">
              ✨ The Future of Islamic Finance
            </div>
            <h1 className="text-6xl font-bold tracking-tight text-gray-900 leading-tight">
              Grow Your Wealth <br />
              <span className="text-primary">Without Compromise</span>
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
              HalalChain is the first fully Sharia-compliant DeFi ecosystem on BSC.
              Earn real profit shares, mint gold-backed assets, and trade ethically.
            </p>
            <div className="flex justify-center gap-4 pt-4">
              <Link href="/dashboard">
                <Button size="lg" className="rounded-full px-10">Launch App</Button>
              </Link>
              <Link href="https://docs.halalchain.io" target="_blank">
                <Button variant="outline" size="lg" className="rounded-full px-10">Read Whitepaper</Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Abstract Background Shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-30">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"></div>
        </div>
      </header>

      {/* Stats Section */}
      <section className="bg-gray-50 py-20 border-y border-gray-100">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="p-8 bg-white rounded-2xl shadow-sm border border-gray-100">
              <p className="text-gray-500 font-medium mb-2">Total Value Locked</p>
              <p className="text-5xl font-bold text-gray-900">$12.4M</p>
            </div>
            <div className="p-8 bg-white rounded-2xl shadow-sm border border-gray-100">
              <p className="text-gray-500 font-medium mb-2">Profit Distributed</p>
              <p className="text-5xl font-bold text-primary">$840K</p>
            </div>
            <div className="p-8 bg-white rounded-2xl shadow-sm border border-gray-100">
              <p className="text-gray-500 font-medium mb-2">Community Members</p>
              <p className="text-5xl font-bold text-gray-900">45k+</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4">Why HalalChain?</h2>
            <p className="text-gray-600">Built on strict Islamic finance principles with modern blockchain technology.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <FeatureCard
              title="0% Interest (Riba)"
              description="Our protocol relies entirely on profit-sharing and real asset backing. No lending at interest."
              icon="🚫"
            />
            <FeatureCard
              title="Gold-Backed Stablecoin"
              description="HAL-GOLD is 100% backed by physical gold reserves and liquid collateral. Inflation resistant."
              icon="🥇"
            />
            <FeatureCard
              title="Transparent Ventures"
              description="Invest in real-world ethical businesses via our Mudarabah Vaults. Track performance on-chain."
              icon="📊"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ title, description, icon }: { title: string, description: string, icon: string }) {
  return (
    <div className="text-center p-6 space-y-4">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  )
}
