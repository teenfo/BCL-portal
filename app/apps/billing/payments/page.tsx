"use client";

import { CreditCard, Download, ArrowLeft, History, DollarSign } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function UserPaymentsPage() {
    const router = useRouter();

    const transactions = [
        { id: 'TX-9921', date: 'Jan 25, 2026', amount: 99.00, plan: 'Iron Pulse Elite', status: 'Completed' },
        { id: 'TX-8812', date: 'Dec 25, 2025', amount: 99.00, plan: 'Iron Pulse Elite', status: 'Completed' },
        { id: 'TX-7705', date: 'Nov 25, 2025', amount: 49.00, plan: 'Iron Pulse Lite', status: 'Completed' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            <header className="flex items-center gap-4">
                <button onClick={() => router.back()} className="p-3 bg-surface border border-border rounded-2xl text-muted hover:text-fg transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-black tracking-tight">Billing History</h1>
            </header>

            {/* Hero Card */}
            <div className="bg-surface2/50 rounded-[2.5rem] p-8 border border-border shadow-inner text-center">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-card flex items-center justify-center mx-auto mb-4 border border-border">
                    <DollarSign size={24} className="text-primary" />
                </div>
                <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Total Spent This Year</p>
                <p className="text-3xl font-black mt-1">$247.00</p>
            </div>

            <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted px-1">Transactions</h3>
                <div className="bg-surface rounded-3xl border border-border divide-y divide-border overflow-hidden shadow-soft">
                    {transactions.map((tx) => (
                        <div key={tx.id} className="p-5 flex items-center justify-between hover:bg-surface2/30 transition-colors cursor-pointer group">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-surface2 text-muted flex items-center justify-center border border-border/50">
                                    <CreditCard size={18} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold tracking-tight">{tx.plan}</p>
                                    <p className="text-[10px] text-muted font-bold uppercase">{tx.date}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-black italic">${tx.amount.toFixed(2)}</p>
                                <button className="text-[10px] font-black text-primary uppercase flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Download size={10} />
                                    Receipt
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="p-6 bg-surface2/20 rounded-3xl border border-dashed border-border text-center">
                <p className="text-[10px] text-muted font-medium italic leading-relaxed">
                    Need a corporate invoice or tax statement? Please contact support.
                </p>
                <Link href="/apps/support" className="text-[10px] font-black text-primary uppercase mt-2 block">
                    Contact Support →
                </Link>
            </div>
        </div>
    );
}
