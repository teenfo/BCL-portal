import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Admin Portal | BCL",
    description: "BCL Management Portal",
};

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    Settings,
    Calendar,
    CreditCard,
    Bell,
    LogOut,
    Building2,
    FileText
} from "lucide-react";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    const navItems = [
        { name: "Dashboard", icon: LayoutDashboard, href: "/admin/dashboard" },
        { name: "Members", icon: Users, href: "/admin/members" },
        { name: "Sessions", icon: Calendar, href: "/admin/sessions/schedule" },
        { name: "Billing", icon: CreditCard, href: "/admin/billing/payments" },
        { name: "Notices", icon: FileText, href: "/admin/content/notices" },
        { name: "Settings", icon: Settings, href: "/admin/settings/facility" },
    ];

    return (
        <div className="flex min-h-screen bg-bg text-fg font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-surface border-r border-border hidden md:flex flex-col sticky top-0 h-screen">
                <div className="p-6 border-b border-border flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-on-primary">
                        <Building2 size={18} />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight">BCL Admin</h1>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    <div className="text-[10px] uppercase tracking-widest text-muted font-bold px-3 mb-2 opacity-50">Main Menu</div>
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
                                        ? "bg-primary text-on-primary shadow-lg shadow-primary/20"
                                        : "text-muted hover:bg-surface2 hover:text-fg"
                                    }`}
                            >
                                <Icon size={18} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-border">
                    <Link
                        href="/auth/logout"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-danger hover:bg-danger/5 transition-all"
                    >
                        <LogOut size={18} />
                        Logout
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-6 sticky top-0 z-20">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-muted">
                        {navItems.find(i => i.href === pathname)?.name || "Admin Panel"}
                    </h2>
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <p className="text-xs font-bold">Admin User</p>
                            <p className="text-[10px] text-muted">Super Admin</p>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-surface2 border border-border"></div>
                    </div>
                </header>
                <main className="flex-1 p-6 lg:p-10">
                    {children}
                </main>
            </div>
        </div>
    );
}
