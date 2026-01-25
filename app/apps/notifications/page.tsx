"use client";

import { Bell, Info, Zap, Calendar, ArrowRight, Trash2 } from "lucide-react";
import { useState } from "react";

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState([
        { id: 1, type: 'info', title: 'New Schedule Available', desc: 'The Lunar New Year classes are now open for booking.', time: '2 hours ago', unread: true },
        { id: 2, type: 'success', title: 'Booking Confirmed', desc: 'Your spot for HIIT Cardio Elite is secure.', time: 'Yesterday', unread: false },
        { id: 3, type: 'warning', title: 'Membership Expiring', desc: 'Your plan expires in 12 days. Renew now for a 10% discount.', time: '2 days ago', unread: false },
    ]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">Activity Feed</h1>
                    <p className="text-muted text-sm font-medium">Notifications and session updates.</p>
                </div>
                <button className="text-[10px] font-black uppercase text-muted hover:text-primary transition-colors">
                    Mark all as read
                </button>
            </header>

            <div className="space-y-4">
                {notifications.map((n) => (
                    <div key={n.id} className={`p-6 rounded-[2rem] border transition-all hover:border-primary/20 bg-surface relative overflow-hidden group ${n.unread ? 'border-primary/30 shadow-md' : 'border-border shadow-soft'}`}>
                        {n.unread && (
                            <div className="absolute top-6 right-6 w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                        )}

                        <div className="flex gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${n.type === 'info' ? 'bg-primary-soft text-primary' :
                                    n.type === 'success' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                                }`}>
                                {n.type === 'info' && <Bell size={20} />}
                                {n.type === 'success' && <Zap size={20} />}
                                {n.type === 'warning' && <Info size={20} />}
                            </div>

                            <div className="flex-1 min-w-0 pr-4">
                                <div className="flex justify-between items-baseline mb-1">
                                    <h3 className="font-exrabold text-sm tracking-tight truncate">{n.title}</h3>
                                    <span className="text-[8px] font-bold text-muted uppercase tracking-tighter whitespace-nowrap ml-2 italic">{n.time}</span>
                                </div>
                                <p className="text-xs text-muted font-medium leading-relaxed">{n.desc}</p>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-border/50 flex justify-between items-center">
                            <button className="text-[10px] font-black text-primary uppercase flex items-center gap-1">
                                Details
                                <ArrowRight size={12} />
                            </button>
                            <button className="p-2 text-muted hover:text-danger hover:bg-danger/10 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {notifications.length === 0 && (
                <div className="py-20 text-center">
                    <div className="w-16 h-16 bg-surface2 rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
                        <Bell size={24} className="text-muted" />
                    </div>
                    <p className="text-sm font-bold text-muted uppercase tracking-widest">Inbox Zero</p>
                    <p className="text-xs text-muted mt-1 italic">No new activity to show</p>
                </div>
            )}
        </div>
    );
}
