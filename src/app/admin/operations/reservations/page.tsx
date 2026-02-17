'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import AdminPageHeader from '@/components/layout/AdminPageHeader';
import { IconNotes } from '@/components/icons/AdminIcons';

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
        <div className="transition-all duration-700">
            <AdminPageHeader
                category="Operations"
                title="Reservations"
                subtitle="Control"
            />

            <div className="p-8 lg:p-10">
                {/* Filters */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="flex gap-2">
                        {['all', 'pending', 'confirmed', 'cancelled'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f as any)}
                                className={`admin-filter-btn ${filter === f ? 'active' : ''}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
                {loading ? (
                    <div className="flex justify-center py-64">
                        <div className="w-10 h-10 rounded-xl border-2 border-white/5 border-t-[var(--primary)] animate-spin"></div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {bookings.length === 0 ? (
                            <div className="glass-card p-20 flex flex-col items-center justify-center text-center opacity-40">
                                <span className="text-4xl mb-4"><IconNotes size={40} /></span>
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
        </div>
    );
}
