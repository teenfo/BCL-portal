"use client";

import { CheckCircle2, QrCode, ArrowLeft, History } from "lucide-react";
import Link from "next/link";

export default function CheckinHistoryPage() {
    const history = [
        { id: 1, facility: "Central Branch", date: "Jan 25, 2026", time: "09:12 AM", status: "Success" },
        { id: 2, facility: "Central Branch", date: "Jan 23, 2026", time: "18:30 PM", status: "Success" },
        { id: 3, facility: "West Side Lab", date: "Jan 21, 2026", time: "07:05 AM", status: "Success" },
        { id: 4, facility: "Central Branch", date: "Jan 19, 2026", time: "17:45 PM", status: "Success" },
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <header className="flex items-center gap-4">
                <Link href="/apps/checkin" className="p-2 bg-surface2 rounded-xl text-muted hover:text-fg transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-2xl font-black tracking-tight">Access History</h1>
                    <p className="text-muted text-sm font-medium">Your recent entries across all branches</p>
                </div>
            </header>

            <div className="bg-surface rounded-[2rem] border border-border shadow-soft overflow-hidden">
                <div className="p-6 border-b border-border bg-surface2/30 flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary-soft rounded-2xl flex items-center justify-center text-primary">
                        <History size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-muted">Summary</p>
                        <p className="text-lg font-black">{history.length} Entries <span className="text-muted text-xs font-bold">This Month</span></p>
                    </div>
                </div>

                <div className="divide-y divide-border">
                    {history.map((item) => (
                        <div key={item.id} className="p-5 flex items-center justify-between hover:bg-surface2/50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-1.5 h-10 bg-success rounded-full"></div>
                                <div>
                                    <h3 className="text-sm font-bold tracking-tight">{item.facility}</h3>
                                    <p className="text-[10px] text-muted font-bold uppercase">{item.date} • {item.time}</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-black uppercase text-success bg-success/10 px-2 py-0.5 rounded-md">Verified</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="p-6 text-center">
                <button className="text-muted text-xs font-bold uppercase tracking-widest hover:text-primary transition-colors">
                    Load More History
                </button>
            </div>
        </div>
    );
}
