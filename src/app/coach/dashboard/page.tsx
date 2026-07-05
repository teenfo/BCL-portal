'use client';

import { useEffect, useState } from 'react';

import { query, rpc } from '@/lib/supabase/query';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import TodayAlertSummary from '@/components/coach/dashboard/TodayAlertSummary';
import CoachKPISnapshot from '@/components/coach/dashboard/CoachKPISnapshot';
import FollowupSummary from '@/components/coach/dashboard/FollowupSummary';

interface TodaySession {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    capacity: number;
    session_date: string;
    wod_description?: string | null;
    booked_count: number;
    checkin_count: number;
    waitlist_count: number;
    unchecked_count: number;
}

interface RiskSummary {
    waitlist: number;
    unchecked_confirmed: number;
    starting_soon: number;
}

interface CoachNotice {
    id: string;
    title: string;
    content: string;
    created_at: string;
}

export default function CoachDashboardPage() {
    const { profile } = useAuth();
    const [todaySessions, setTodaySessions] = useState<TodaySession[]>([]);
    const [notices, setNotices] = useState<CoachNotice[]>([]);
    const [todayCheckins, setTodayCheckins] = useState(0);
    const [todayBookings, setTodayBookings] = useState(0);
    const [weekSessions, setWeekSessions] = useState(0);
    const [risk, setRisk] = useState<RiskSummary>({ waitlist: 0, unchecked_confirmed: 0, starting_soon: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboard();
    }, []);

    async function loadDashboard() {
        try {
            const { data: dashboardData, error: dbError } = await rpc('fn_get_my_coach_dashboard');

            if (dbError && process.env.NODE_ENV === 'development') {
                console.error('Error fetching dashboard data:', dbError);
            }

            if (dashboardData?.success) {
                const payload = dashboardData.data ?? {};
                setTodaySessions(Array.isArray(payload.today_sessions) ? payload.today_sessions : []);
                setTodayCheckins(payload.today_total_checkins ?? 0);
                setTodayBookings(payload.today_total_bookings ?? 0);
                setWeekSessions(payload.week_sessions ?? 0);
                setRisk({
                    waitlist: payload.risk_summary?.waitlist ?? 0,
                    unchecked_confirmed: payload.risk_summary?.unchecked_confirmed ?? 0,
                    starting_soon: payload.risk_summary?.starting_soon ?? 0,
                });
            }

            const { data: noticeData } = await query('notices')
                .select('*')
                .eq('is_published', true)
                .order('created_at', { ascending: false })
                .limit(3);

            if (noticeData) setNotices(noticeData);
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

    const now = new Date();
    const currentSession = todaySessions.find(s => {
        const start = new Date(`${s.session_date}T${s.start_time}`);
        const end = s.end_time ? new Date(`${s.session_date}T${s.end_time}`) : new Date(start.getTime() + 60 * 60 * 1000);
        return now >= start && now <= end;
    });

    const nextSession = todaySessions.find(s => {
        const start = new Date(`${s.session_date}T${s.start_time}`);
        return start > now;
    });

    const hasRisk = risk.waitlist + risk.unchecked_confirmed + risk.starting_soon > 0;

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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
                <StatCard value={todaySessions.length} label="오늘 수업" accent="var(--app-accent)" />
                <StatCard value={todayBookings} label="예약" accent="var(--app-accent)" />
                <StatCard value={todayCheckins} label="출석" accent="var(--app-accent)" />
                <StatCard value={weekSessions} label="이번 주" accent="#3B82F6" />
            </div>

            {/* Risk Summary */}
            {hasRisk && (
                <div className="app-glass-card" style={{
                    padding: '0.875rem 1rem',
                    marginBottom: '1.5rem',
                    border: '1px solid rgba(245,158,11,0.25)',
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.02) 100%)',
                }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#F59E0B', marginBottom: 8 }}>
                        🚨 운영 위험 요약
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                        <RiskStat value={risk.starting_soon} label="60분 내 시작" accent="#F59E0B" />
                        <RiskStat value={risk.unchecked_confirmed} label="시작 후 미체크인" accent="#EF4444" />
                        <RiskStat value={risk.waitlist} label="대기열" accent="#A78BFA" />
                    </div>
                </div>
            )}

            {/* Monthly KPI Snapshot */}
            <CoachKPISnapshot mode="compact" />

            {/* Today's Member Alert Summary */}
            <TodayAlertSummary />

            {/* Open Follow-ups (P25) */}
            <FollowupSummary />

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
                                운영 보드 열기 →
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* Next Session CTA */}
            {!currentSession && nextSession && (
                <Link href={`/coach/schedule?session_id=${nextSession.id}`} style={{ textDecoration: 'none' }}>
                    <div className="app-glass-card" style={{
                        padding: '1rem 1.25rem',
                        marginBottom: '1.5rem',
                        border: '1px solid var(--app-accent)',
                        background: 'linear-gradient(135deg, rgba(255,106,0,0.08) 0%, rgba(255,106,0,0.02) 100%)',
                    }}>
                        <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--app-accent)', marginBottom: 4 }}>
                            다음 세션
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--app-text-primary)', marginBottom: 4 }}>
                            {nextSession.title}
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--app-text-secondary)' }}>
                            {nextSession.start_time.slice(0, 5)} 시작 · 예약 {nextSession.booked_count}명{nextSession.waitlist_count > 0 ? ` · 대기 ${nextSession.waitlist_count}명` : ''}
                        </div>
                        <div style={{ marginTop: 8, fontSize: '0.8125rem', color: 'var(--app-accent)', fontWeight: 600 }}>
                            운영 보드 열기 →
                        </div>
                    </div>
                </Link>
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
                                                {session.start_time.slice(0, 5)} ~ {session.end_time?.slice(0, 5) || ''} · {session.booked_count}/{session.capacity} (✅ {session.checkin_count})
                                            </p>
                                            <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                                                {session.waitlist_count > 0 && (
                                                    <span style={{ fontSize: '0.6875rem', color: '#A78BFA', fontWeight: 600 }}>
                                                        대기 {session.waitlist_count}
                                                    </span>
                                                )}
                                                {session.unchecked_count > 0 && (
                                                    <span style={{ fontSize: '0.6875rem', color: '#F59E0B', fontWeight: 600 }}>
                                                        미처리 {session.unchecked_count}
                                                    </span>
                                                )}
                                            </div>
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

function StatCard({ value, label, accent }: { value: number; label: string; accent: string }) {
    return (
        <div className="app-glass-card" style={{ padding: '0.875rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.375rem', fontWeight: 800, color: accent }}>
                {value}
            </div>
            <div style={{ fontSize: '0.625rem', fontWeight: 600, color: 'var(--app-text-secondary)', marginTop: 4 }}>
                {label}
            </div>
        </div>
    );
}

function RiskStat({ value, label, accent }: { value: number; label: string; accent: string }) {
    return (
        <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.125rem', fontWeight: 800, color: accent }}>{value}</div>
            <div style={{ fontSize: '0.625rem', fontWeight: 600, color: 'var(--app-text-muted)', marginTop: 2 }}>
                {label}
            </div>
        </div>
    );
}
