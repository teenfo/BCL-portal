"use client";

import { useState } from "react";
import { Calendar, Clock, MapPin, ChevronRight, XCircle } from "lucide-react";
import Link from "next/link";

export default function MyBookingsPage() {
    const [bookings, setBookings] = useState([
        { id: '1', title: 'HIIT Cardio Elite', date: 'Jan 25, 2026', time: '09:00 AM', branch: 'Central Branch', status: 'Upcoming' },
        { id: '2', title: 'Vinyasa Flow', date: 'Jan 23, 2026', time: '11:00 AM', branch: 'Central Branch', status: 'Attended' },
        { id: '3', title: 'Power Lifting', date: 'Jan 21, 2026', time: '18:00 PM', branch: 'West Side Lab', status: 'Cancelled' },
    ]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header>
                <h1 className="text-2xl font-black tracking-tight">My Bookings</h1>
                <p className="text-muted text-sm font-medium">Manage your upcoming and past sessions.</p>
            </header>

            {/* Filter Tabs Placeholder */}
            <div className="flex gap-2 p-1 bg-surface2 rounded-2xl border border-border">
                <button className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white shadow-sm">Upcoming</button>
                <button className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-muted">History</button>
            </div>

            <div className="space-y-4">
                {bookings.map((booking) => (
                    <div key={booking.id} className="bg-surface rounded-3xl border border-border shadow-soft overflow-hidden group">
                        <div className="p-5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`w-1.5 h-12 rounded-full ${booking.status === 'Upcoming' ? 'bg-primary' :
                                        booking.status === 'Attended' ? 'bg-success' : 'bg-muted/50'
                                    }`}></div>
                                <div>
                                    <h3 className="font-exrabold text-sm tracking-tight">{booking.title}</h3>
                                    <p className="text-[10px] text-muted font-bold uppercase tracking-widest">{booking.date} • {booking.time}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${booking.status === 'Upcoming' ? 'bg-primary/10 text-primary' :
                                        booking.status === 'Attended' ? 'bg-success/10 text-success' : 'bg-surface2 text-muted'
                                    }`}>
                                    {booking.status}
                                </span>
                            </div>
                        </div>

                        <div className="p-4 bg-surface2/30 border-t border-border flex items-center justify-between">
                            <div className="flex items-center gap-2 text-muted">
                                <MapPin size={12} />
                                <span className="text-[10px] font-bold">{booking.branch}</span>
                            </div>
                            {booking.status === 'Upcoming' && (
                                <button className="flex items-center gap-1.5 text-[10px] font-black text-danger uppercase hover:underline">
                                    <XCircle size={12} />
                                    Cancel
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-10 text-center">
                <Link href="/apps/schedule" className="inline-flex items-center gap-2 bg-primary text-on-primary px-8 py-4 rounded-[1.5rem] font-black text-sm shadow-xl shadow-primary/20 hover:scale-105 transition-transform active:scale-95">
                    Book New Session
                    <ChevronRight size={18} />
                </Link>
            </div>
        </div>
    );
}
