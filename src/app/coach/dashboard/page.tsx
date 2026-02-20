'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { query, rpc } from '@/lib/supabase/query';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface TodaySession {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    capacity: number;
    session_date: string;
}

interface CoachNotice {
    id: string;
    title: string;
    content: string;
    created_at: string;
}

export default function CoachDashboardPage() {
    const { user, profile } = useAuth();
    const [todaySessions, setTodaySessions] = useState<TodaySession[]>([]);
    const [notices, setNotices] = useState<CoachNotice[]>([]);
    const [todayCheckins, setTodayCheckins] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboard();
    }, [user]);

    async function loadDashboard() {
        if (!user) return;
        const today = new Date().toISOString().split('T')[0];

        try {
            // 코치의 오늘 세션
            const { data: coachData } = await query('coaches')
                
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (coachData) {
                const { data: sessionCoaches } = await query('session_coaches')
                    
                    .select('session_id')
                    .eq('coach_id', coachData.id);

                if (sessionCoaches && sessionCoaches.length > 0) {
                    const sessionIds = sessionCoaches.map((sc: any) => sc.session_id);
                    const { data: sessions } = await query('sessions')
                        
                        .select('*')
                        .in('id', sessionIds)
                        .eq('session_date', today)
                        .order('start_time', { ascending: true });

                    if (sessions) setTodaySessions(sessions);
                }
            }

            // 오늘 체크인 수
            const { count } = await query('checkins')
                
                .select('id', { count: 'exact', head: true })
                .gte('checkin_time', today + 'T00:00:00');
            setTodayCheckins(count || 0);

            // 코치 공지
            const { data: noticeData } = await query('notices')
                
                .select('*')
                .eq('is_published', true)
                .order('created_at', { ascending: false })
                .limit(3);
            if (noticeData) setNotices(noticeData);

        } catch (error) {
            console.error('Coach dashboard load error:', error);
        }
        setLoading(false);
    }

    function getGreeting() {
        const h = new Date().getHours();
        if (h < 12) return 'Good morning,';
        if (h < 18) return 'Good afternoon,';
        return 'Good evening,';
    }

    if (loading) {
        return (
            <div className="app-page">
                <div style={{ marginBottom: '1.5rem' }}>
                    <div className="app-skeleton" style={{ width: '40%', height: 14, marginBottom: 8 }} />
                    <div className="app-skeleton" style={{ width: '60%', height: 28 }} />
                </div>
                <div className="app-skeleton" style={{ height: 120, marginBottom: '1rem', borderRadius: 16 }} />
                <div className="app-skeleton" style={{ height: 120, marginBottom: '1rem', borderRadius: 16 }} />
                <div className="app-skeleton" style={{ height: 80, borderRadius: 16 }} />
            </div>
        );
    }

    const currentSession = todaySessions.find(s => {
        const now = new Date();
        const start = new Date(`${s.session_date}T${s.start_time}`);
        const end = s.end_time ? new Date(`${s.session_date}T${s.end_time}`) : new Date(start.getTime() + 60 * 60 * 1000);
        return now >= start && now <= end;
    });

    const upcomingSessions = todaySessions.filter(s => {
        const now = new Date();
        const start = new Date(`${s.session_date}T${s.start_time}`);
        return start > now;
    });

    return (
        <div className="app-page">
            {/* Greeting */}
            <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ color: 'var(--app-text-secondary)', fontSize: '0.875rem', marginBottom: '0.125rem' }}>
                    {getGreeting()}
                </p>
                <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--app-text-primary)', letterSpacing: '-0.01em' }}>
                    Coach {profile?.full_name || '코치'}
                </h2>
            </div>

            {/* Quick Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div className="app-glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--app-accent)' }}>
                        {todaySessions.length}
                    </div>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--app-text-secondary)', marginTop: 4 }}>
                        오늘 수업
                    </div>
                </div>
                <div className="app-glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--app-accent)' }}>
                        {todayCheckins}
                    </div>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--app-text-secondary)', marginTop: 4 }}>
                        체크인
                    </div>
                </div>
                <div className="app-glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--app-accent)' }}>
                        {todaySessions.reduce((sum, s) => sum + (s.capacity || 0), 0)}
                    </div>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--app-text-secondary)', marginTop: 4 }}>
                        총 정원
                    </div>
                </div>
            </div>

            {/* Current Session */}
            {currentSession && (
                <div style={{ marginBottom: '1.5rem' }}>
                    <div className="next-class-card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                            <span className="next-class-badge" style={{ background: '#22C55E' }}>LIVE NOW</span>
                            <span style={{ fontSize: '0.8125rem', color: 'var(--app-text-muted)' }}>진행 중</span>
                        </div>
                        <h3 className="next-class-title">{currentSession.title}</h3>
                        <div className="next-class-meta">
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                </svg>
                                {currentSession.start_time} ~ {currentSession.end_time || ''}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                </svg>
                                {currentSession.capacity}명 정원
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Upcoming Sessions */}
            <div style={{ marginBottom: '1.5rem' }}>
                <div className="app-section-header">
                    <h2 className="app-section-title" style={{ marginBottom: 0 }}>오늘 수업</h2>
                    <Link href="/coach/schedule" className="app-link">전체 보기</Link>
                </div>

                {todaySessions.length === 0 ? (
                    <div className="app-glass-card" style={{ textAlign: 'center', padding: '2rem' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.3 }}>📭</div>
                        <p style={{ color: 'var(--app-text-secondary)', fontSize: '0.875rem' }}>오늘 배정된 수업이 없습니다</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                        {todaySessions.map((session) => (
                            <div key={session.id} className="app-glass-card" style={{ padding: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--app-text-primary)', marginBottom: 4 }}>
                                            {session.title}
                                        </h4>
                                        <p style={{ fontSize: '0.8125rem', color: 'var(--app-text-secondary)' }}>
                                            {session.start_time} ~ {session.end_time || ''} · {session.capacity}명
                                        </p>
                                    </div>
                                    <div style={{
                                        width: 40, height: 40, borderRadius: 12,
                                        background: 'var(--app-accent-bg)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--app-accent)" strokeWidth="2">
                                            <path d="M9 18l6-6-6-6" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Notices */}
            {notices.length > 0 && (
                <div>
                    <div className="app-section-header">
                        <h2 className="app-section-title" style={{ marginBottom: 0 }}>공지사항</h2>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                        {notices.map((notice) => (
                            <div key={notice.id} className="notice-item">
                                <div className="notice-icon">📢</div>
                                <div className="notice-content">
                                    <div className="notice-title">{notice.title}</div>
                                    {notice.content && (
                                        <div className="notice-desc">
                                            {notice.content.length > 50 ? notice.content.slice(0, 50) + '...' : notice.content}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
