'use client';

import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';

const navItems = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Swap', href: '/swap' },
    { name: 'Vaults', href: '/vault' },
];

export function Navbar() {
    const pathname = usePathname();

    return (
        <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-primary">HalalChain</span>
                </Link>

                <div className="hidden md:flex items-center gap-8">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={clsx(
                                "font-medium transition-colors hover:text-primary",
                                pathname === item.href ? "text-primary" : "text-gray-600"
                            )}
                        >
                            {item.name}
                        </Link>
                    ))}
                </div>

                <div className="flex items-center gap-4">
                    <ConnectButton showBalance={false} chainStatus="icon" />
                </div>
            </div>
        </nav>
    );
}
