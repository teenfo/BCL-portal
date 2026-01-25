"use client";

import { Bell, Info, AlertTriangle, ChevronRight } from "lucide-react";

export default function UserNoticesPage() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <header>
                <h1 className="text-2xl font-black tracking-tight">Announcements</h1>
                <p className="text-muted text-sm font-medium mt-1">News and updates from BCL.</p>
            </header>

            <div className="space-y-4">
                {[
                    { title: "Holiday Operation Hours", date: "Jan 24", type: "Urgent", icon: AlertTriangle, color: "text-warning" },
                    { title: "New Yoga Class Added", date: "Jan 22", type: "Info", icon: Info, color: "text-primary" },
                    { title: "System Maintenance", date: "Jan 20", type: "System", icon: Bell, color: "text-muted" },
                ].map((notice, i) => (
                    <div key={i} className="bg-surface rounded-3xl p-6 border border-border shadow-soft relative overflow-hidden group active:scale-[0.99] transition-all cursor-pointer">
                        <div className="flex justify-between items-start mb-3">
                            <span className={`px-2 py-1 rounded-lg bg-surface2 text-[10px] font-black uppercase tracking-widest ${notice.color}`}>
                                {notice.type}
                            </span>
                            <span className="text-[10px] font-bold text-muted">{notice.date}</span>
                        </div>
                        <h3 className="font-extrabold text-base tracking-tight mb-2 pr-8">{notice.title}</h3>
                        <p className="text-sm text-muted line-clamp-2">
                            This is a summary of the announcement. Tap to read the full details about the upcoming schedule changes and facility updates.
                        </p>

                        <div className="absolute bottom-4 right-4 text-muted group-hover:text-primary transition-colors">
                            <ChevronRight size={18} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
