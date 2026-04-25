'use client';

import { useEffect, useState } from 'react';

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
    wod_description?: string;
    booked_count: number;
    checkin_count: number;
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
    const [todayBookings, setTodayBookings] = useState(0);
    const [weekSessions, setWeekSessions] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboard();
    }, [user]);

    async function loadDashboard() {
        if (!user) return;

        try {
            // 코치 대시보드 통계 및 수업 정보 통합 조회 (RPC)
            const { data: dashboardData, error: dbError } = await rpc('fn_get_coach_dashboard', {
                p_user_id: user.id
            });

            if (dbError && process.env.NODE_ENV === 'development') {
                console.error('Error fetching dashboard data:', dbError);
            }

            if (dashboardData && !dashboardData.error) {
                setTodaySessions(dashboardData.today_sessions || []);
                setTodayCheckins(dashboardData.today_total_checkins || 0);
                setTodayBookings(dashboardData.today_total_bookings || 0);
                setWeekSessions(dashboardData.week_sessions || 0);
            }

            // 코치 공지 (coach 카테고리 포함)
            const { data: noticeData } = await query('notices')
                .select('*')
                .eq('is_published', true)
                .order('created_at', { ascending: false })
                .limit(3);

            if (noticeData) {
                // UI에서는 공지를 다 보여주되 코치 공지가 있으면 뱃지를 달아주거나 우선순위 가능
                setNotices(noticeData);
            }

        } catch (error) {
            if (process.env.NODE_ENV === 'development') console.error('Coach dashboard load error:', error);
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <div className="app-glass-card" style={{ padding: '0.875rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--app-accent)' }}>
                        {todaySessions.length}
                    </div>
                    <div style={{ fontSize: '0.625rem', fontWeight: 600, color: 'var(--app-text-secondary)', marginTop: 4 }}>
                        오늘 수업
                    </div>
                </div>
                <div className="app-glass-card" style={{ padding: '0.875rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--app-accent)' }}>
                        {todayBookings}
                    </div>
                    <div style={{ fontSize: '0.625rem', fontWeight: 600, color: 'var(--app-text-secondary)', marginTop: 4 }}>
                        예약
                    </div>
                </div>
                <div className="app-glass-card" style={{ padding: '0.875rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--app-accent)' }}>
                        {todayCheckins}
                    </div>
                    <div style={{ fontSize: '0.625rem', fontWeight: 600, color: 'var(--app-text-secondary)', marginTop: 4 }}>
                        출석
                    </div>
                </div>
                <div className="app-glass-card" style={{ padding: '0.875rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.375rem', fontWeight: 800, color: '#3B82F6' }}>
                        {weekSessions}
                    </div>
                    <div style={{ fontSize: '0.625rem', fontWeight: 600, color: 'var(--app-text-secondary)', marginTop: 4 }}>
                        이번 주
                    </div>
                </div>
            </div>

            {/* Current Session */}
            {currentSession && (
                <div style={{ marginBottom: '1.5rem' }}>
                    <div className="next-class-card" style={{ position: 'relative' }}>
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
                                {currentSession.start_time.slice(0, 5)} ~ {currentSession.end_time?.slice(0, 5) || ''}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                </svg>
                                {currentSession.checkin_count}/{currentSession.booked_count}명 출석 (정원 {currentSession.capacity}명)
                            </span>
                        </div>
                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
                            <Link href={`/coach/schedule?session_id=${currentSession.id}`} style={{
                                display: 'inline-block', color: 'var(--app-accent)', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none'
                            }}>
                                출석 명단 보기 &rarr;
                            </Link>
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
                            <Link href={`/coach/schedule?session_id=${session.id}`} key={session.id} style={{ textDecoration: 'none' }}>
                                <div className="app-glass-card" style={{ padding: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--app-text-primary)', marginBottom: 4 }}>
                                                {session.title}
                                            </h4>
                                            <p style={{ fontSize: '0.8125rem', color: 'var(--app-text-secondary)' }}>
                                                {session.start_time.slice(0, 5)} ~ {session.end_time?.slice(0, 5) || ''} · {session.booked_count}/{session.capacity} (✅ {session.checkin_count}명)
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
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Notices */}
            {notices.length > 0 && (
                <div>
                    <div className="app-section-header">
                        <h2 className="app-section-title" style={{ marginBottom: 0 }}>최근 공지사항</h2>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                        {notices.map((notice) => (
                            <div key={notice.id} className="notice-item" style={{ display: 'flex', padding: '1rem', background: 'var(--app-glass-bg)', border: 'var(--app-glass-border)', borderRadius: '16px', gap: '12px' }}>
                                <div className="notice-icon" style={{ fontSize: '1.25rem' }}>📢</div>
                                <div className="notice-content">
                                    <div className="notice-title" style={{ fontWeight: 600, color: 'var(--app-text-primary)', fontSize: '0.9375rem', marginBottom: '4px' }}>{notice.title}</div>
                                    {notice.content && (
                                        <div className="notice-desc" style={{ fontSize: '0.8125rem', color: 'var(--app-text-secondary)', lineHeight: 1.5 }}>
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
