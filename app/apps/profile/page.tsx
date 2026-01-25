"use client";

import { useUser } from "@/assets/theme/hooks/user-context";
import { User, Settings, CreditCard, Bell, LogOut, ChevronRight, HelpCircle, Shield } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/assets/theme/hooks/supabase";
import { useRouter } from "next/navigation";

export default function UserProfilePage() {
    const { user } = useUser();
    const router = useRouter();
    const supabase = createClient();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.refresh();
        router.push("/apps/auth/login");
    };

    const menuItems = [
        { icon: Settings, label: "App Settings", href: "/apps/settings" },
        { icon: CreditCard, label: "Membership & Billing", href: "/apps/membership" },
        { icon: Bell, label: "Notifications", href: "/apps/notifications" },
        { icon: HelpCircle, label: "Support & FAQ", href: "/apps/support" },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <header className="text-center pt-6">
                <div className="w-24 h-24 bg-surface2 rounded-full mx-auto mb-4 border-4 border-surface shadow-xl flex items-center justify-center text-3xl font-black text-muted">
                    {user?.email?.charAt(0).toUpperCase() || "U"}
                </div>
                <h1 className="text-xl font-black tracking-tight">{user?.email?.split('@')[0]}</h1>
                <p className="text-muted text-sm font-medium">{user?.email}</p>
                <div className="mt-4 inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-primary/10">
                    <Shield size={12} />
                    Gold Member
                </div>
            </header>

            <div className="bg-surface rounded-[2rem] border border-border shadow-soft overflow-hidden">
                <div className="divide-y divide-border">
                    {menuItems.map((item, i) => (
                        <Link key={i} href={item.href} className="flex items-center justify-between p-5 hover:bg-surface2/30 transition-colors group">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-surface2 flex items-center justify-center text-muted group-hover:text-primary transition-colors">
                                    <item.icon size={20} />
                                </div>
                                <span className="font-bold text-sm tracking-tight">{item.label}</span>
                            </div>
                            <ChevronRight size={16} className="text-muted/50 group-hover:text-fg transition-colors" />
                        </Link>
                    ))}
                </div>
            </div>

            <button
                onClick={handleLogout}
                className="w-full bg-surface2/50 text-danger py-4 rounded-2xl font-bold text-sm hover:bg-danger/10 transition-all flex items-center justify-center gap-2 border border-transparent hover:border-danger/10"
            >
                <LogOut size={18} />
                Sign Out
            </button>

            <p className="text-center text-[10px] text-muted font-bold uppercase tracking-widest opacity-30">
                Version 1.0.2 (Build 440)
            </p>
        </div>
    );
}
