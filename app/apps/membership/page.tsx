"use client";

import { useUser } from "@/assets/theme/hooks/user-context";
import { CreditCard, Zap, CheckCircle2, ChevronRight, History } from "lucide-react";
import Link from "next/link";

export default function MembershipPage() {
    const { user } = useUser();

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header>
                <h1 className="text-2xl font-extrabold tracking-tight">My Membership</h1>
                <p className="text-muted text-sm font-medium">Manage your subscription and credits</p>
            </header>

            {/* Current Plan Card */}
            <div className="relative overflow-hidden bg-primary rounded-[2.5rem] p-7 text-on-primary shadow-2xl shadow-primary/30">
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                        <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                            <Zap size={24} fill="currentColor" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest bg-success text-white px-3 py-1 rounded-full shadow-lg">Active</span>
                    </div>

                    <h2 className="text-sm font-bold opacity-80 uppercase tracking-wider">Iron Pulse Elite</h2>
                    <p className="text-4xl font-black mt-1">$99<span className="text-lg opacity-60 font-medium">/mo</span></p>

                    <div className="mt-8 flex items-end justify-between">
                        <div>
                            <p className="text-[10px] opacity-60 font-bold uppercase tracking-widest">Next Billing</p>
                            <p className="text-xs font-bold">Feb 25, 2026</p>
                        </div>
                        <Link href="/apps/billing/payments" className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors">
                            <History size={18} />
                        </Link>
                    </div>
                </div>
                {/* Glow effect */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse"></div>
            </div>

            {/* Credit Status */}
            <div className="bg-surface rounded-3xl p-6 border border-border shadow-soft">
                <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
                    <CheckCircle2 size={16} className="text-primary" />
                    Remaining Benefits
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface2 p-4 rounded-2xl flex flex-col items-center gap-1">
                        <span className="text-lg font-black text-fg">12 / 20</span>
                        <span className="text-[10px] text-muted font-bold uppercase tracking-tighter">Classes Left</span>
                    </div>
                    <div className="bg-surface2 p-4 rounded-2xl flex flex-col items-center gap-1 text-center">
                        <span className="text-lg font-black text-fg">Unlimited</span>
                        <span className="text-[10px] text-muted font-bold uppercase tracking-tighter">Gym Access</span>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-3">
                <h3 className="text-sm font-bold px-1">Quick Actions</h3>
                <div className="bg-surface rounded-3xl border border-border divide-y divide-border overflow-hidden shadow-soft">
                    <Link href="/apps/membership/plans" className="flex items-center justify-between p-5 hover:bg-surface2 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-primary-soft text-primary flex items-center justify-center">
                                <Zap size={20} />
                            </div>
                            <span className="text-sm font-bold tracking-tight">Upgrade Plan</span>
                        </div>
                        <ChevronRight size={16} className="text-muted" />
                    </Link>
                    <Link href="/apps/billing/payments" className="flex items-center justify-between p-5 hover:bg-surface2 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-surface2 text-muted flex items-center justify-center">
                                <CreditCard size={20} />
                            </div>
                            <span className="text-sm font-bold tracking-tight">Payment Methods</span>
                        </div>
                        <ChevronRight size={16} className="text-muted" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
