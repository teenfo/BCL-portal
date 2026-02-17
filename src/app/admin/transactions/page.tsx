'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Transaction {
    id: string;
    member_id: string;
    membership_id: string | null;
    amount: number;
    payment_method: string | null;
    payment_status: string;
    transaction_type: string;
    category: string;
    pg_transaction_id: string | null;
    created_at: string;
    members?: { name: string; email: string };
}

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed' | 'failed' | 'refunded'>('all');
    const [filterCategory, setFilterCategory] = useState<'all' | 'membership' | 'pt' | 'goods' | 'locker' | 'etc'>('all');
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
    });
    const [searchTerm, setSearchTerm] = useState('');

    const loadTransactions = useCallback(async () => {
        const supabase = createClient();
        setLoading(true);

        let query = supabase
            .from('transactions')
            .select('*, members(name, email)')
            .gte('created_at', dateRange.start + 'T00:00:00')
            .lte('created_at', dateRange.end + 'T23:59:59')
            .order('created_at', { ascending: false });

        if (filterStatus !== 'all') {
            query = query.eq('payment_status', filterStatus);
        }
        if (filterCategory !== 'all') {
            query = query.eq('category', filterCategory);
        }

        const { data } = await query;
        if (data) setTransactions(data);
        setLoading(false);
    }, [dateRange, filterStatus, filterCategory]);

    useEffect(() => { loadTransactions(); }, [loadTransactions]);

    const filteredTransactions = transactions.filter((t) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            t.members?.name?.toLowerCase().includes(term) ||
            t.members?.email?.toLowerCase().includes(term) ||
            t.pg_transaction_id?.toLowerCase().includes(term)
        );
    });

    // Summary Stats
    const totalRevenue = transactions.filter(t => t.payment_status === 'completed' && t.transaction_type === 'purchase').reduce((sum, t) => sum + Number(t.amount), 0);
    const totalRefund = transactions.filter(t => t.payment_status === 'refunded' || t.transaction_type === 'refund').reduce((sum, t) => sum + Number(t.amount), 0);
    const pendingAmount = transactions.filter(t => t.payment_status === 'pending').reduce((sum, t) => sum + Number(t.amount), 0);
    const txCount = transactions.length;

    const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
        completed: { bg: 'rgba(34, 197, 94, 0.15)', color: '#22C55E', label: '완료' },
        pending: { bg: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', label: '대기' },
        failed: { bg: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', label: '실패' },
        refunded: { bg: 'rgba(139, 92, 246, 0.15)', color: '#8B5CF6', label: '환불' },
    };

    const categoryLabels: Record<string, string> = {
        membership: '멤버십',
        pt: 'PT',
        goods: '상품',
        locker: '락커',
        etc: '기타',
    };

    return (
        <div className="p-8 lg:p-12 transition-all duration-700">
            {/* Header */}
            <header className="flex items-end justify-between mb-12 animate-premium-fade">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-[var(--primary)] shadow-[0_0_15px_var(--primary-glow)]"></span>
                            <span className="text-[11px] font-black text-[var(--primary)] uppercase tracking-[0.5em] italic">User &amp; Finance</span>
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight leading-none uppercase">
                            Transactions <span className="opacity-20 font-light ml-2">Ledger</span>
                        </h1>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                        className="px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-white outline-none focus:border-[var(--primary)]/50"
                    />
                    <span className="text-[var(--text-muted)]">~</span>
                    <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                        className="px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-white outline-none focus:border-[var(--primary)]/50"
                    />
                </div>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-12 gap-6 mb-10">
                {[
                    { label: 'Total Revenue', value: `₩${(totalRevenue / 10000).toFixed(0)}만`, color: '#22C55E', sub: '완료 결제 합계' },
                    { label: 'Refunded', value: `₩${(totalRefund / 10000).toFixed(0)}만`, color: '#8B5CF6', sub: '환불 합계' },
                    { label: 'Pending', value: `₩${(pendingAmount / 10000).toFixed(0)}만`, color: '#F59E0B', sub: '대기중 결제' },
                    { label: 'Total Transactions', value: txCount.toLocaleString(), color: 'var(--primary)', sub: '전체 건수' },
                ].map((kpi, i) => (
                    <div key={i} className="col-span-12 md:col-span-3">
                        <div className="kpi-card">
                            <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] italic">{kpi.label}</h4>
                            <div className="mt-4">
                                <p className="text-2xl font-black text-white tracking-tighter">{kpi.value}</p>
                                <p className="text-[9px] font-bold uppercase tracking-widest mt-1" style={{ color: kpi.color }}>{kpi.sub}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 mb-8">
                <div className="flex gap-2">
                    {(['all', 'completed', 'pending', 'failed', 'refunded'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilterStatus(f)}
                            className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filterStatus === f
                                ? 'bg-[var(--primary)] text-white shadow-[0_0_15px_rgba(255,107,0,0.3)]'
                                : 'bg-white/[0.03] border border-white/5 text-[var(--text-muted)] hover:text-white'
                                }`}
                        >
                            {f === 'all' ? '전체' : statusConfig[f]?.label || f}
                        </button>
                    ))}
                </div>
                <div className="h-6 w-px bg-white/10"></div>
                <div className="flex gap-2">
                    {(['all', 'membership', 'pt', 'goods', 'locker', 'etc'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilterCategory(f)}
                            className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${filterCategory === f
                                ? 'bg-white/10 text-white border border-white/10'
                                : 'bg-white/[0.02] border border-white/[0.03] text-[var(--text-muted)] hover:text-white'
                                }`}
                        >
                            {f === 'all' ? '전체' : categoryLabels[f]}
                        </button>
                    ))}
                </div>
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="회원명, PG 거래 ID 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-white placeholder-[var(--text-muted)] outline-none focus:border-[var(--primary)]/50 transition-all"
                    />
                </div>
            </div>

            {/* Transaction List */}
            {loading ? (
                <div className="flex justify-center py-64">
                    <div className="w-10 h-10 rounded-xl border-2 border-white/5 border-t-[var(--primary)] animate-spin"></div>
                </div>
            ) : filteredTransactions.length === 0 ? (
                <div className="glass-card p-20 flex flex-col items-center justify-center text-center opacity-40">
                    <span className="text-4xl mb-4">📑</span>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em]">No transactions found</p>
                </div>
            ) : (
                <div className="glass-card rounded-2xl overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <th className="text-left p-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">일시</th>
                                <th className="text-left p-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">회원</th>
                                <th className="text-left p-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">카테고리</th>
                                <th className="text-left p-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">유형</th>
                                <th className="text-left p-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">결제 수단</th>
                                <th className="text-left p-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">상태</th>
                                <th className="text-right p-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">금액</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.map((t) => {
                                const sc = statusConfig[t.payment_status] || statusConfig.pending;
                                return (
                                    <tr key={t.id} className="hover:bg-white/[0.02] transition-colors group" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                        <td className="p-4">
                                            <p className="text-xs font-bold text-white">{new Date(t.created_at).toLocaleDateString('ko-KR')}</p>
                                            <p className="text-[9px] text-[var(--text-muted)]">{new Date(t.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</p>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[8px] font-black" style={{ background: 'linear-gradient(135deg, rgba(255,107,0,0.3), rgba(255,107,0,0.1))', color: 'var(--primary)' }}>
                                                    {t.members?.name?.charAt(0) || '?'}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-white group-hover:text-[var(--primary)] transition-colors">{t.members?.name || 'Unknown'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-[9px] font-black text-white/60 uppercase">{categoryLabels[t.category] || t.category}</span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`text-[9px] font-black uppercase ${t.transaction_type === 'refund' ? 'text-purple-400' : 'text-white/60'}`}>
                                                {t.transaction_type === 'purchase' ? '결제' : t.transaction_type === 'refund' ? '환불' : '조정'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-[9px] text-white/40 uppercase">{t.payment_method || '-'}</span>
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2.5 py-1 rounded-full text-[8px] font-black uppercase" style={{ background: sc.bg, color: sc.color }}>
                                                {sc.label}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className={`text-sm font-black ${t.transaction_type === 'refund' ? 'text-purple-400' : 'text-white'}`}>
                                                {t.transaction_type === 'refund' ? '-' : ''}₩{Number(t.amount).toLocaleString()}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
