'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import Logo from '@/components/ui/Logo';

interface Booking {
    id: string;
    member_id: string;
    session_id: string;
    status: 'pending' | 'confirmed' | 'cancelled';
    created_at: string;
    members?: { name: string };
    sessions?: { name: string, start_time: string };
}

export default function ReservationsPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled'>('all');

    const loadBookings = useCallback(async () => {
        const supabase = createClient();
        let query = supabase.from('bookings').select('*, members(name), sessions(name, start_time)');

        if (filter !== 'all') {
            query = query.eq('status', filter);
        }

        const { data, error } = await query.order('id', { ascending: false });

        if (error) {
            console.error('Error loading bookings:', error);
        } else {
            setBookings(data || []);
        }
        setLoading(false);
    }, [filter]);

    useEffect(() => {
        loadBookings();
    }, [loadBookings]);

    return (
        <div className="p-8 lg:p-12 transition-all duration-700">
            <header className="flex items-end justify-between mb-12 animate-premium-fade">
                <div className="space-y-4">
                    <Logo size={28} className="opacity-80" collapsed={true} />
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-[var(--primary)] shadow-[0_0_15px_var(--primary-glow)]"></span>
                            <span className="text-[11px] font-black text-[var(--primary)] uppercase tracking-[0.5em] italic">Operations</span>
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight leading-none uppercase">
                            Reservations <span className="opacity-20 font-light ml-2">Control</span>
                        </h1>
                    </div>
                </div>
                <div className="flex gap-2">
                    {['all', 'pending', 'confirmed', 'cancelled'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f as any)}
                            className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filter === f
                                ? 'bg-[var(--primary)] text-white shadow-[0_0_15px_rgba(255,107,0,0.3)]'
                                : 'bg-white/[0.03] border border-white/5 text-[var(--text-muted)] hover:text-white'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </header>

            {loading ? (
                <div className="flex justify-center py-64">
                    <div className="w-10 h-10 rounded-xl border-2 border-white/5 border-t-[var(--primary)] animate-spin"></div>
                </div>
            ) : (
                <div className="space-y-4">
                    {bookings.length === 0 ? (
                        <div className="glass-card p-20 flex flex-col items-center justify-center text-center opacity-40">
                            <span className="text-4xl mb-4">📝</span>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em]">No matching reservations found</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {bookings.map((booking) => (
                                <div key={booking.id} className="grid grid-cols-12 gap-6 items-center p-6 rounded-2xl bg-white/[0.02] border border-white/[0.03] hover:border-white/10 transition-all group">
                                    <div className="col-span-3">
                                        <h4 className="text-sm font-bold text-white group-hover:text-[var(--primary)] transition-colors uppercase">{booking.members?.name || 'Unknown Member'}</h4>
                                        <p className="text-[9px] text-[var(--text-muted)] mt-1 tracking-tighter">ID: {booking.id}</p>
                                    </div>
                                    <div className="col-span-4">
                                        <p className="text-xs font-bold text-white uppercase">{booking.sessions?.name || 'Unknown Session'}</p>
                                        <p className="text-[9px] text-[var(--primary)] mt-0.5 font-bold uppercase tracking-widest">
                                            {booking.sessions?.start_time ? new Date(booking.sessions.start_time).toLocaleString() : 'N/A'}
                                        </p>
                                    </div>
                                    <div className="col-span-2">
                                        <span className={`badge ${booking.status === 'confirmed' ? 'badge-success' :
                                            booking.status === 'pending' ? 'badge-warning' : 'badge-error'
                                            }`}>
                                            {booking.status}
                                        </span>
                                    </div>
                                    <div className="col-span-3 text-right">
                                        <button className="px-4 py-2 rounded-lg bg-white/[0.03] border border-white/5 text-[9px] font-black text-white hover:border-[var(--primary)]/50 transition-all uppercase tracking-widest">
                                            Actions
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
