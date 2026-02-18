'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';

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
    const toast = useToast();

    const loadSessions = useCallback(async () => {
        const supabase: any = createClient();
        setLoading(true);

        let query = supabase
            .from('sessions')
            .select('*')
            .eq('session_date', selectedDate)
            .order('start_time', { ascending: true });

        // Apply filters
        if (filterMode === 'beginner') {
            query = query.eq('intensity', 'beginner');
        }
        if (filterMode === 'coach' && selectedCoach) {
            query = query.eq('coach_name', selectedCoach);
        }

        const { data } = await query;
        if (data) setSessions(data);
        setLoading(false);
    }, [selectedDate, filterMode, selectedCoach]);

    // Load available coaches for filter
    useEffect(() => {
        async function loadCoaches() {
            const supabase = createClient();
            const { data } = await (supabase as any)
                .from('sessions')
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
    }, [loadSessions]);

    function getWeekDates() {
        const dates = [];
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
        for (let i = 0; i < 5; i++) {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);
            dates.push(d);
        }
        return dates;
    }

    const weekDates = getWeekDates();
    const dayAbbrs = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const todayStr = new Date().toISOString().split('T')[0];

    async function handleReserve(sessionId: string) {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            toast.warning('로그인이 필요합니다.');
            return;
        }

        const { error } = await supabase.from('bookings').insert({
            session_id: sessionId,
            user_id: user.id,
            status: 'confirmed',
        });

        if (error) {
            if (error.code === '23505') {
                toast.info('이미 예약된 수업입니다.');
            } else {
                toast.error('예약에 실패했습니다. 다시 시도해주세요.');
            }
        } else {
            toast.success('예약이 완료되었습니다! ✅');
            loadSessions();
        }
    }

    // Weekly progress from bookings
    const [completedClasses, setCompletedClasses] = useState(0);
    const weeklyGoal = 4;

    useEffect(() => {
        async function loadWeeklyProgress() {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const now = new Date();
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay() + 1);
            const weekStart = startOfWeek.toISOString().split('T')[0];

            const { count } = await (supabase as any)
                .from('bookings')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('status', 'confirmed')
                .gte('created_at', weekStart + 'T00:00:00');

            setCompletedClasses(count || 0);
        }
        loadWeeklyProgress();
    }, []);

    return (
        <div className="app-page">

            {/* ── Date Picker (Figma: MON-FRI row) ── */}
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

            {/* ── Filter Chips ── */}
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} className="app-skeleton" style={{ height: 72, borderRadius: 16 }} />
                    ))}
                </div>
            ) : sessions.length === 0 ? (
                <div className="app-empty-state">
                    <div className="emoji">🏋️</div>
                    <div className="message">No classes available for this date</div>
                    <p style={{ color: 'var(--app-text-muted)', fontSize: '0.8125rem', marginTop: '0.5rem' }}>
                        Try another date or check back later
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    {sessions.map((session) => {
                        const isFull = session.enrolled >= session.capacity;
                        return (
                            <div key={session.id} className="session-card">
                                <div className="session-time" style={{ borderRight: '1px solid var(--app-border-strong)', paddingRight: '1rem' }}>
                                    <div className="start">
                                        {new Date(session.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).replace(/\s?(AM|PM)/, '')}
                                    </div>
                                    <div className="end" style={{ fontSize: '0.6875rem', textTransform: 'uppercase' }}>
                                        {new Date(session.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).includes('AM') ? 'AM' : 'PM'}
                                    </div>
                                </div>
                                <div className="session-info">
                                    <div className="title">{session.title}</div>
                                    <div className="coach">Coach {session.coach_name}</div>
                                </div>
                                <button
                                    disabled={false}
                                    className={isFull ? 'app-btn-outline' : 'app-btn-primary'}
                                    onClick={() => !isFull ? handleReserve(session.id) : null}
                                    style={{ fontSize: '0.8125rem', padding: '0.5rem 1.25rem' }}
                                >
                                    {isFull ? 'Waitlist' : 'Book'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Weekly Progress (Figma) ── */}
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
                        strokeDasharray={`${(completedClasses / weeklyGoal) * 138.2} 138.2`}
                        transform="rotate(-90 26 26)"
                    />
                </svg>
            </div>
        </div>
    );
}
