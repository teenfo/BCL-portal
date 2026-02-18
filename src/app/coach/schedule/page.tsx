'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SessionItem {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    capacity: number;
    session_date: string;
    wod_description?: string;
}

export default function CoachSchedulePage() {
    const { user } = useAuth();
    const [sessions, setSessions] = useState<SessionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [viewMode, setViewMode] = useState<'day' | 'week'>('day');

    const loadSessions = useCallback(async () => {
        if (!user) return;
        const supabase: any = createClient();
        setLoading(true);

        try {
            const { data: coachData } = await supabase
                .from('coaches')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (!coachData) {
                setLoading(false);
                return;
            }

            const { data: sessionCoaches } = await supabase
                .from('session_coaches')
                .select('session_id')
                .eq('coach_id', coachData.id);

            if (!sessionCoaches || sessionCoaches.length === 0) {
                setSessions([]);
                setLoading(false);
                return;
            }

            const sessionIds = sessionCoaches.map((sc: any) => sc.session_id);

            let startDate = selectedDate;
            let endDate = selectedDate;

            if (viewMode === 'week') {
                const d = new Date(selectedDate);
                const day = d.getDay();
                const weekStart = new Date(d);
                weekStart.setDate(d.getDate() - day);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                startDate = weekStart.toISOString().split('T')[0];
                endDate = weekEnd.toISOString().split('T')[0];
            }

            const { data } = await supabase
                .from('sessions')
                .select('*')
                .in('id', sessionIds)
                .gte('session_date', startDate)
                .lte('session_date', endDate)
                .order('session_date', { ascending: true })
                .order('start_time', { ascending: true });

            if (data) setSessions(data);
        } catch (error) {
            console.error('Coach schedule load error:', error);
        }
        setLoading(false);
    }, [user, selectedDate, viewMode]);

    useEffect(() => { loadSessions(); }, [loadSessions]);

    const navigateDay = (offset: number) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + offset);
        setSelectedDate(d.toISOString().split('T')[0]);
    };

    const isToday = selectedDate === new Date().toISOString().split('T')[0];

    return (
        <div className="app-page">
            <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--app-text-primary)', letterSpacing: '-0.01em' }}>
                    내 수업 일정
                </h2>
            </div>

            {/* View Mode Toggle */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                {(['day', 'week'] as const).map(mode => (
                    <button
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: 'var(--app-radius-md)',
                            border: '1px solid var(--app-border)',
                            background: viewMode === mode ? 'var(--app-accent)' : 'var(--app-surface)',
                            color: viewMode === mode ? '#fff' : 'var(--app-text-secondary)',
                            fontWeight: 600,
                            fontSize: '0.8125rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                    >
                        {mode === 'day' ? '일간' : '주간'}
                    </button>
                ))}
            </div>

            {/* Date Navigation */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '1.5rem', padding: '0.75rem 1rem',
                borderRadius: 'var(--app-radius-lg)',
                background: 'var(--app-surface)',
                border: '1px solid var(--app-border)',
            }}>
                <button onClick={() => navigateDay(-1)} style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                    color: 'var(--app-text-primary)',
                }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                </button>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--app-text-primary)' }}>
                        {new Date(selectedDate + 'T00:00:00').toLocaleDateString('ko-KR', {
                            year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
                        })}
                    </div>
                    {isToday && (
                        <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--app-accent)' }}>Today</span>
                    )}
                </div>
                <button onClick={() => navigateDay(1)} style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                    color: 'var(--app-text-primary)',
                }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                </button>
            </div>

            {/* Session List */}
            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} className="app-skeleton" style={{ height: 100, borderRadius: 16 }} />
                    ))}
                </div>
            ) : sessions.length === 0 ? (
                <div className="app-glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.25 }}>📭</div>
                    <p style={{ color: 'var(--app-text-secondary)', fontSize: '0.875rem' }}>
                        이 날 배정된 수업이 없습니다
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {sessions.map(session => (
                        <div key={session.id} className="app-glass-card" style={{ padding: '1.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--app-text-primary)' }}>
                                    {session.title}
                                </h4>
                                <span style={{
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: 'var(--app-radius-sm)',
                                    background: 'var(--app-accent-bg)',
                                    color: 'var(--app-accent)',
                                    fontSize: '0.6875rem',
                                    fontWeight: 700,
                                }}>
                                    {session.capacity}명
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--app-text-secondary)', fontSize: '0.8125rem' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                                    </svg>
                                    {session.start_time} ~ {session.end_time || ''}
                                </span>
                                {viewMode === 'week' && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
                                        </svg>
                                        {new Date(session.session_date + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                                    </span>
                                )}
                            </div>
                            {session.wod_description && (
                                <div style={{
                                    marginTop: '0.75rem', padding: '0.75rem',
                                    borderRadius: 'var(--app-radius-md)',
                                    background: 'var(--app-bg)',
                                    fontSize: '0.8125rem',
                                    color: 'var(--app-text-secondary)',
                                    lineHeight: 1.5,
                                }}>
                                    {session.wod_description}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
