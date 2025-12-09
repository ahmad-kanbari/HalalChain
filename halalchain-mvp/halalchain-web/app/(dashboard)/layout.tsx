import { Navbar } from "@/components/layout/navbar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-grow container mx-auto px-4 py-8">
                {children}
            </main>
            <footer className="bg-dark text-white py-8 text-center mt-auto">
                <p className="text-gray-400">&copy; 2025 HalalChain. 100% Sharia-Compliant.</p>
            </footer>
        </div>
    );
}
