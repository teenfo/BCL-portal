'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Transaction {
    id: string;
    amount: number;
    status: string;
    category: string;
    date: string;
    created_at: string;
    receipt_url?: string;
    toss_raw_data?: any;
}

export default function PaymentsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { setLoading(false); return; }

            // transactions는 member_id → members.id FK이므로 먼저 member 조회
            const { data: memberData }: any = await supabase
                .from('members')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (user) {
                // user_id 또는 member_id 둘 다 체크 (회원 데이터 정합 성 확보)
                const { data }: any = await (supabase as any)
                    .from('transactions')
                    .select('*')
                    .or(`user_id.eq.${user.id},member_id.eq.${memberData?.id}`)
                    .order('created_at', { ascending: false });

                if (data) setTransactions(data);
            }
            setLoading(false);
        })();
    }, []);

    function formatPrice(n: number) { return new Intl.NumberFormat('ko-KR').format(n); }

    function statusBadge(s: string) {
        switch (s) {
            case 'completed': return { label: '완료', color: '#4ade80', bg: 'rgba(74,222,128,0.1)' };
            case 'pending': return { label: '처리 중', color: '#facc15', bg: 'rgba(250,204,21,0.1)' };
            case 'refunded': return { label: '환불', color: '#f87171', bg: 'rgba(248,113,113,0.1)' };
            default: return { label: s, color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.05)' };
        }
    }

    function categoryIcon(c: string) {
        switch (c) {
            case 'membership': return '🎫';
            case 'pt': return '💪';
            case 'merchandise': return '🛍️';
            default: return '💳';
        }
    }

    if (loading) return <div className="app-page"><div className="app-skeleton" style={{ height: 300 }} /></div>;

    return (
        <div className="app-page">
            <Link href="/apps/profile" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>← 돌아가기</Link>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', margin: '1rem 0 0.25rem' }}>결제 내역</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: '1.5rem' }}>전체 결제 및 환불 내역</p>

            {transactions.length === 0 ? (
                <div className="app-empty-state">
                    <div className="emoji">💳</div>
                    <div className="message">결제 내역이 없습니다</div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {transactions.map(t => {
                        const badge = statusBadge(t.status);
                        return (
                            <div key={t.id} className="app-glass-card-sm" style={{ padding: '1rem', marginBottom: '0.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                    <span style={{ fontSize: '1.5rem' }}>{categoryIcon(t.category)}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ color: 'var(--app-text-primary)', fontWeight: 600, fontSize: '0.9375rem' }}>{t.category || '결제'}</div>
                                            {t.toss_raw_data?.mode === 'simulation' && (
                                                <span style={{ fontSize: '0.625rem', padding: '0.125rem 0.375rem', borderRadius: 4, background: 'rgba(250,204,21,0.1)', color: '#facc15', border: '1px solid rgba(250,204,21,0.2)' }}>시뮬레이션</span>
                                            )}
                                        </div>
                                        <div style={{ color: 'var(--app-text-secondary)', fontSize: '0.75rem' }}>{new Date(t.date || t.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ color: t.status === 'refunded' ? '#f87171' : 'var(--app-text-primary)', fontWeight: 700, fontSize: '0.9375rem' }}>
                                            {t.status === 'refunded' ? '-' : ''}₩{formatPrice(t.amount)}
                                        </div>
                                        <span style={{ padding: '0.0625rem 0.375rem', borderRadius: 9999, fontSize: '0.625rem', fontWeight: 600, background: badge.bg, color: badge.color }}>
                                            {badge.label}
                                        </span>
                                    </div>
                                </div>

                                {t.receipt_url && (
                                    <div style={{ borderTop: '1px solid var(--app-border)', marginTop: '0.75rem', paddingTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
                                        <a
                                            href={t.receipt_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ fontSize: '0.75rem', color: 'var(--app-accent)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                        >
                                            📄 영수증 보기
                                        </a>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
