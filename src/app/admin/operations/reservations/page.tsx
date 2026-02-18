'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import AdminPageHeader from '@/components/layout/AdminPageHeader';
import AdminModal from '@/components/layout/AdminModal';
import { IconNotes } from '@/components/icons/AdminIcons';

interface Booking {
    id: string;
    member_id: string;
    session_id: string;
    status: 'confirmed' | 'waitlist' | 'cancelled' | 'attended' | 'no_show';
    created_at: string;
    members?: { name: string; phone?: string };
    sessions?: { title: string; start_time: string; max_participants?: number };
}

export default function ReservationsPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'confirmed' | 'waitlist' | 'cancelled' | 'attended' | 'no_show'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    // T1-5: Session roster state
    const [selectedSession, setSelectedSession] = useState<string | null>(null);
    const [showRoster, setShowRoster] = useState(false);

    const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
        confirmed: { bg: 'rgba(34, 197, 94, 0.15)', color: '#22C55E', label: '확정' },
        waitlist: { bg: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', label: '대기' },
        cancelled: { bg: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', label: '취소' },
        no_show: { bg: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', label: '노쇼' },
    };

    const loadBookings = useCallback(async () => {
        const supabase = createClient();
        setLoading(true);

        try {
            let query: any = supabase
                .from('bookings')
                .select('*, members!bookings_member_id_fkey(name, phone), sessions!bookings_session_id_fkey(title, start_time, max_participants)');

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

        // T1-5: If cancelling a confirmed booking, auto-promote next waitlisted
        if (newStatus === 'cancelled' || newStatus === 'no_show') {
            const booking = bookings.find(b => b.id === bookingId);
            if (booking && booking.status === 'confirmed') {
                const nextWaitlist = bookings
                    .filter(b => b.session_id === booking.session_id && b.status === 'waitlist')
                    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
                if (nextWaitlist) {
                    await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', nextWaitlist.id);
                }
            }
        }
        loadBookings();
    }

    // T1-5: Get roster for a session
    function getSessionRoster(sessionId: string) {
        return bookings.filter(b => b.session_id === sessionId && b.status !== 'cancelled');
    }

    // T1-5: Session grouping for roster view
    const uniqueSessions = Array.from(new Set(bookings.map(b => b.session_id))).map(sid => {
        const b = bookings.find(x => x.session_id === sid);
        return { id: sid, title: b?.sessions?.title || 'Unknown', start_time: b?.sessions?.start_time || '' };
    }).sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

    const filteredBookings = bookings.filter(b => {
        if (!searchTerm) return true;
        return b.members?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || b.sessions?.title?.toLowerCase().includes(searchTerm.toLowerCase());
    });

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
                        {(['all', 'waitlist', 'confirmed', 'cancelled', 'attended', 'no_show'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`admin-filter-btn ${filter === f ? 'active' : ''}`}
                            >
                                {f === 'all' ? '전체' : statusConfig[f]?.label || f}
                            </button>
                        ))}
                    </div>
                    <div className="flex-1">
                        <input type="text" placeholder="회원명, 세션명 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="admin-search-input" />
                    </div>
                    <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                        {filteredBookings.length}건
                    </span>
                </div>
                {loading ? (
                    <div className="flex justify-center py-64">
                        <div className="w-10 h-10 rounded-xl border-2 border-white/5 border-t-[var(--primary)] animate-spin"></div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredBookings.length === 0 ? (
                            <div className="glass-card p-20 flex flex-col items-center justify-center text-center opacity-40">
                                <span className="text-4xl mb-4"><IconNotes size={40} /></span>
                                <p className="text-[10px] font-black uppercase tracking-[0.4em]">No matching reservations found</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredBookings.map((booking) => {
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
                                                {/* T1-5: Session roster button */}
                                                <button
                                                    onClick={() => { setSelectedSession(booking.session_id); setShowRoster(true); }}
                                                    className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-white/[0.03] border border-white/5 text-white/60 hover:border-white/10 transition-all"
                                                >
                                                    명단
                                                </button>
                                                {booking.status === 'waitlist' && (
                                                    <button
                                                        onClick={() => updateStatus(booking.id, 'confirmed')}
                                                        className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-all"
                                                    >
                                                        확정
                                                    </button>
                                                )}
                                                {/* T1-5: No-show button */}
                                                {(booking.status === 'confirmed') && (
                                                    <button
                                                        onClick={() => updateStatus(booking.id, 'no_show')}
                                                        className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
                                                    >
                                                        노쇼
                                                    </button>
                                                )}
                                                {(booking.status === 'confirmed') && (
                                                    <button
                                                        onClick={() => updateStatus(booking.id, 'attended')}
                                                        className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all"
                                                    >
                                                        출석
                                                    </button>
                                                )}
                                                {booking.status !== 'cancelled' && booking.status !== 'attended' && booking.status !== 'no_show' && (
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

                {/* T1-5: Session Roster Modal */}
                <AdminModal show={showRoster && !!selectedSession} onClose={() => { setShowRoster(false); setSelectedSession(null); }} title="세션 참석자 명단" subtitle={uniqueSessions.find(s => s.id === selectedSession)?.title || ''}>
                    {selectedSession && (() => {
                        const roster = getSessionRoster(selectedSession);
                        const confirmed = roster.filter(b => b.status === 'confirmed' || b.status === 'attended');
                        const waitlisted = roster.filter(b => b.status === 'waitlist');
                        const noShows = roster.filter(b => b.status === 'no_show');
                        return (
                            <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-3 text-center">
                                    <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/10"><p className="text-[8px] text-green-500 uppercase mb-1">확정</p><p className="text-lg font-black text-white">{confirmed.length}</p></div>
                                    <div className="p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/10"><p className="text-[8px] text-yellow-500 uppercase mb-1">대기</p><p className="text-lg font-black text-white">{waitlisted.length}</p></div>
                                    <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10"><p className="text-[8px] text-red-500 uppercase mb-1">노쇼</p><p className="text-lg font-black text-white">{noShows.length}</p></div>
                                </div>
                                <div className="space-y-2">
                                    {roster.map(b => {
                                        const sc = statusConfig[b.status] || statusConfig.confirmed;
                                        return (
                                            <div key={b.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black" style={{ background: 'linear-gradient(135deg, rgba(255,107,0,0.3), rgba(255,107,0,0.1))', color: 'var(--primary)' }}>{b.members?.name?.charAt(0) || '?'}</div>
                                                    <div><p className="text-xs font-bold text-white">{b.members?.name}</p>{b.members?.phone && <p className="text-[9px] text-white/40">{b.members.phone}</p>}</div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-0.5 rounded-full text-[7px] font-black uppercase" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                                                    {b.status === 'confirmed' && (
                                                        <div className="flex gap-1">
                                                            <button onClick={() => { updateStatus(b.id, 'attended'); }} className="px-2 py-1 rounded text-[7px] font-black bg-blue-500/10 text-blue-400 hover:bg-blue-500/20">출석</button>
                                                            <button onClick={() => { updateStatus(b.id, 'no_show'); }} className="px-2 py-1 rounded text-[7px] font-black bg-red-500/10 text-red-400 hover:bg-red-500/20">노쇼</button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {roster.length === 0 && <p className="text-xs text-center py-6 text-white/30">참석자가 없습니다</p>}
                                </div>
                            </div>
                        );
                    })()}
                </AdminModal>
            </div>
        </div>
    );
}
