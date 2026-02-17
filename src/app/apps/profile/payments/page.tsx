'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Transaction {
    id: string;
    amount: number;
    payment_status: string;
    category: string;
    description: string;
    created_at: string;
}

export default function PaymentsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { setLoading(false); return; }

            const { data }: any = await supabase
                .from('transactions')
                .select('*')
                .eq('member_id', user.id)
                .order('created_at', { ascending: false });

            if (data) setTransactions(data as any);
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
                        const badge = statusBadge(t.payment_status);
                        return (
                            <div key={t.id} className="app-glass-card-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span style={{ fontSize: '1.5rem' }}>{categoryIcon(t.category)}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9375rem' }}>{t.description || t.category}</div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{new Date(t.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ color: t.payment_status === 'refunded' ? '#f87171' : '#fff', fontWeight: 700, fontSize: '0.9375rem' }}>
                                        {t.payment_status === 'refunded' ? '-' : ''}₩{formatPrice(t.amount)}
                                    </div>
                                    <span style={{ padding: '0.0625rem 0.375rem', borderRadius: 9999, fontSize: '0.625rem', fontWeight: 600, background: badge.bg, color: badge.color }}>
                                        {badge.label}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
