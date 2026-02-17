'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Session {
    id: string;
    title: string;
    coach_name: string;
    start_time: string;
    end_time: string;
    intensity: string;
    capacity: number;
    enrolled: number;
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
    const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
    const [notices, setNotices] = useState<Notice[]>([]);
    const [membership, setMembership] = useState<Membership | null>(null);
    const [userName, setUserName] = useState('회원');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboard();
    }, []);

    async function loadDashboard() {
        const supabase: any = createClient();

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: memberData }: any = await supabase
                    .from('members')
                    .select('name')
                    .eq('user_id', user.id)
                    .single();
                if (memberData?.name) setUserName(memberData.name);

                const { data: membershipData }: any = await supabase
                    .from('memberships')
                    .select('*, membership_plans(name, credit_count)')
                    .eq('member_id', user.id)
                    .eq('status', 'active')
                    .order('end_date', { ascending: false })
                    .limit(1)
                    .single();
                if (membershipData) {
                    setMembership({
                        id: membershipData.id,
                        plan_name: membershipData.membership_plans?.name || '이용권',
                        end_date: membershipData.end_date,
                        remaining_credits: membershipData.remaining_credits || 0,
                        total_credits: membershipData.membership_plans?.credit_count || 30,
                        status: membershipData.status,
                    });
                }
            }

            const { data: sessionsData }: any = await supabase
                .from('sessions')
                .select('*')
                .gte('start_time', new Date().toISOString())
                .order('start_time', { ascending: true })
                .limit(1);
            if (sessionsData) setUpcomingSessions(sessionsData);

            const { data: noticesData }: any = await supabase
                .from('notices')
                .select('*')
                .eq('is_published', true)
                .order('created_at', { ascending: false })
                .limit(3);
            if (noticesData) setNotices(noticesData);

        } catch (error) {
            console.error('Dashboard load error:', error);
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
                <div className="app-skeleton" style={{ height: 200, marginBottom: '1.5rem', borderRadius: 20 }} />
                <div className="app-skeleton" style={{ height: 80, marginBottom: '1.5rem', borderRadius: 16 }} />
                <div className="app-skeleton" style={{ height: 100, marginBottom: 12, borderRadius: 16 }} />
                <div className="app-skeleton" style={{ height: 100, borderRadius: 16 }} />
            </div>
        );
    }

    const nextSession = upcomingSessions[0];

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
                        No upcoming classes
                    </p>
                    <Link href="/apps/schedule" className="app-btn-primary" style={{ textDecoration: 'none' }}>
                        Browse Schedule
                    </Link>
                </div>
            )}

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
