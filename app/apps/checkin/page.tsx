"use client";

import { QrCode, History, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function CheckinPage() {
    const [timestamp, setTimestamp] = useState(new Date().toLocaleTimeString());

    useEffect(() => {
        const timer = setInterval(() => {
            setTimestamp(new Date().toLocaleTimeString());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header>
                <h1 className="text-2xl font-black tracking-tight">Entry Pass</h1>
                <p className="text-muted text-sm font-medium">Scan this code at the facility terminal</p>
            </header>

            <div className="bg-surface rounded-[3rem] p-10 border border-border shadow-2xl flex flex-col items-center justify-center relative overflow-hidden group">
                {/* QR Frame */}
                <div className="relative p-6 bg-white rounded-3xl shadow-inner border border-slate-100 flex items-center justify-center aspect-square w-full max-w-[240px]">
                    <div className="w-full h-full bg-slate-50 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-200">
                        <QrCode size={140} className="text-slate-200" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[10px] font-mono text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-100">8829-0012-44</span>
                        </div>
                    </div>

                    {/* Scanner line effect */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-primary/20 animate-scan pointer-events-none"></div>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-lg font-black tracking-tighter">{timestamp}</p>
                    <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">Refreshes automatically</p>
                </div>

                {/* Decorative elements */}
                <div className="absolute top-4 right-6">
                    <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Link href="/apps/checkin/history" className="bg-surface p-5 rounded-3xl border border-border shadow-soft flex items-center gap-3 active:scale-[0.98] transition-transform">
                    <History size={18} className="text-primary" />
                    <span className="text-xs font-bold uppercase tracking-widest">History</span>
                </Link>
                <Link href="/apps/facilities" className="bg-surface p-5 rounded-3xl border border-border shadow-soft flex items-center justify-between active:scale-[0.98] transition-transform">
                    <span className="text-xs font-bold uppercase tracking-widest">Branches</span>
                    <ArrowRight size={16} className="text-muted" />
                </Link>
            </div>

            <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10 text-center">
                <p className="text-[10px] text-muted font-medium leading-relaxed italic">
                    Please ensure your screen brightness is turned up for the best scanning experience.
                </p>
            </div>
        </div>
    );
}
