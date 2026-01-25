"use client";

import { Bell, Calendar, Tag } from "lucide-react";
import { useState } from "react";

export default function UserNotificationsPage() {
    const [notifications, setNotifications] = useState([
        { id: 1, title: 'Session Confirmed', body: 'Your HIIT Cardio class is confirmed for tomorrow at 9 AM.', time: '2 hours ago', icon: Calendar, active: true },
        { id: 2, title: 'Payment Successful', body: 'Membership renewal was processed successfully.', time: 'Yesterday', icon: Tag, active: false },
        { id: 3, title: 'Welcome to BCL', body: 'Thanks for joining! Setup your profile to get started.', time: '2 days ago', icon: Bell, active: false },
    ]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <header className="flex justify-between items-center">
                <h1 className="text-2xl font-black tracking-tight">Inbox</h1>
                <button className="text-[10px] font-black text-primary uppercase">Mark all read</button>
            </header>

            <div className="space-y-4">
                {notifications.map((n) => (
                    <div key={n.id} className={`p-5 rounded-3xl border border-border flex gap-4 ${n.active ? 'bg-surface border-l-4 border-l-primary shadow-soft' : 'bg-surface2/30 opacity-60'}`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${n.active ? 'bg-primary/10 text-primary' : 'bg-surface2 text-muted'}`}>
                            <n.icon size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                                <h3 className={`text-sm font-bold ${n.active ? 'text-fg' : 'text-muted'}`}>{n.title}</h3>
                                <span className="text-[10px] font-medium text-muted whitespace-nowrap">{n.time}</span>
                            </div>
                            <p className="text-xs text-muted leading-relaxed line-clamp-2">{n.body}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
