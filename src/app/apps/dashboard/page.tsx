'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import AppSkeleton from '@/components/apps/AppSkeleton';
import StatCard from '@/components/apps/StatCard';
import AppErrorState from '@/components/apps/AppErrorState';

interface Session {
    id: string;
    title: string;
    coach_name: string;
    start_time: string;
    end_time: string;
    intensity: string;
    capacity: number;
    enrolled: number;
    session_date?: string;
}

interface Notice {
    id: string;
    title: string;
    content?: string;
    category: string;
    date: string;
    created_at?: string;
}

interface Membership {
    id: string;
    plan_name: string;
    end_date: string;
    remaining_credits: number;
    total_credits: number;
    status: string;
}

interface TodayStatus {
    checkedInToday: boolean;
    weeklyClasses: number;
    weeklyGoal: number;
    streakDays: number;
    unreadNotifications: number;
}

const NOTICE_ICONS: Record<string, string> = {
    Important: '🔴',
    General: '📋',
    Event: '🎉',
    Urgent: '⚠️',
    Fitness: '🧘',
    Schedule: '📅',
    Winner: '🏆',
};

function timeAgo(dateStr: string) {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
}

export default function UserDashboardPage() {
    const [nextSession, setNextSession] = useState<Session | null>(null);
    const [notices, setNotices] = useState<Notice[]>([]);
    const [membership, setMembership] = useState<Membership | null>(null);
    const [userName, setUserName] = useState('회원');
    const [todayStatus, setTodayStatus] = useState<TodayStatus>({
        checkedInToday: false,
        weeklyClasses: 0,
        weeklyGoal: 4,
        streakDays: 0,
        unreadNotifications: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        loadDashboard();
    }, []);

    async function loadDashboard() {
        const supabase: any = createClient();
        setLoading(true);
        setError(false);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }

            const todayStr = new Date().toISOString().split('T')[0];
            const now = new Date();
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
            const weekStart = startOfWeek.toISOString().split('T')[0];

            // ── 1차 병렬 로딩: auth 레이어 + 공통 조회 ──
            const [
                memberResult,
                sessionResult,
                noticesResult,
                unreadResult,
            ] = await Promise.all([
                // 1. 회원 정보 (id + name) — user_id 기반
                supabase.from('members').select('id, name').eq('user_id', user.id).single(),
                // 2. 다음 수업 (session_date = today AND start_time > now)
                supabase
                    .from('sessions')
                    .select('*')
                    .eq('session_date', todayStr)
                    .gte('start_time', now.toISOString())
                    .order('start_time', { ascending: true })
                    .limit(1),
                // 3. 공지사항
                supabase
                    .from('notices')
                    .select('*')
                    .eq('is_published', true)
                    .order('created_at', { ascending: false })
                    .limit(3),
                // 4. 미읽음 알림 수 (user_id 사용 — 정상)
                supabase
                    .from('notifications')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .eq('is_read', false),
            ]);

            // 회원 이름 + memberId 추출
            const memberId = memberResult.data?.id;
            if (memberResult.data?.name) setUserName(memberResult.data.name);

            // ── 2차 병렬 로딩: member_id 의존 쿼리 ──
            let membershipData: any = null;
            let checkinTodayCount = 0;
            let weeklyBookingsCount = 0;
            let streakData: any[] = [];

            if (memberId) {
                const [msResult, ciResult, wbResult, skResult] = await Promise.all([
                    // 멤버십
                    supabase
                        .from('memberships')
                        .select('*, membership_plans(name, credits)')
                        .eq('member_id', memberId)
                        .eq('status', 'active')
                        .order('end_date', { ascending: false })
                        .limit(1)
                        .single(),
                    // 오늘 체크인 여부
                    supabase
                        .from('checkins')
                        .select('id', { count: 'exact', head: true })
                        .eq('member_id', memberId)
                        .gte('checkin_time', todayStr + 'T00:00:00')
                        .lte('checkin_time', todayStr + 'T23:59:59'),
                    // 이번 주 수업 수
                    supabase
                        .from('bookings')
                        .select('id', { count: 'exact', head: true })
                        .eq('member_id', memberId)
                        .in('status', ['confirmed', 'attended'])
                        .gte('created_at', weekStart + 'T00:00:00'),
                    // 연속 출석일 (최근 30일 체크인)
                    supabase
                        .from('checkins')
                        .select('checkin_time')
                        .eq('member_id', memberId)
                        .order('checkin_time', { ascending: false })
                        .limit(30),
                ]);
                membershipData = msResult.data;
                checkinTodayCount = ciResult.count || 0;
                weeklyBookingsCount = wbResult.count || 0;
                streakData = skResult.data || [];
            }

            // 멤버십
            if (membershipData) {
                const md = membershipData;
                setMembership({
                    id: md.id,
                    plan_name: md.membership_plans?.name || '이용권',
                    end_date: md.end_date,
                    remaining_credits: md.remaining_credits || 0,
                    total_credits: md.membership_plans?.credits || 30,
                    status: md.status,
                });
            }

            // 다음 수업
            if (sessionResult.data?.[0]) {
                setNextSession(sessionResult.data[0]);
            }

            // 공지
            if (noticesResult.data) setNotices(noticesResult.data);

            // Today's Status 계산
            const checkedInToday = checkinTodayCount > 0;
            const weeklyClasses = weeklyBookingsCount;
            const unreadNotifications = unreadResult.count || 0;

            // 연속 출석일 계산
            let streakDays = 0;
            if (streakData.length) {
                const checkinDates = new Set(
                    streakData.map((c: any) => new Date(c.checkin_time).toISOString().split('T')[0])
                );
                const checkDate = new Date();
                // 오늘 체크인 안했으면 어제부터 카운트
                if (!checkinDates.has(checkDate.toISOString().split('T')[0])) {
                    checkDate.setDate(checkDate.getDate() - 1);
                }
                while (checkinDates.has(checkDate.toISOString().split('T')[0])) {
                    streakDays++;
                    checkDate.setDate(checkDate.getDate() - 1);
                }
            }

            setTodayStatus({
                checkedInToday,
                weeklyClasses,
                weeklyGoal: 4,
                streakDays,
                unreadNotifications,
            });

        } catch (err) {
            console.error('Dashboard load error:', err);
            setError(true);
        }
        setLoading(false);
    }

    function getDDay(endDate: string) {
        const end = new Date(endDate);
        const now = new Date();
        return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
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
                <AppSkeleton variant="card" count={1} />
                <div style={{ marginTop: '0.75rem' }}>
                    <AppSkeleton variant="stat" count={4} />
                </div>
                <div style={{ marginTop: '0.75rem' }}>
                    <AppSkeleton variant="card" count={1} />
                </div>
                <div style={{ marginTop: '0.75rem' }}>
                    <AppSkeleton variant="list" count={3} />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="app-page">
                <AppErrorState
                    message="대시보드 데이터를 불러오는 중 오류가 발생했습니다."
                    onRetry={loadDashboard}
                />
            </div>
        );
    }

    return (
        <div className="app-page">
            {/* ── Greeting ── */}
            <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ color: 'var(--app-text-secondary)', fontSize: '0.875rem', marginBottom: '0.125rem' }}>
                    {getGreeting()}
                </p>
                <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--app-text-primary)', letterSpacing: '-0.01em' }}>
                    Welcome back, {userName}
                </h2>
            </div>

            {/* ── Next Class Card (Figma Style) ── */}
            {nextSession ? (
                <div className="next-class-card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <span className="next-class-badge">NEXT CLASS</span>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--app-text-muted)' }}>Today</span>
                    </div>
                    <h3 className="next-class-title">{nextSession.title}</h3>
                    <div className="next-class-meta">
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                            {new Date(nextSession.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                            Coach {nextSession.coach_name}
                        </span>
                    </div>
                    <Link href="/apps/checkin" className="app-btn-primary full-width" style={{ textDecoration: 'none', gap: 8 }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                        Check-in Now
                    </Link>
                </div>
            ) : (
                <div className="next-class-card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.25 }}>📭</div>
                    <p style={{ color: 'var(--app-text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                        No upcoming classes today
                    </p>
                    <Link href="/apps/schedule" className="app-btn-primary" style={{ textDecoration: 'none' }}>
                        Browse Schedule
                    </Link>
                </div>
            )}

            {/* ── Today's Status (NEW) ── */}
            <div style={{ marginBottom: '1.5rem' }}>
                <h2 className="app-section-title" style={{ marginBottom: '0.75rem' }}>Today&apos;s Status</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
                    <StatCard
                        icon={todayStatus.checkedInToday ? '✅' : '⬜'}
                        value={todayStatus.checkedInToday ? '완료' : '미완료'}
                        label="오늘 체크인"
                        accent={todayStatus.checkedInToday}
                    />
                    <StatCard
                        icon="📊"
                        value={`${todayStatus.weeklyClasses}/${todayStatus.weeklyGoal}`}
                        label="이번 주 수업"
                    />
                    <StatCard
                        icon="🔥"
                        value={`${todayStatus.streakDays}일`}
                        label="연속 출석"
                        accent={todayStatus.streakDays >= 7}
                    />
                    <StatCard
                        icon="📬"
                        value={todayStatus.unreadNotifications}
                        label="미읽음 알림"
                        onClick={() => window.location.href = '/apps/notifications'}
                    />
                </div>
            </div>

            {/* ── Membership Summary (Figma Style) ── */}
            <div style={{ marginBottom: '1.5rem' }}>
                <div className="app-section-header">
                    <h2 className="app-section-title" style={{ marginBottom: 0 }}>Membership</h2>
                    <Link href="/apps/profile/memberships" className="app-link">View Details</Link>
                </div>
                {membership ? (
                    <div className="membership-card" style={{ marginBottom: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div className="plan-name">CURRENT PLAN</div>
                                <div className="plan-title">{membership.plan_name}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div className="plan-name">REMAINING</div>
                                <div className="plan-remaining">{getDDay(membership.end_date)} Days</div>
                            </div>
                        </div>
                        <div className="membership-progress">
                            <div
                                className="membership-progress-bar"
                                style={{ width: `${Math.min(100, (getDDay(membership.end_date) / 30) * 100)}%` }}
                            />
                        </div>
                    </div>
                ) : (
                    <Link href="/apps/purchase" className="app-glass-card" style={{ display: 'block', textDecoration: 'none', textAlign: 'center', padding: '1.5rem' }}>
                        <p style={{ color: 'var(--app-text-secondary)', marginBottom: '0.75rem' }}>No active membership</p>
                        <span className="app-btn-primary">Get Started →</span>
                    </Link>
                )}
            </div>

            {/* ── Announcements (Figma Style) ── */}
            {notices.length > 0 && (
                <div>
                    <div className="app-section-header">
                        <h2 className="app-section-title" style={{ marginBottom: 0 }}>Announcements</h2>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--app-text-muted)', cursor: 'pointer' }}>Clear all</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                        {notices.map((notice) => (
                            <div key={notice.id} className="notice-item">
                                <div className="notice-icon">
                                    {NOTICE_ICONS[notice.category] || '📢'}
                                </div>
                                <div className="notice-content">
                                    <div className="notice-title">{notice.title}</div>
                                    {notice.content && (
                                        <div className="notice-desc">
                                            {notice.content.length > 50 ? notice.content.slice(0, 50) + '...' : notice.content}
                                        </div>
                                    )}
                                </div>
                                <div className="notice-date">
                                    {timeAgo(notice.date || notice.created_at || '')}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Quick Links ── */}
            <div style={{ marginTop: '1.5rem' }}>
                <h2 className="app-section-title" style={{ marginBottom: '0.75rem' }}>Quick Links</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                    {[
                        { href: '/apps/leaderboard', icon: '🏆', label: '리더보드' },
                        { href: '/apps/badges', icon: '🎖️', label: '배지' },
                        { href: '/apps/coaches', icon: '💪', label: '코치' },
                        { href: '/apps/records', icon: '📊', label: '운동기록' },
                        { href: '/apps/purchase', icon: '🎫', label: '이용권' },
                        { href: '/apps/feedback', icon: '📝', label: '피드백' },
                    ].map(link => (
                        <Link
                            key={link.href}
                            href={link.href}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.375rem',
                                padding: '1rem 0.5rem',
                                borderRadius: 'var(--app-radius-lg)',
                                background: 'var(--app-surface)',
                                border: '1px solid var(--app-border)',
                                textDecoration: 'none',
                                transition: 'all 0.2s ease',
                                boxShadow: 'var(--app-shadow-sm)',
                            }}
                        >
                            <span style={{ fontSize: '1.5rem' }}>{link.icon}</span>
                            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--app-text-secondary)' }}>{link.label}</span>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
