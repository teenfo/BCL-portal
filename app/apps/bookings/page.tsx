"use client";

import { Calendar, Clock, MapPin, XCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export default function UserBookingsPage() {
    const [filter, setFilter] = useState('Upcoming');

    const bookings = [
        { id: 1, title: 'HIIT Cardio', date: 'Tomorrow', time: '09:00', status: 'Confirmed', statusColor: 'text-success' },
        { id: 2, title: 'Yoga Flow', date: 'Jan 28', time: '18:00', status: 'Waitlist', statusColor: 'text-warning' },
        { id: 3, title: 'Strength Pro', date: 'Jan 22', time: '14:30', status: 'Completed', statusColor: 'text-muted' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">My Bookings</h1>
                    <p className="text-muted text-sm font-medium mt-1">Manage your class schedule.</p>
                </div>
            </header>

            <div className="flex p-1 bg-surface2/50 rounded-xl">
                {['Upcoming', 'History'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${filter === f ? 'bg-surface shadow-soft text-fg' : 'text-muted hover:text-fg'}`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            <div className="space-y-4">
                {bookings.map((b) => (
                    <div key={b.id} className="bg-surface rounded-3xl p-5 border border-border shadow-soft group active:scale-[0.98] transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <span className={`px-2.5 py-1 rounded-lg bg-surface2 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${b.statusColor}`}>
                                {b.status === 'Confirmed' && <CheckCircle2 size={10} />}
                                {b.status}
                            </span>
                            <div className="flex items-center gap-1 text-muted text-xs font-bold">
                                <Calendar size={12} />
                                {b.date}
                            </div>
                        </div>

                        <h3 className="font-extrabold text-lg tracking-tight">{b.title}</h3>

                        <div className="flex items-center gap-4 mt-2 text-muted">
                            <div className="flex items-center gap-1.5">
                                <Clock size={14} className="text-primary" />
                                <span className="text-xs font-medium">{b.time}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <MapPin size={14} />
                                <span className="text-xs font-medium">Studio A</span>
                            </div>
                        </div>

                        {filter === 'Upcoming' && (
                            <button className="w-full mt-5 py-3 rounded-xl border border-danger/20 text-danger text-[10px] font-black uppercase hover:bg-danger/5 transition-colors flex items-center justify-center gap-2">
                                <XCircle size={14} />
                                Cancel Booking
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
