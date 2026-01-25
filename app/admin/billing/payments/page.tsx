"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/assets/theme/hooks/supabase";
import {
    DollarSign,
    TrendingUp,
    CreditCard,
    ArrowUpRight,
    ArrowDownLeft,
    Search,
    Filter,
    MoreHorizontal,
    Download
} from "lucide-react";

interface Transaction {
    id: string;
    member_email: string;
    amount: number;
    status: 'completed' | 'pending' | 'failed';
    date: string;
    method: string;
}

export default function AdminBillingPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        const fetchTransactions = async () => {
            setLoading(true);
            const { data, error } = await supabase.from("transactions").select("*");
            if (error) {
                setTransactions([
                    { id: 'TX_1001', member_email: 'user1@example.com', amount: 99.00, status: 'completed', date: '2026-01-25', method: 'Visa •• 4242' },
                    { id: 'TX_1002', member_email: 'newbie@gmail.com', amount: 49.00, status: 'completed', date: '2026-01-24', method: 'Apple Pay' },
                    { id: 'TX_1003', member_email: 'pro@fitness.com', amount: 199.00, status: 'pending', date: '2026-01-25', method: 'Mastercard •• 8888' },
                ]);
            } else {
                setTransactions(data || []);
            }
            setLoading(false);
        };
        fetchTransactions();
    }, [supabase]);

    const stats = [
        { name: "Total Revenue", value: "$12,450.00", change: "+12.5%", icon: DollarSign, color: "text-primary" },
        { name: "Monthly Sales", value: "$4,200.00", change: "+8.2%", icon: TrendingUp, color: "text-success" },
        { name: "Pending", value: "$199.00", status: "Active", icon: CreditCard, color: "text-warning" },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">Financial Overview</h1>
                    <p className="text-muted text-sm font-medium mt-1">Track revenue, payments, and membership transactions.</p>
                </div>
                <button className="bg-surface border border-border px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-surface2 transition-all">
                    <Download size={16} />
                    Export CSV
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-surface p-6 rounded-3xl border border-border shadow-soft group hover:border-primary/20 transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-2xl bg-surface2 ${stat.color}`}>
                                <stat.icon size={20} />
                            </div>
                            {stat.change && (
                                <span className="text-[10px] font-black text-success bg-success/10 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                    <ArrowUpRight size={10} />
                                    {stat.change}
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] text-muted font-bold uppercase tracking-widest">{stat.name}</p>
                        <p className="text-2xl font-black mt-1">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Transaction Table */}
            <div className="bg-surface rounded-3xl border border-border shadow-soft overflow-hidden">
                <div className="p-6 border-b border-border flex flex-wrap gap-4 items-center justify-between bg-surface2/30">
                    <h3 className="text-sm font-bold tracking-tight">Recent Transactions</h3>
                    <div className="flex gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={14} />
                            <input type="text" placeholder="Search transactions..." className="bg-surface border border-border pl-9 pr-4 py-2 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/20 w-48 md:w-64" />
                        </div>
                        <button className="p-2 border border-border rounded-lg text-muted hover:bg-surface2"><Filter size={16} /></button>
                    </div>
                </div>

                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-surface2/50 text-muted border-b border-border text-[10px] font-black uppercase tracking-widest italic">
                            <th className="p-5">Transaction ID</th>
                            <th className="p-5">Member</th>
                            <th className="p-5 text-right">Amount</th>
                            <th className="p-5">Status</th>
                            <th className="p-5">Method</th>
                            <th className="p-5 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {loading ? (
                            [1, 2, 3].map(i => <tr key={i} className="animate-pulse"><td colSpan={6} className="p-5 h-16 bg-surface2/10"></td></tr>)
                        ) : (
                            transactions.map((tx) => (
                                <tr key={tx.id} className="hover:bg-surface2/30 transition-colors group">
                                    <td className="p-5 font-mono text-xs font-bold text-muted">{tx.id}</td>
                                    <td className="p-5">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm tracking-tight">{tx.member_email.split('@')[0]}</span>
                                            <span className="text-[10px] text-muted">{tx.member_email}</span>
                                        </div>
                                    </td>
                                    <td className="p-5 text-right font-black text-fg">
                                        ${tx.amount.toFixed(2)}
                                    </td>
                                    <td className="p-5">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${tx.status === 'completed' ? 'bg-success/10 text-success' :
                                                tx.status === 'pending' ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'
                                            }`}>
                                            {tx.status}
                                        </span>
                                    </td>
                                    <td className="p-5 text-muted text-xs font-medium">
                                        {tx.method}
                                    </td>
                                    <td className="p-5 text-right">
                                        <button className="p-2 text-muted hover:bg-surface2 rounded-lg"><MoreHorizontal size={18} /></button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
