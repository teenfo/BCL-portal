'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface CoachInfo {
    id: string;
    name: string;
    specialties: string[] | null;
    bio: string | null;
    phone: string | null;
    email: string | null;
    avatar_url: string | null;
}

interface SessionStats {
    totalSessions: number;
    thisMonthSessions: number;
}

export default function CoachProfilePage() {
    const { user, profile, signOut } = useAuth();
    const router = useRouter();
    const [coachInfo, setCoachInfo] = useState<CoachInfo | null>(null);
    const [stats, setStats] = useState<SessionStats>({ totalSessions: 0, thisMonthSessions: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCoachProfile();
    }, [user]);

    async function loadCoachProfile() {
        if (!user) return;
        const supabase: any = createClient();

        try {
            const { data: coachData } = await supabase
                .from('coaches')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (coachData) {
                setCoachInfo(coachData);

                // 총 수업 수
                const { data: allSessionCoaches } = await supabase
                    .from('session_coaches')
                    .select('session_id')
                    .eq('coach_id', coachData.id);

                const totalSessions = allSessionCoaches?.length || 0;

                // 이번 달
                const now = new Date();
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

                let thisMonthSessions = 0;
                if (allSessionCoaches && allSessionCoaches.length > 0) {
                    const sessionIds = allSessionCoaches.map((sc: any) => sc.session_id);
                    const { count } = await supabase
                        .from('sessions')
                        .select('id', { count: 'exact', head: true })
                        .in('id', sessionIds)
                        .gte('session_date', monthStart)
                        .lte('session_date', monthEnd);
                    thisMonthSessions = count || 0;
                }

                setStats({ totalSessions, thisMonthSessions });
            }
        } catch (error) {
            console.error('Coach profile load error:', error);
        }
        setLoading(false);
    }

    async function handleLogout() {
        await signOut();
        router.push('/auth/login');
    }

    if (loading) {
        return (
            <div className="app-page">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
                    <div className="app-skeleton" style={{ width: 80, height: 80, borderRadius: '50%', marginBottom: 16 }} />
                    <div className="app-skeleton" style={{ width: '40%', height: 24, marginBottom: 8 }} />
                    <div className="app-skeleton" style={{ width: '30%', height: 14 }} />
                </div>
                <div className="app-skeleton" style={{ height: 100, borderRadius: 16, marginBottom: 12 }} />
                <div className="app-skeleton" style={{ height: 100, borderRadius: 16 }} />
            </div>
        );
    }

    return (
        <div className="app-page">
            {/* Profile Header */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{
                    width: 80, height: 80, borderRadius: '50%',
                    background: 'var(--app-accent-bg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 1rem',
                    fontSize: '2rem', fontWeight: 800,
                    color: 'var(--app-accent)',
                }}>
                    {coachInfo?.name?.charAt(0) || profile?.full_name?.charAt(0) || '?'}
                </div>
                <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--app-text-primary)' }}>
                    {coachInfo?.name || profile?.full_name || '코치'}
                </h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--app-text-secondary)', marginTop: 4 }}>
                    {user?.email}
                </p>
                {coachInfo?.specialties && coachInfo.specialties.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.375rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                        {coachInfo.specialties.map((s, i) => (
                            <span key={i} style={{
                                padding: '0.25rem 0.625rem',
                                borderRadius: 'var(--app-radius-full)',
                                background: 'var(--app-accent-bg)',
                                color: 'var(--app-accent)',
                                fontSize: '0.6875rem',
                                fontWeight: 600,
                            }}>
                                {s}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div className="app-glass-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--app-accent)' }}>
                        {stats.thisMonthSessions}
                    </div>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--app-text-secondary)', marginTop: 4 }}>
                        이번 달 수업
                    </div>
                </div>
                <div className="app-glass-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--app-accent)' }}>
                        {stats.totalSessions}
                    </div>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--app-text-secondary)', marginTop: 4 }}>
                        총 수업
                    </div>
                </div>
            </div>

            {/* Bio */}
            {coachInfo?.bio && (
                <div className="app-glass-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--app-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        소개
                    </h4>
                    <p style={{ fontSize: '0.875rem', color: 'var(--app-text-primary)', lineHeight: 1.6 }}>
                        {coachInfo.bio}
                    </p>
                </div>
            )}

            {/* Menu Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
                {[
                    { icon: '📅', label: '내 수업 일정', href: '/coach/schedule' },
                    { icon: '👥', label: '회원 관리', href: '/coach/members' },
                    { icon: '🏁', label: 'Race 관리', href: '/coach/race' },
                    { icon: '🔔', label: '알림 설정', href: '#' },
                    { icon: '🔒', label: '보안 설정', href: '#' },
                ].map(item => (
                    <a
                        key={item.label}
                        href={item.href}
                        className="app-glass-card"
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            padding: '1rem', textDecoration: 'none',
                        }}
                    >
                        <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
                        <span style={{ flex: 1, fontSize: '0.9375rem', fontWeight: 600, color: 'var(--app-text-primary)' }}>
                            {item.label}
                        </span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--app-text-muted)" strokeWidth="2">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </a>
                ))}
            </div>

            {/* Logout */}
            <button
                onClick={handleLogout}
                style={{
                    width: '100%',
                    padding: '0.875rem',
                    borderRadius: 'var(--app-radius-lg)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    background: 'rgba(239,68,68,0.05)',
                    color: '#EF4444',
                    fontWeight: 600,
                    fontSize: '0.9375rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    marginBottom: '5rem',
                }}
            >
                로그아웃
            </button>
        </div>
    );
}
