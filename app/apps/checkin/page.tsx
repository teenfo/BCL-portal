"use client";

import { QrCode, RefreshCw, ShieldCheck, History } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function UserCheckinPage() {
    const [timeLeft, setTimeLeft] = useState(60);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => (prev > 0 ? prev - 1 : 60));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="text-center space-y-2 mt-4">
                <h1 className="text-2xl font-black tracking-tight">Express Check-in</h1>
                <p className="text-muted text-sm font-medium">Scan this QR code at the entrance kiosk.</p>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl mx-auto w-full max-w-sm relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-2 bg-primary animate-pulse"></div>

                <div className="aspect-square bg-slate-100 rounded-2xl flex items-center justify-center mb-6 relative group cursor-pointer">
                    <QrCode size={180} className="text-slate-900" />
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <RefreshCw size={32} className="text-slate-900" />
                    </div>
                </div>

                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2 text-slate-500">
                        <ShieldCheck size={16} className="text-success" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Secure ID</span>
                    </div>
                    <p className="font-mono text-sm font-bold text-slate-700">00:{timeLeft.toString().padStart(2, '0')}</p>
                </div>
            </div>

            <div className="max-w-sm mx-auto">
                <Link href="/apps/checkin/history" className="bg-surface rounded-2xl p-4 border border-border flex items-center justify-between group active:scale-[0.98] transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-surface2 flex items-center justify-center text-muted group-hover:text-primary transition-colors">
                            <History size={20} />
                        </div>
                        <div>
                            <p className="font-bold text-sm">View Check-in History</p>
                            <p className="text-[10px] text-muted font-medium">Last visit: 2 days ago</p>
                        </div>
                    </div>
                </Link>
            </div>
        </div>
    );
}
