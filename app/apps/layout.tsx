"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Home,
    Calendar,
    QrCode,
    MapPin,
    User,
    Bell
} from "lucide-react";

export default function AppsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    const navItems = [
        { name: "Home", icon: Home, href: "/apps/dashboard" },
        { name: "Schedule", icon: Calendar, href: "/apps/schedule" },
        { name: "Check-in", icon: QrCode, href: "/apps/checkin" },
        { name: "Facilities", icon: MapPin, href: "/apps/facilities" },
        { name: "Profile", icon: User, href: "/apps/profile" },
    ];

    return (
        <div className="flex flex-col min-h-screen bg-bg text-fg font-sans pb-20 md:pb-0 md:pl-20">
            {/* Header */}
            <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-6 sticky top-0 z-30">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-on-primary">
                        <span className="text-sm font-black italic">B</span>
                    </div>
                    <h1 className="text-lg font-bold tracking-tight">BCL</h1>
                </div>
                <button className="relative p-2 text-muted hover:text-fg transition-colors">
                    <Bell size={20} />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full border-2 border-surface"></span>
                </button>
            </header>

            {/* Content Area */}
            <main className="flex-1 w-full max-w-lg mx-auto p-5 overflow-x-hidden">
                {children}
            </main>

            {/* Mobile Bottom Tab Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 h-16 bg-surface/80 backdrop-blur-lg border-t border-border flex items-center justify-around px-2 z-40 md:hidden">
                {navItems.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all ${isActive ? "text-primary" : "text-muted hover:text-subtle"
                                }`}
                        >
                            <div className={`p-1.5 rounded-xl transition-all ${isActive ? "bg-primary/10" : ""}`}>
                                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            <span className={`text-[10px] font-bold ${isActive ? "opacity-100" : "opacity-60"}`}>
                                {item.name}
                            </span>
                        </Link>
                    );
                })}
            </nav>

            {/* Desktop Sidebar Tab for Apps */}
            <nav className="hidden md:flex fixed left-0 top-16 bottom-0 w-20 bg-surface border-r border-border flex-col items-center py-6 gap-6 z-40">
                {navItems.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            title={item.name}
                            className={`p-3 rounded-2xl transition-all ${isActive
                                    ? "bg-primary text-on-primary shadow-lg shadow-primary/20 scale-110"
                                    : "text-muted hover:bg-surface2 hover:text-fg"
                                }`}
                        >
                            <Icon size={22} />
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
