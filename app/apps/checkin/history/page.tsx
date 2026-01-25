"use client";

import { CheckCircle2, Cloud, Clock } from "lucide-react";

export default function UserCheckinHistoryPage() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <header>
                <h1 className="text-2xl font-black tracking-tight">Visit History</h1>
                <p className="text-muted text-sm font-medium mt-1">Your past gym entries.</p>
            </header>

            <div className="space-y-4">
                {[
                    { date: "Today", time: "09:30 AM", place: "Central Branch" },
                    { date: "Jan 23", time: "18:45 PM", place: "Gangnam Studio" },
                    { date: "Jan 21", time: "07:15 AM", place: "Central Branch" },
                    { date: "Jan 19", time: "19:20 PM", place: "Central Branch" },
                ].map((visit, i) => (
                    <div key={i} className="bg-surface rounded-2xl p-5 border border-border shadow-soft flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-surface2 border border-border/50">
                                <span className="text-[10px] font-bold text-muted uppercase">{visit.date.split(' ')[0]}</span>
                                <span className="text-sm font-black text-fg">{visit.date.split(' ')[1] || 'Today'}</span>
                            </div>
                            <div>
                                <p className="font-bold text-sm">{visit.place}</p>
                                <div className="flex items-center gap-1.5 text-muted mt-0.5">
                                    <Clock size={12} />
                                    <span className="text-[10px] font-bold">{visit.time}</span>
                                </div>
                            </div>
                        </div>
                        <CheckCircle2 size={18} className="text-success opacity-50" />
                    </div>
                ))}
            </div>
        </div>
    );
}
