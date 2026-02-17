'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface MembershipPlan {
    id: string;
    name: string;
    type: string;
    price: number;
    duration_days: number;
    credit_count: number;
    description: string;
    features: string[];
    is_popular?: boolean;
    is_active: boolean;
}

export default function UserPurchasePage() {
    const [plans, setPlans] = useState<MembershipPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('전체');
    const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
    const [purchasing, setPurchasing] = useState(false);

    useEffect(() => { loadPlans(); }, []);

    async function loadPlans() {
        const supabase: any = createClient();
        const { data }: any = await supabase
            .from('membership_plans')
            .select('*')
            .eq('is_active', true)
            .order('price', { ascending: true });

        if (data) {
            setPlans(data.map((p: any) => ({
                ...p,
                features: p.features || getDefaultFeatures(p),
                is_popular: p.is_popular || p.name?.includes('3개월') || p.name?.includes('Premium'),
            })));
        }
        setLoading(false);
    }

    function getDefaultFeatures(plan: MembershipPlan): string[] {
        const features = ['모든 수업 참여 가능', 'QR 체크인'];
        if (plan.type === 'period' || plan.duration_days >= 30) features.push('무제한 수업');
        if (plan.credit_count && plan.credit_count > 0) features.push(`${plan.credit_count}회 크레딧`);
        if (plan.duration_days >= 90) { features.push('PT 1회 무료 제공'); features.push('락커 무료 이용'); }
        if (plan.duration_days >= 180) { features.push('운동복 대여'); features.push('방문 주차 무료'); }
        return features;
    }

    function formatPrice(price: number) {
        return new Intl.NumberFormat('ko-KR').format(price);
    }

    function getDuration(days: number) {
        if (days >= 365) return `${Math.round(days / 365)}년`;
        if (days >= 30) return `${Math.round(days / 30)}개월`;
        return `${days}일`;
    }

    const filteredPlans = filter === '전체'
        ? plans
        : plans.filter(p => {
            if (filter === '기간제') return p.type === 'period' || (!p.credit_count || p.credit_count <= 0);
            if (filter === '횟수권') return p.type === 'credit' || (p.credit_count && p.credit_count > 0);
            return true;
        });

    async function handlePurchase() {
        if (!selectedPlan || purchasing) return;
        setPurchasing(true);

        const supabase: any = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert('로그인이 필요합니다.');
            setPurchasing(false);
            return;
        }

        const { error }: any = await supabase.from('transactions').insert({
            member_id: user.id,
            amount: selectedPlan.price,
            payment_status: 'pending',
            category: 'membership',
            description: `${selectedPlan.name} 구매`,
        });

        if (error) {
            alert('결제 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
        } else {
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + selectedPlan.duration_days);

            await supabase.from('memberships').insert({
                member_id: user.id,
                plan_id: selectedPlan.id,
                start_date: startDate.toISOString().split('T')[0],
                end_date: endDate.toISOString().split('T')[0],
                remaining_credits: selectedPlan.credit_count || 0,
                status: 'active',
            });

            alert('🎉 멤버십 구매가 완료되었습니다!\n소중한 회원이 되어주셔서 감사합니다.');
            setSelectedPlan(null);
        }
        setPurchasing(false);
    }

    if (loading) {
        return (
            <div className="app-page">
                <div className="app-skeleton" style={{ height: 60, marginBottom: '1.5rem' }} />
                {[1, 2, 3].map(i => (
                    <div key={i} className="app-skeleton" style={{ height: 220, marginBottom: '1rem' }} />
                ))}
            </div>
        );
    }

    return (
        <div className="app-page">
            {/* ── Subtitle ── */}
            <p style={{ color: 'var(--app-text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                나에게 맞는 플랜을 선택하세요
            </p>

            {/* ── Filter ── */}
            <div className="app-filter-chips" style={{ marginBottom: '1.25rem' }}>
                {['전체', '기간제', '횟수권'].map(f => (
                    <button
                        key={f}
                        className={`app-filter-chip ${filter === f ? 'active' : ''}`}
                        onClick={() => setFilter(f)}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* ── Plan Cards ── */}
            {filteredPlans.length === 0 ? (
                <div className="app-empty-state">
                    <div className="emoji">🎫</div>
                    <div className="message">이용 가능한 플랜이 없습니다</div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {filteredPlans.map((plan) => (
                        <div
                            key={plan.id}
                            className="app-glass-card"
                            style={{
                                padding: 0,
                                overflow: 'hidden',
                                border: selectedPlan?.id === plan.id
                                    ? '2px solid var(--app-accent)'
                                    : '1px solid var(--app-border)',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                            }}
                            onClick={() => setSelectedPlan(selectedPlan?.id === plan.id ? null : plan)}
                        >
                            {/* Popular badge */}
                            {plan.is_popular && (
                                <div style={{
                                    background: 'linear-gradient(135deg, var(--app-accent), #E8933A)',
                                    padding: '0.375rem 0',
                                    textAlign: 'center',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    color: '#fff',
                                    letterSpacing: '0.05em',
                                }}>
                                    🔥 가장 인기 있는 플랜
                                </div>
                            )}

                            <div style={{ padding: '1.25rem' }}>
                                {/* Plan name + type badge */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                    <h3 style={{ color: 'var(--app-text-primary)', fontSize: '1.125rem', fontWeight: 700 }}>
                                        {plan.name}
                                    </h3>
                                    <span style={{
                                        padding: '0.125rem 0.5rem',
                                        borderRadius: 9999,
                                        fontSize: '0.6875rem',
                                        fontWeight: 600,
                                        background: plan.type === 'credit' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                        color: plan.type === 'credit' ? '#7C3AED' : '#3B82F6',
                                    }}>
                                        {plan.type === 'credit' ? '횟수권' : '기간제'}
                                    </span>
                                </div>

                                {/* Price */}
                                <div style={{ marginBottom: '0.75rem' }}>
                                    <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--app-text-primary)' }}>
                                        ₩{formatPrice(plan.price)}
                                    </span>
                                    <span style={{ fontSize: '0.8125rem', color: 'var(--app-text-secondary)', marginLeft: '0.5rem' }}>
                                        / {getDuration(plan.duration_days)}
                                    </span>
                                </div>

                                {/* Key stats */}
                                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                                    {[
                                        { label: '기간', value: getDuration(plan.duration_days) },
                                        { label: '크레딧', value: plan.credit_count > 0 ? `${plan.credit_count}회` : '무제한' },
                                        { label: '회당', value: `₩${formatPrice(plan.credit_count > 0 ? Math.round(plan.price / plan.credit_count) : Math.round(plan.price / (plan.duration_days / 30 * 20)))}` },
                                    ].map((stat, i) => (
                                        <div key={i} style={{
                                            padding: '0.5rem 0.75rem',
                                            borderRadius: 8,
                                            background: 'var(--app-accent-light)',
                                            flex: 1,
                                            textAlign: 'center',
                                        }}>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--app-text-secondary)' }}>{stat.label}</div>
                                            <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--app-text-primary)' }}>
                                                {stat.value}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Features */}
                                <div style={{ borderTop: '1px solid var(--app-border)', paddingTop: '0.75rem' }}>
                                    {plan.features.slice(0, selectedPlan?.id === plan.id ? 10 : 3).map((f, idx) => (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                                            <span style={{ color: 'var(--app-success)', fontSize: '0.75rem' }}>✓</span>
                                            <span style={{ color: 'var(--app-text-secondary)', fontSize: '0.8125rem' }}>{f}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Select button */}
                                {selectedPlan?.id === plan.id && (
                                    <div style={{ marginTop: '1rem' }}>
                                        {plan.description && (
                                            <p style={{
                                                fontSize: '0.8125rem',
                                                color: 'var(--app-text-secondary)',
                                                lineHeight: 1.6,
                                                marginBottom: '1rem',
                                                padding: '0.75rem',
                                                background: 'var(--app-accent-light)',
                                                borderRadius: 8,
                                            }}>
                                                {plan.description}
                                            </p>
                                        )}
                                        <button
                                            className="app-btn-primary"
                                            style={{ width: '100%', padding: '0.875rem', fontSize: '0.9375rem' }}
                                            onClick={(e) => { e.stopPropagation(); handlePurchase(); }}
                                            disabled={purchasing}
                                        >
                                            {purchasing ? '결제 처리 중...' : `₩${formatPrice(plan.price)} 결제하기`}
                                        </button>
                                        <p style={{ textAlign: 'center', fontSize: '0.6875rem', color: 'var(--app-text-muted)', marginTop: '0.5rem' }}>
                                            결제 후 즉시 이용 가능 · 환불 규정 적용
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Footer Info ── */}
            <div style={{ marginTop: '2rem', padding: '1rem', borderRadius: 12, background: 'var(--app-accent-light)' }}>
                <h4 style={{ color: 'var(--app-text-primary)', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>안내 사항</h4>
                <ul style={{ color: 'var(--app-text-secondary)', fontSize: '0.75rem', lineHeight: 1.8, paddingLeft: '1rem' }}>
                    <li>구매일 기준으로 유효기간이 자동 시작됩니다</li>
                    <li>홀딩(일시정지)은 마이페이지에서 신청할 수 있습니다</li>
                    <li>환불은 이용 시작 후 7일 이내, 2회 미만 이용 시 가능합니다</li>
                    <li>결제에 문제가 있으시면 고객센터로 연락해주세요</li>
                </ul>
            </div>
        </div>
    );
}
