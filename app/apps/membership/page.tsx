"use client";

import { CreditCard, Zap, Check, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function UserMembershipPage() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <header>
                <h1 className="text-2xl font-black tracking-tight">My Membership</h1>
                <p className="text-muted text-sm font-medium mt-1">Manage your plan and billing.</p>
            </header>

            <div className="bg-primary text-on-primary p-6 rounded-[2rem] shadow-xl shadow-primary/30 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>

                <div className="flex justify-between items-start mb-8 relative z-10">
                    <div className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">
                        Active
                    </div>
                    <Zap size={24} className="text-white/80" />
                </div>

                <div className="relative z-10">
                    <p className="opacity-80 text-xs font-bold uppercase tracking-widest mb-1">Current Plan</p>
                    <h2 className="text-3xl font-black tracking-tighter">Iron Pulse Elite</h2>
                    <p className="text-sm font-medium opacity-80 mt-4">Renews on Feb 25, 2026</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Link href="/apps/membership/plans" className="bg-surface p-5 rounded-3xl border border-border shadow-soft group active:scale-[0.98] transition-all">
                    <div className="w-10 h-10 bg-surface2 rounded-xl flex items-center justify-center mb-3 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <Zap size={20} />
                    </div>
                    <h3 className="font-bold text-sm">Change Plan</h3>
                    <p className="text-[10px] text-muted mt-1">Upgrade or downgrade</p>
                </Link>
                <Link href="/apps/billing/payments" className="bg-surface p-5 rounded-3xl border border-border shadow-soft group active:scale-[0.98] transition-all">
                    <div className="w-10 h-10 bg-surface2 rounded-xl flex items-center justify-center mb-3 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <CreditCard size={20} />
                    </div>
                    <h3 className="font-bold text-sm">Billing History</h3>
                    <p className="text-[10px] text-muted mt-1">View past invoices</p>
                </Link>
            </div>

            <div className="space-y-4">
                <h3 className="text-xs font-bold text-muted uppercase tracking-widest pl-1">Plan Perks</h3>
                <div className="bg-surface rounded-3xl border border-border p-6 shadow-soft space-y-4">
                    {['Unlimited Gym Access', 'All Group Classes', 'Sauna Access', '1 Guest Pass / Month'].map((perk, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center">
                                <Check size={10} className="text-success stroke-[3]" />
                            </div>
                            <span className="text-sm font-bold text-fg/80">{perk}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
