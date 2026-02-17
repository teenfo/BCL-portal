'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Booking {
    id: string;
    session_id: string;
    status: string;
    created_at: string;
    session_title: string;
    session_date: string;
    start_time: string;
    end_time: string;
    coach_name: string;
}

export default function MyBookingsPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('upcoming');
    const [cancelling, setCancelling] = useState<string | null>(null);

    useEffect(() => { loadBookings(); }, []);

    async function loadBookings() {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const { data } = await supabase
            .from('bookings')
            .select('*, sessions(title, session_date, start_time, end_time, coach_name)')
            .eq('member_id', user.id)
            .order('created_at', { ascending: false });

        if (data) {
            setBookings(data.map((b: Record<string, unknown>) => {
                const s = b.sessions as Record<string, unknown> | null;
                return {
                    id: b.id as string,
                    session_id: b.session_id as string,
                    status: b.status as string,
                    created_at: b.created_at as string,
                    session_title: (s?.title as string) || '수업',
                    session_date: (s?.session_date as string) || '',
                    start_time: (s?.start_time as string) || '',
                    end_time: (s?.end_time as string) || '',
                    coach_name: (s?.coach_name as string) || '',
                };
            }));
        }
        setLoading(false);
    }

    async function cancelBooking(bookingId: string) {
        if (!confirm('예약을 취소하시겠습니까?')) return;
        setCancelling(bookingId);
        const supabase = createClient();
        const { error } = await supabase
            .from('bookings')
            .update({ status: 'cancelled' })
            .eq('id', bookingId);

        if (error) {
            alert('취소에 실패했습니다.');
        } else {
            alert('예약이 취소되었습니다.');
            loadBookings();
        }
        setCancelling(null);
    }

    const now = new Date();
    const filtered = bookings.filter(b => {
        if (filter === 'upcoming') return ['confirmed', 'pending'].includes(b.status);
        if (filter === 'past') return ['completed', 'cancelled'].includes(b.status);
        return true;
    });

    function statusBadge(s: string) {
        switch (s) {
            case 'confirmed': return { label: '확정', color: '#4ade80', bg: 'rgba(74,222,128,0.1)' };
            case 'pending': return { label: '대기', color: '#facc15', bg: 'rgba(250,204,21,0.1)' };
            case 'completed': return { label: '완료', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' };
            case 'cancelled': return { label: '취소됨', color: '#f87171', bg: 'rgba(248,113,113,0.1)' };
            default: return { label: s, color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.05)' };
        }
    }

    if (loading) return <div className="app-page"><div className="app-skeleton" style={{ height: 300 }} /></div>;

    return (
        <div className="app-page">
            <Link href="/apps/schedule" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>← 스케줄로 돌아가기</Link>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', margin: '1rem 0 0.25rem' }}>내 예약</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: '1rem' }}>예약 현황 및 관리</p>

            <div className="app-filter-chips" style={{ marginBottom: '1.5rem' }}>
                {['upcoming', 'past', 'all'].map(f => (
                    <button key={f} className={`app-filter-chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                        {f === 'upcoming' ? '예정된 예약' : f === 'past' ? '지난 예약' : '전체'}
                    </button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <div className="app-empty-state">
                    <div className="emoji">📅</div>
                    <div className="message">{filter === 'upcoming' ? '예정된 예약이 없습니다' : '예약 내역이 없습니다'}</div>
                    {filter === 'upcoming' && (
                        <Link href="/apps/schedule" className="app-btn-primary" style={{ marginTop: '1rem', display: 'inline-block', textDecoration: 'none' }}>수업 예약하기</Link>
                    )}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {filtered.map(b => {
                        const badge = statusBadge(b.status);
                        const canCancel = ['confirmed', 'pending'].includes(b.status);
                        return (
                            <div key={b.id} className="app-glass-card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                    <div>
                                        <h4 style={{ color: '#fff', fontWeight: 700 }}>{b.session_title}</h4>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.125rem' }}>
                                            {b.session_date && new Date(b.session_date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                                            {b.start_time && ` · ${b.start_time.slice(0, 5)}`}
                                            {b.end_time && `~${b.end_time.slice(0, 5)}`}
                                        </p>
                                    </div>
                                    <span style={{ padding: '0.125rem 0.5rem', borderRadius: 9999, fontSize: '0.6875rem', fontWeight: 600, background: badge.bg, color: badge.color }}>{badge.label}</span>
                                </div>
                                {b.coach_name && <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: '0.5rem' }}>👤 {b.coach_name}</p>}
                                {canCancel && (
                                    <button onClick={() => cancelBooking(b.id)} disabled={cancelling === b.id}
                                        style={{ width: '100%', padding: '0.625rem', borderRadius: 8, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171', fontWeight: 600, cursor: 'pointer', fontSize: '0.8125rem' }}>
                                        {cancelling === b.id ? '취소 처리 중...' : '예약 취소'}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
