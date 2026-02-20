'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { query, rpc } from '@/lib/supabase/query';

// ─── Types (DB RPC 반환 타입) ────────────────────────────
interface Badge {
    badge_id: string;
    name: string;
    description: string;
    icon: string;
    category: 'attendance' | 'performance' | 'community' | 'milestone';
    metric_type: string;
    threshold: number;
    sort_order: number;
    earned: boolean;
    earned_at: string | null;
    progress: number;
}

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
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        // 단일 RPC 호출로 모든 배지 + 진행도 + 달성 여부 조회
        const { data, error } = await rpc('fn_get_my_badges', {
            p_user_id: user.id,
        });

        if (error) {
            console.error('Error loading badges:', error);
            setLoading(false);
            return;
        }

        setBadges(data || []);
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
                                strokeDasharray={`${totalCount > 0 ? (earnedCount / totalCount) * 175.9 : 0} 175.9`}
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
                        key={badge.badge_id}
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
                            <div>
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
                                {selectedBadge.earned_at && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--app-text-muted)', marginTop: '0.5rem' }}>
                                        {new Date(selectedBadge.earned_at).toLocaleDateString('ko-KR')} 달성
                                    </div>
                                )}
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
