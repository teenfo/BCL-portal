'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

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
}

const FILTERS = ['Filter', 'All Coaches', 'Beginner'];

export default function UserSchedulePage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedFilter, setSelectedFilter] = useState('Filter');

    const loadSessions = useCallback(async () => {
        const supabase = createClient();
        setLoading(true);
        const startOfDay = selectedDate + 'T00:00:00+09:00';
        const endOfDay = selectedDate + 'T23:59:59+09:00';

        const { data } = await supabase
            .from('sessions')
            .select('*')
            .gte('start_time', startOfDay)
            .lte('start_time', endOfDay)
            .order('start_time', { ascending: true });

        if (data) setSessions(data);
        setLoading(false);
    }, [selectedDate]);

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
            alert('Please log in first.');
            return;
        }

        const { error } = await supabase.from('bookings').insert({
            session_id: sessionId,
            member_id: user.id,
            status: 'confirmed',
        });

        if (error) {
            if (error.code === '23505') {
                alert('You have already booked this class.');
            } else {
                alert('Booking failed. Please try again.');
            }
        } else {
            alert('Booking confirmed! ✅');
            loadSessions();
        }
    }

    const completedClasses = 2; // This would come from actual data
    const weeklyGoal = 4;

    return (
        <div className="app-page">
            {/* ── Header ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Schedule</h1>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: 'var(--app-surface)', border: '1px solid var(--app-border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer',
                    }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                    </button>
                    <Link href="/apps/schedule/bookings" style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: 'var(--app-accent)', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        textDecoration: 'none', fontSize: '0.75rem', fontWeight: 700,
                    }}>
                        AR
                    </Link>
                </div>
            </div>

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

            {/* ── Filter Chips (Figma Style) ── */}
            <div className="app-filter-chips">
                {FILTERS.map(f => (
                    <button
                        key={f}
                        className={`app-filter-chip ${selectedFilter === f ? 'active' : ''}`}
                        onClick={() => setSelectedFilter(f)}
                        style={f === 'Filter' && selectedFilter !== 'Filter' ? { color: 'var(--app-accent)', borderColor: 'var(--app-accent)' } : {}}
                    >
                        {f === 'Filter' ? (
                            <span style={{ color: selectedFilter === 'Filter' ? '#fff' : 'var(--app-accent)' }}>Filter</span>
                        ) : f}
                    </button>
                ))}
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
