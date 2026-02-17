'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import AdminPageHeader from '@/components/layout/AdminPageHeader';
import { IconNotes } from '@/components/icons/AdminIcons';

interface Booking {
    id: string;
    member_id: string;
    session_id: string;
    status: 'confirmed' | 'waitlist' | 'cancelled' | 'attended';
    created_at: string;
    members?: { name: string };
    sessions?: { title: string; start_time: string };
}

export default function ReservationsPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'confirmed' | 'waitlist' | 'cancelled' | 'attended'>('all');

    const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
        confirmed: { bg: 'rgba(34, 197, 94, 0.15)', color: '#22C55E', label: '확정' },
        waitlist: { bg: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', label: '대기' },
        cancelled: { bg: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', label: '취소' },
        attended: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6', label: '출석' },
    };

    const loadBookings = useCallback(async () => {
        const supabase = createClient();
        setLoading(true);

        try {
            let query: any = supabase
                .from('bookings')
                .select('*, members!bookings_member_id_fkey(name), sessions!bookings_session_id_fkey(title, start_time)');

            if (filter !== 'all') {
                query = query.eq('status', filter);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) {
                // Fallback: query without joins
                console.warn('Bookings JOIN query error, trying fallback:', error.message);
                const { data: fallbackData } = await supabase
                    .from('bookings')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (fallbackData) {
                    setBookings(fallbackData.map((b: any) => ({
                        ...b,
                        member_id: b.member_id || b.user_id,
                    })) as any);
                }
            } else {
                setBookings((data || []).map((b: any) => ({
                    ...b,
                    member_id: b.member_id || b.user_id,
                })) as any);
            }
        } catch (e) {
            console.error('Error loading bookings:', e);
        }
        setLoading(false);
    }, [filter]);

    useEffect(() => {
        loadBookings();
    }, [loadBookings]);

    async function updateStatus(bookingId: string, newStatus: string) {
        const supabase = createClient();
        await supabase.from('bookings').update({ status: newStatus }).eq('id', bookingId);
        loadBookings();
    }

    return (
        <div className="transition-all duration-700">
            <AdminPageHeader
                category="Operations"
                title="Reservations"
                subtitle="Control"
            />

            <div className="p-8 lg:p-10 max-w-[1400px] mx-auto">
                {/* Filters */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="flex gap-2">
                        {(['all', 'waitlist', 'confirmed', 'cancelled', 'attended'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`admin-filter-btn ${filter === f ? 'active' : ''}`}
                            >
                                {f === 'all' ? '전체' : statusConfig[f]?.label || f}
                            </button>
                        ))}
                    </div>
                    <div className="flex-1" />
                    <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                        {bookings.length}건
                    </span>
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
                                {bookings.map((booking) => {
                                    const sc = statusConfig[booking.status] || statusConfig.pending;
                                    return (
                                        <div key={booking.id} className="grid grid-cols-12 gap-6 items-center p-6 rounded-2xl bg-white/[0.02] border border-white/[0.03] hover:border-white/10 transition-all group">
                                            <div className="col-span-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-black" style={{ background: 'linear-gradient(135deg, rgba(255,107,0,0.3), rgba(255,107,0,0.1))', color: 'var(--primary)' }}>
                                                        {booking.members?.name?.charAt(0) || '?'}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-white group-hover:text-[var(--primary)] transition-colors">{booking.members?.name || 'Unknown Member'}</h4>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-span-3">
                                                <p className="text-xs font-bold text-white uppercase">{booking.sessions?.title || 'Unknown Session'}</p>
                                                <p className="text-[9px] text-[var(--primary)] mt-0.5 font-bold">
                                                    {booking.sessions?.start_time ? new Date(booking.sessions.start_time).toLocaleString('ko-KR') : 'N/A'}
                                                </p>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-[10px] text-[var(--text-muted)]">{new Date(booking.created_at).toLocaleDateString('ko-KR')}</p>
                                            </div>
                                            <div className="col-span-2">
                                                <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase" style={{ background: sc.bg, color: sc.color }}>
                                                    {sc.label}
                                                </span>
                                            </div>
                                            <div className="col-span-2 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {booking.status === 'waitlist' && (
                                                    <button
                                                        onClick={() => updateStatus(booking.id, 'confirmed')}
                                                        className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-all"
                                                    >
                                                        확정
                                                    </button>
                                                )}
                                                {booking.status !== 'cancelled' && (
                                                    <button
                                                        onClick={() => updateStatus(booking.id, 'cancelled')}
                                                        className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
                                                    >
                                                        취소
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
