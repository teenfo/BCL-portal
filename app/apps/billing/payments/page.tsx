"use client";

import { History, Download, ArrowDownLeft } from "lucide-react";

export default function UserPaymentsPage() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <header>
                <h1 className="text-2xl font-black tracking-tight">Payment History</h1>
                <p className="text-muted text-sm font-medium mt-1">Receipts and invoices.</p>
            </header>

            <div className="space-y-4">
                {[
                    { title: "Monthly Membership", date: "Jan 25, 2026", amount: "$99.00", status: "Paid" },
                    { title: "Personal Training Pack", date: "Jan 12, 2026", amount: "$450.00", status: "Paid" },
                    { title: "Energy Drink", date: "Jan 10, 2026", amount: "$4.50", status: "Paid" },
                ].map((tx, i) => (
                    <div key={i} className="bg-surface p-5 rounded-3xl border border-border shadow-soft flex items-center justify-between group cursor-pointer hover:bg-surface2/30 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-surface2 flex items-center justify-center text-muted">
                                <ArrowDownLeft size={20} />
                            </div>
                            <div>
                                <p className="text-sm font-bold tracking-tight">{tx.title}</p>
                                <p className="text-[10px] text-muted font-medium">{tx.date}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-black">{tx.amount}</p>
                            <span className="text-[9px] font-black text-success uppercase tracking-widest">
                                {tx.status}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
