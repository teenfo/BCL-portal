'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { query, rpc } from '@/lib/supabase/query';
import { useToast } from '@/components/ui/Toast';
import { AppSkeleton, AppEmptyState, SessionDetailModal } from '@/components/apps';

interface Session {
    id: string;
    title: string;
    coach_name: string;
    start_time: string;
    end_time: string;
    intensity: string;
    capacity: number;
    enrolled: number;
    category?: string;
    session_date?: string;
    wod_description?: string;
    description?: string;
}

type FilterMode = 'all' | 'coach' | 'beginner';

export default function UserSchedulePage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [filterMode, setFilterMode] = useState<FilterMode>('all');
    const [coaches, setCoaches] = useState<string[]>([]);
    const [selectedCoach, setSelectedCoach] = useState<string>('');
    const [showCoachDropdown, setShowCoachDropdown] = useState(false);
    const [weekOffset, setWeekOffset] = useState(0);
    const [bookingIds, setBookingIds] = useState<Set<string>>(new Set());
    const [detailSession, setDetailSession] = useState<Session | null>(null);
    const [bookingInProgress, setBookingInProgress] = useState<string | null>(null);
    const toast = useToast();

    const loadSessions = useCallback(async () => {
        const supabase = createClient();
        setLoading(true);

        let dbQ = query('sessions')
            .select('*')
            .eq('session_date', selectedDate)
            .order('start_time', { ascending: true });

        if (filterMode === 'beginner') {
            dbQ = dbQ.eq('intensity', 'beginner');
        }
        if (filterMode === 'coach' && selectedCoach) {
            dbQ = dbQ.eq('coach_name', selectedCoach);
        }

        const { data } = await dbQ;
        if (data) setSessions(data);
        setLoading(false);
    }, [selectedDate, filterMode, selectedCoach]);

    // Load user's existing bookings for the selected date
    const loadMyBookings = useCallback(async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await query('bookings')
            .select('session_id')
            .eq('user_id', user.id)
            .in('status', ['confirmed', 'waitlisted']);

        if (data) {
            setBookingIds(new Set(data.map((b: any) => b.session_id)));
        }
    }, []);

    useEffect(() => {
        async function loadCoaches() {
            const { data } = await query('sessions')
                .select('coach_name')
                .not('coach_name', 'is', null)
                .limit(50);
            if (data) {
                const unique = [...new Set((data as any[]).map(d => d.coach_name).filter(Boolean))];
                setCoaches(unique);
            }
        }
        loadCoaches();
    }, []);

    useEffect(() => {
        loadSessions();
        loadMyBookings();
    }, [loadSessions, loadMyBookings]);

    // 7-day picker with week navigation
    function getWeekDates() {
        const dates = [];
        const today = new Date();
        const startOfWeek = new Date(today);
        // Start from Monday of current week + weekOffset
        startOfWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7) + weekOffset * 7);
        for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);
            dates.push(d);
        }
        return dates;
    }

    const weekDates = getWeekDates();
    const dayAbbrs = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const todayStr = new Date().toISOString().split('T')[0];

    async function handleBook(sessionId: string) {
        if (bookingInProgress) return;
        setBookingInProgress(sessionId);

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            toast.warning('로그인이 필요합니다.');
            setBookingInProgress(null);
            return;
        }

        // Use RPC function for credit-based booking
        const { data, error } = await rpc('fn_book_with_credit', {
            p_session_id: sessionId,
            p_user_id: user.id,
        });

        if (error) {
            toast.error('예약에 실패했습니다. 다시 시도해주세요.');
        } else if (data && !data.success) {
            if (data.error === 'already_booked') {
                toast.info('이미 예약된 수업입니다.');
            } else {
                toast.error(data.error || '예약에 실패했습니다.');
            }
        } else if (data) {
            if (data.status === 'waitlisted') {
                toast.info('대기열에 등록되었습니다. 빈자리 발생 시 알려드릴게요! 📋');
            } else {
                const creditMsg = data.credits_used > 0 ? ` (크레딧 1회 차감)` : '';
                toast.success(`예약이 완료되었습니다!${creditMsg} ✅`);
            }
            loadSessions();
            loadMyBookings();
            setDetailSession(null);
        }
        setBookingInProgress(null);
    }

    // Weekly progress
    const [completedClasses, setCompletedClasses] = useState(0);
    const weeklyGoal = 4;

    useEffect(() => {
        async function loadWeeklyProgress() {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const now = new Date();
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
            const weekStart = startOfWeek.toISOString().split('T')[0];

            const { count } = await query('bookings')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .in('status', ['confirmed', 'attended'])
                .gte('created_at', weekStart + 'T00:00:00');

            setCompletedClasses(count || 0);
        }
        loadWeeklyProgress();
    }, []);

    // Week label
    const weekStart = weekDates[0];
    const weekEnd = weekDates[6];
    const weekLabel = `${weekStart.getMonth() + 1}/${weekStart.getDate()} – ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`;

    return (
        <div className="app-page">

            {/* ── Week Navigation ── */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '0.75rem',
            }}>
                <button
                    onClick={() => setWeekOffset(w => w - 1)}
                    style={{
                        background: 'none', border: 'none', padding: '0.5rem',
                        color: 'var(--app-text-secondary)', cursor: 'pointer', fontSize: '1.125rem',
                    }}
                >‹</button>
                <div style={{
                    fontSize: '0.8125rem', fontWeight: 600,
                    color: 'var(--app-text-secondary)',
                }}>
                    {weekLabel}
                    {weekOffset !== 0 && (
                        <button
                            onClick={() => { setWeekOffset(0); setSelectedDate(todayStr); }}
                            style={{
                                background: 'var(--app-accent-light)', border: 'none',
                                borderRadius: 'var(--app-radius-full)', padding: '0.125rem 0.5rem',
                                color: 'var(--app-accent)', fontSize: '0.6875rem', fontWeight: 600,
                                marginLeft: '0.5rem', cursor: 'pointer',
                            }}
                        >오늘</button>
                    )}
                </div>
                <button
                    onClick={() => setWeekOffset(w => w + 1)}
                    style={{
                        background: 'none', border: 'none', padding: '0.5rem',
                        color: 'var(--app-text-secondary)', cursor: 'pointer', fontSize: '1.125rem',
                    }}
                >›</button>
            </div>

            {/* ── Date Picker (Mon-Sun 7 days) ── */}
            <div className="date-picker-row" style={{ justifyContent: 'space-between' }}>
                {weekDates.map((date) => {
                    const dateStr = date.toISOString().split('T')[0];
                    const isSelected = dateStr === selectedDate;
                    const isToday = dateStr === todayStr;
                    return (
                        <button
                            key={dateStr}
                            onClick={() => setSelectedDate(dateStr)}
                            className={`date-chip ${isSelected ? 'active' : ''}`}
                            style={{ flex: 1 }}
                        >
                            <span className="day-name">{dayAbbrs[date.getDay()]}</span>
                            <span className="day-num">{date.getDate()}</span>
                            {isToday && <div className="today-dot" />}
                        </button>
                    );
                })}
            </div>

            {/* ── Filter Chips + My Bookings ── */}
            <div className="app-filter-chips" style={{ position: 'relative' }}>
                <button
                    className={`app-filter-chip ${filterMode === 'all' ? 'active' : ''}`}
                    onClick={() => { setFilterMode('all'); setSelectedCoach(''); setShowCoachDropdown(false); }}
                >
                    All
                </button>
                <button
                    className={`app-filter-chip ${filterMode === 'coach' ? 'active' : ''}`}
                    onClick={() => {
                        setFilterMode('coach');
                        setShowCoachDropdown(!showCoachDropdown);
                    }}
                    style={filterMode === 'coach' ? { color: 'var(--app-accent)', borderColor: 'var(--app-accent)' } : {}}
                >
                    {selectedCoach || 'Coaches'} ▾
                </button>
                <button
                    className={`app-filter-chip ${filterMode === 'beginner' ? 'active' : ''}`}
                    onClick={() => { setFilterMode('beginner'); setSelectedCoach(''); setShowCoachDropdown(false); }}
                >
                    Beginner
                </button>

                <Link
                    href="/apps/schedule/bookings"
                    className="app-filter-chip"
                    style={{ marginLeft: 'auto', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                    📅 My Bookings
                </Link>

                {/* Coach Dropdown */}
                {showCoachDropdown && coaches.length > 0 && (
                    <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0,
                        marginTop: '0.25rem', zIndex: 20,
                        background: 'var(--app-card-bg)', border: '1px solid var(--app-border)',
                        borderRadius: 'var(--app-radius-lg)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                        overflow: 'hidden',
                    }}>
                        {coaches.map(coach => (
                            <button
                                key={coach}
                                onClick={() => { setSelectedCoach(coach); setShowCoachDropdown(false); }}
                                style={{
                                    display: 'block', width: '100%', textAlign: 'left',
                                    padding: '0.625rem 1rem',
                                    background: selectedCoach === coach ? 'var(--app-accent-bg)' : 'transparent',
                                    color: selectedCoach === coach ? 'var(--app-accent)' : 'var(--app-text-primary)',
                                    border: 'none', borderBottom: '1px solid var(--app-border)',
                                    fontSize: '0.875rem', fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                {coach}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Session List ── */}
            <div className="app-section-label">AVAILABLE CLASSES ({sessions.length})</div>

            {loading ? (
                <AppSkeleton variant="list" count={3} />
            ) : sessions.length === 0 ? (
                <AppEmptyState
                    icon="🏋️"
                    title="수업이 없습니다"
                    description="선택한 날짜에 등록된 수업이 없습니다. 다른 날짜를 확인해보세요."
                />
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    {sessions.map((session) => {
                        const isFull = session.enrolled >= session.capacity;
                        const isBooked = bookingIds.has(session.id);
                        return (
                            <div
                                key={session.id}
                                className="session-card"
                                onClick={() => setDetailSession(session)}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="session-time" style={{ borderRight: '1px solid var(--app-border-strong)', paddingRight: '1rem' }}>
                                    <div className="start">
                                        {new Date(session.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).replace(/\s?(AM|PM)/, '')}
                                    </div>
                                    <div className="end" style={{ fontSize: '0.6875rem', textTransform: 'uppercase' as const }}>
                                        {new Date(session.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).includes('AM') ? 'AM' : 'PM'}
                                    </div>
                                </div>
                                <div className="session-info">
                                    <div className="title">{session.title}</div>
                                    <div className="coach">Coach {session.coach_name}</div>
                                </div>
                                <button
                                    disabled={isBooked || bookingInProgress === session.id}
                                    className={isBooked ? 'app-btn-outline' : isFull ? 'app-btn-outline' : 'app-btn-primary'}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!isBooked) handleBook(session.id);
                                    }}
                                    style={{ fontSize: '0.8125rem', padding: '0.5rem 1.25rem' }}
                                >
                                    {bookingInProgress === session.id ? '...' : isBooked ? '✓' : isFull ? 'Waitlist' : 'Book'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Weekly Progress ── */}
            <div className="weekly-progress-card" style={{ marginTop: '1.5rem' }}>
                <div>
                    <div className="weekly-progress-label">WEEKLY PROGRESS</div>
                    <div className="weekly-progress-value">{completedClasses} / {weeklyGoal} Classes</div>
                </div>
                <svg width="52" height="52" viewBox="0 0 52 52" style={{ flexShrink: 0 }}>
                    <circle cx="26" cy="26" r="22" fill="none" stroke="#E5E7EB" strokeWidth="4" />
                    <circle
                        cx="26" cy="26" r="22" fill="none"
                        stroke="var(--app-accent)" strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={`${(Math.min(completedClasses, weeklyGoal) / weeklyGoal) * 138.2} 138.2`}
                        transform="rotate(-90 26 26)"
                    />
                </svg>
            </div>

            {/* ── Session Detail Modal ── */}
            <SessionDetailModal
                session={detailSession}
                isOpen={!!detailSession}
                onClose={() => setDetailSession(null)}
                onBook={handleBook}
                isBooked={detailSession ? bookingIds.has(detailSession.id) : false}
            />
        </div>
    );
}
