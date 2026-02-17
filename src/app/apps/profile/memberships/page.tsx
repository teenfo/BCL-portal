'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Membership {
    id: string;
    plan_name: string;
    start_date: string;
    end_date: string;
    remaining_credits: number;
    status: string;
    plan_type: string;
}

export default function MembershipsPage() {
    const [memberships, setMemberships] = useState<Membership[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { setLoading(false); return; }

            const { data } = await supabase
                .from('memberships')
                .select('*, membership_plans(name, type)')
                .eq('member_id', user.id)
                .order('start_date', { ascending: false });

            if (data) {
                setMemberships(data.map((m: Record<string, unknown>) => {
                    const plan = m.membership_plans as Record<string, unknown> | null;
                    return {
                        id: m.id as string,
                        plan_name: (plan?.name as string) || '이용권',
                        plan_type: (plan?.type as string) || 'period',
                        start_date: m.start_date as string,
                        end_date: m.end_date as string,
                        remaining_credits: (m.remaining_credits as number) || 0,
                        status: m.status as string,
                    };
                }));
            }
            setLoading(false);
        })();
    }, []);

    function getDday(endDate: string) {
        const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return diff > 0 ? `D-${diff}` : diff === 0 ? 'D-Day' : '만료됨';
    }

    function getStatusColor(status: string) {
        switch (status) {
            case 'active': return { bg: 'rgba(74,222,128,0.1)', color: '#4ade80', label: '이용 중' };
            case 'expired': return { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', label: '만료' };
            case 'paused': return { bg: 'rgba(250,204,21,0.1)', color: '#facc15', label: '홀딩 중' };
            default: return { bg: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', label: status };
        }
    }

    if (loading) return <div className="app-page"><div className="app-skeleton" style={{ height: 300 }} /></div>;

    return (
        <div className="app-page">
            <Link href="/apps/profile" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>← 돌아가기</Link>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', margin: '1rem 0 0.25rem' }}>이용권 관리</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: '1.5rem' }}>보유 중인 이용권 현황</p>

            {memberships.length === 0 ? (
                <div className="app-empty-state">
                    <div className="emoji">🎫</div>
                    <div className="message">보유 중인 이용권이 없습니다</div>
                    <Link href="/apps/purchase" className="app-btn-primary" style={{ marginTop: '1rem', display: 'inline-block', textDecoration: 'none' }}>
                        이용권 구매하기
                    </Link>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {memberships.map(m => {
                        const statusInfo = getStatusColor(m.status);
                        return (
                            <div key={m.id} className="app-glass-card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                    <h3 style={{ color: '#fff', fontWeight: 700 }}>{m.plan_name}</h3>
                                    <span style={{ padding: '0.125rem 0.5rem', borderRadius: 9999, fontSize: '0.6875rem', fontWeight: 600, background: statusInfo.bg, color: statusInfo.color }}>
                                        {statusInfo.label}
                                    </span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                    <div style={{ textAlign: 'center', padding: '0.5rem', borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>
                                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>시작일</div>
                                        <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.8125rem' }}>{new Date(m.start_date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</div>
                                    </div>
                                    <div style={{ textAlign: 'center', padding: '0.5rem', borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>
                                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>종료일</div>
                                        <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.8125rem' }}>{new Date(m.end_date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</div>
                                    </div>
                                    <div style={{ textAlign: 'center', padding: '0.5rem', borderRadius: 8, background: m.status === 'active' ? 'rgba(255,107,0,0.1)' : 'rgba(255,255,255,0.03)' }}>
                                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>남은 기간</div>
                                        <div style={{ color: m.status === 'active' ? 'var(--primary)' : '#fff', fontWeight: 700, fontSize: '0.8125rem' }}>{getDday(m.end_date)}</div>
                                    </div>
                                </div>
                                {m.remaining_credits > 0 && (
                                    <div style={{ padding: '0.5rem 0.75rem', borderRadius: 8, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)', textAlign: 'center' }}>
                                        <span style={{ color: '#a78bfa', fontSize: '0.8125rem', fontWeight: 600 }}>잔여 크레딧: {m.remaining_credits}회</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    <Link href="/apps/purchase" className="app-btn-secondary" style={{ textAlign: 'center', textDecoration: 'none', display: 'block', padding: '0.75rem' }}>
                        + 새 이용권 구매
                    </Link>
                </div>
            )}
        </div>
    );
}
