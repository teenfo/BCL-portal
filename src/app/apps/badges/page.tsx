'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: 'attendance' | 'performance' | 'community' | 'milestone';
    threshold: number;
    earned: boolean;
    earnedDate?: string;
    progress: number;
}

const BADGE_DEFINITIONS: Omit<Badge, 'earned' | 'earnedDate' | 'progress'>[] = [
    // Attendance
    { id: 'first_checkin', name: '첫 발걸음', description: '첫 체크인을 완료하세요', icon: '🎯', category: 'attendance', threshold: 1 },
    { id: 'week_warrior', name: '주간 전사', description: '일주일에 5회 출석', icon: '⚡', category: 'attendance', threshold: 5 },
    { id: 'month_master', name: '월간 마스터', description: '한 달에 20회 출석', icon: '🔥', category: 'attendance', threshold: 20 },
    { id: 'streak_7', name: '7일 연속', description: '7일 연속 출석', icon: '💫', category: 'attendance', threshold: 7 },
    { id: 'streak_30', name: '30일 연속', description: '30일 연속 출석', icon: '🌟', category: 'attendance', threshold: 30 },
    { id: 'centurion', name: '100회 출석', description: '총 100회 출석 달성', icon: '💯', category: 'attendance', threshold: 100 },

    // Performance
    { id: 'first_wod', name: '첫 WOD', description: '첫 WOD 기록 완료', icon: '🏋️', category: 'performance', threshold: 1 },
    { id: 'pr_hunter', name: 'PR 헌터', description: 'PR 5회 달성', icon: '🏆', category: 'performance', threshold: 5 },
    { id: 'wod_master', name: 'WOD 마스터', description: 'WOD 50회 기록', icon: '💪', category: 'performance', threshold: 50 },

    // Community
    { id: 'first_feedback', name: '첫 피드백', description: '첫 수업 피드백 작성', icon: '📝', category: 'community', threshold: 1 },
    { id: 'review_star', name: '리뷰 스타', description: '피드백 10개 작성', icon: '⭐', category: 'community', threshold: 10 },

    // Milestone
    { id: 'member_1m', name: '1개월 회원', description: '가입 후 1개월', icon: '🎖️', category: 'milestone', threshold: 30 },
    { id: 'member_6m', name: '6개월 회원', description: '가입 후 6개월', icon: '🏅', category: 'milestone', threshold: 180 },
    { id: 'member_1y', name: '1년 회원', description: '가입 후 1년', icon: '👑', category: 'milestone', threshold: 365 },
];

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
    attendance: { label: '출석', icon: '🏃' },
    performance: { label: '성과', icon: '🏋️' },
    community: { label: '커뮤니티', icon: '🤝' },
    milestone: { label: '마일스톤', icon: '🎯' },
};

export default function BadgesPage() {
    const [badges, setBadges] = useState<Badge[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

    useEffect(() => { loadBadges(); }, []);

    async function loadBadges() {
        const supabase: any = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        // Get user stats for badge progress
        const [checkinRes, feedbackRes, memberRes] = await Promise.all([
            supabase.from('checkins').select('time').eq('member_id', user.id),
            supabase.from('session_feedback').select('id, rating, comment').eq('member_id', user.id),
            supabase.from('members').select('created_at').eq('user_id', user.id).single(),
        ]);

        const totalCheckins = checkinRes.data?.length || 0;
        const totalFeedbacks = feedbackRes.data?.length || 0;
        const totalWods = feedbackRes.data?.filter((f: any) => f.rating && f.rating >= 4).length || 0;
        const totalPRs = feedbackRes.data?.filter((f: any) => f.comment?.includes('PR')).length || 0;
        const memberSince = memberRes.data?.created_at ? Math.floor((Date.now() - new Date(memberRes.data.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0;

        // Calculate streak
        let streak = 0;
        if (checkinRes.data) {
            const days = new Set(checkinRes.data.map((c: any) => new Date(c.time).toISOString().split('T')[0]));
            const today = new Date();
            for (let i = 0; i < 60; i++) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                if (days.has(d.toISOString().split('T')[0])) streak++;
                else if (i > 0) break;
            }
        }

        // Monthly checkins
        const now = new Date();
        const monthCheckins = checkinRes.data?.filter((c: any) => {
            const d = new Date(c.time);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length || 0;

        // Week checkins
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const weekCheckins = checkinRes.data?.filter((c: any) => new Date(c.time) >= weekAgo).length || 0;

        const getProgress = (def: typeof BADGE_DEFINITIONS[0]): number => {
            switch (def.id) {
                case 'first_checkin': case 'centurion': return totalCheckins;
                case 'week_warrior': return weekCheckins;
                case 'month_master': return monthCheckins;
                case 'streak_7': case 'streak_30': return streak;
                case 'first_wod': case 'wod_master': return totalWods;
                case 'pr_hunter': return totalPRs;
                case 'first_feedback': case 'review_star': return totalFeedbacks;
                case 'member_1m': case 'member_6m': case 'member_1y': return memberSince;
                default: return 0;
            }
        };

        const computedBadges: Badge[] = BADGE_DEFINITIONS.map(def => {
            const progress = getProgress(def);
            return {
                ...def,
                progress,
                earned: progress >= def.threshold,
                earnedDate: progress >= def.threshold ? new Date().toISOString() : undefined,
            };
        });

        setBadges(computedBadges);
        setLoading(false);
    }

    const earnedCount = badges.filter(b => b.earned).length;
    const totalCount = badges.length;

    const filteredBadges = selectedCategory === 'all'
        ? badges
        : badges.filter(b => b.category === selectedCategory);

    if (loading) {
        return (
            <div className="app-page">
                <div className="app-skeleton" style={{ height: 80, marginBottom: '1rem', borderRadius: 16 }} />
                <div className="app-skeleton" style={{ height: 40, marginBottom: '1.5rem' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="app-skeleton" style={{ height: 100, borderRadius: 16 }} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="app-page">
            <p style={{ color: 'var(--app-text-secondary)', fontSize: '0.8125rem', marginBottom: '1rem' }}>
                목표를 달성하고 배지를 수집하세요
            </p>

            {/* Progress Overview */}
            <div className="app-glass-card" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                    <div style={{ position: 'relative', width: 64, height: 64 }}>
                        <svg width="64" height="64" viewBox="0 0 64 64">
                            <circle cx="32" cy="32" r="28" fill="none" stroke="var(--app-border)" strokeWidth="4" />
                            <circle
                                cx="32" cy="32" r="28" fill="none"
                                stroke="var(--app-accent)" strokeWidth="4"
                                strokeLinecap="round"
                                strokeDasharray={`${(earnedCount / totalCount) * 175.9} 175.9`}
                                transform="rotate(-90 32 32)"
                            />
                        </svg>
                        <div style={{
                            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                            fontSize: '1rem', fontWeight: 800, color: 'var(--app-text-primary)',
                        }}>
                            {earnedCount}
                        </div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--app-text-primary)' }}>
                            {earnedCount} / {totalCount}
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--app-text-secondary)' }}>
                            배지 획득 완료
                        </div>
                    </div>
                </div>
            </div>

            {/* Category Filter */}
            <div className="app-filter-chips" style={{ marginBottom: '1rem' }}>
                <button className={`app-filter-chip ${selectedCategory === 'all' ? 'active' : ''}`} onClick={() => setSelectedCategory('all')}>전체</button>
                {Object.entries(CATEGORY_LABELS).map(([key, { label, icon }]) => (
                    <button key={key} className={`app-filter-chip ${selectedCategory === key ? 'active' : ''}`} onClick={() => setSelectedCategory(key)}>
                        {icon} {label}
                    </button>
                ))}
            </div>

            {/* Badge Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                {filteredBadges.map(badge => (
                    <div
                        key={badge.id}
                        className="app-glass-card"
                        onClick={() => setSelectedBadge(badge)}
                        style={{
                            textAlign: 'center',
                            padding: '1rem 0.5rem',
                            cursor: 'pointer',
                            opacity: badge.earned ? 1 : 0.5,
                            filter: badge.earned ? 'none' : 'grayscale(0.6)',
                            transition: 'all 0.2s ease',
                            position: 'relative',
                        }}
                    >
                        {badge.earned && (
                            <div style={{
                                position: 'absolute',
                                top: 4,
                                right: 4,
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                background: 'var(--app-success)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>
                        )}
                        <div style={{ fontSize: '1.75rem', marginBottom: '0.375rem' }}>{badge.icon}</div>
                        <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--app-text-primary)', lineHeight: 1.3 }}>
                            {badge.name}
                        </div>
                        {!badge.earned && (
                            <div style={{ marginTop: '0.375rem' }}>
                                <div style={{
                                    height: 3,
                                    borderRadius: 2,
                                    background: 'var(--app-border)',
                                    overflow: 'hidden',
                                }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${Math.min(100, (badge.progress / badge.threshold) * 100)}%`,
                                        background: 'var(--app-accent)',
                                        borderRadius: 2,
                                        transition: 'width 0.5s ease',
                                    }} />
                                </div>
                                <div style={{ fontSize: '0.5625rem', color: 'var(--app-text-muted)', marginTop: 2 }}>
                                    {badge.progress}/{badge.threshold}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Badge Detail Modal */}
            {selectedBadge && (
                <div
                    onClick={() => setSelectedBadge(null)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.4)',
                        zIndex: 300,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '2rem',
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: 'var(--app-surface)',
                            borderRadius: 20,
                            padding: '2rem',
                            maxWidth: 320,
                            width: '100%',
                            textAlign: 'center',
                            boxShadow: '0 16px 48px rgba(0,0,0,0.15)',
                            animation: 'appFadeIn 0.3s ease',
                        }}
                    >
                        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>{selectedBadge.icon}</div>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--app-text-primary)', marginBottom: '0.5rem' }}>
                            {selectedBadge.name}
                        </h3>
                        <p style={{ color: 'var(--app-text-secondary)', fontSize: '0.875rem', marginBottom: '1rem', lineHeight: 1.5 }}>
                            {selectedBadge.description}
                        </p>
                        {selectedBadge.earned ? (
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '0.5rem 1rem',
                                borderRadius: 20,
                                background: 'var(--app-success-bg)',
                                color: 'var(--app-success)',
                                fontSize: '0.8125rem',
                                fontWeight: 600,
                            }}>
                                ✨ 획득 완료!
                            </div>
                        ) : (
                            <div>
                                <div style={{
                                    height: 6,
                                    borderRadius: 3,
                                    background: 'var(--app-border)',
                                    overflow: 'hidden',
                                    marginBottom: '0.5rem',
                                }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${Math.min(100, (selectedBadge.progress / selectedBadge.threshold) * 100)}%`,
                                        background: 'var(--app-accent)',
                                        borderRadius: 3,
                                    }} />
                                </div>
                                <div style={{ fontSize: '0.8125rem', color: 'var(--app-text-secondary)' }}>
                                    {selectedBadge.progress} / {selectedBadge.threshold}
                                </div>
                            </div>
                        )}
                        <button
                            onClick={() => setSelectedBadge(null)}
                            className="app-btn-outline"
                            style={{ marginTop: '1.25rem', width: '100%' }}
                        >
                            닫기
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
