"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, QrCode, MapPin, User, Bell, Menu } from "lucide-react";
import { useUser } from "@/assets/theme/hooks/user-context";

export default function AppsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const { user } = useUser();

    // Bottom Tab Items (Mobile First)
    const navItems = [
        { name: "Home", icon: Home, href: "/apps/dashboard" },
        { name: "Schedule", icon: Calendar, href: "/apps/schedule" },
        { name: "Check-in", icon: QrCode, href: "/apps/checkin" },
        { name: "Facilities", icon: MapPin, href: "/apps/facilities" },
        { name: "Profile", icon: User, href: "/apps/profile" },
    ];

    // Hide layout on auth pages if needed, but sitemap implies strictly /apps/* structure.
    const isAuthPage = pathname.includes('/auth/');

    if (isAuthPage) return <>{children}</>;

    return (
        <div className="flex flex-col min-h-screen bg-bg text-fg font-sans pb-20 md:pb-0">
            {/* Mobile Header */}
            <header className="md:hidden h-14 bg-surface/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 sticky top-0 z-20">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-on-primary font-black">
                        B
                    </div>
                    <span className="font-black tracking-tight text-sm">BCL Portal</span>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/apps/notifications" className="relative p-2 text-muted hover:text-fg">
                        <Bell size={20} />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full border border-surface"></span>
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8 max-w-2xl mx-auto w-full">
                {children}
            </main>

            {/* Bottom Navigation (Mobile) */}
            <nav className="md:hidden fixed bottom-0 inset-x-0 bg-surface border-t border-border z-30 pb-safe">
                <div className="flex justify-around items-center h-16">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/apps/dashboard' && pathname.startsWith(item.href));
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all ${isActive ? "text-primary" : "text-muted hover:text-fg"
                                    }`}
                            >
                                <div className={`relative p-1 rounded-xl transition-all ${isActive ? "bg-primary/10 -translate-y-1" : ""}`}>
                                    <Icon size={isActive ? 22 : 20} strokeWidth={isActive ? 2.5 : 2} />
                                </div>
                                <span className={`text-[10px] font-bold tracking-tight ${isActive ? "opacity-100" : "opacity-60"}`}>
                                    {item.name}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Desktop Message (Responsive Guard) */}
            <div className="hidden md:flex fixed top-4 right-4 items-center gap-2 bg-surface2 px-4 py-2 rounded-full opacity-50 hover:opacity-100 transition-opacity">
                <span className="w-2 h-2 bg-success rounded-full animate-pulse"></span>
                <span className="text-xs font-bold text-muted uppercase">Desktop View (Admin Preferred)</span>
            </div>
        </div>
    );
}
