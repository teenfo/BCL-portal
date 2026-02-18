'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import AdminPageHeader from '@/components/layout/AdminPageHeader';
import AdminModal from '@/components/layout/AdminModal';
import { IconFileText } from '@/components/icons/AdminIcons';
import { useToast } from '@/components/ui/Toast';

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

    // T1-1: Refund modal state
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [refundTarget, setRefundTarget] = useState<Transaction | null>(null);
    const [refundReason, setRefundReason] = useState('');
    const [refundFeePercent, setRefundFeePercent] = useState(10);
    const [processing, setProcessing] = useState(false);
    const { success, error: toastError, info } = useToast();

    const loadTransactions = useCallback(async () => {
        const supabase = createClient();
        setLoading(true);

        try {
            let query = supabase
                .from('transactions')
                .select('*, members!transactions_member_id_fkey(name, email)')
                .gte('created_at', dateRange.start + 'T00:00:00')
                .lte('created_at', dateRange.end + 'T23:59:59')
                .order('created_at', { ascending: false });

            if (filterStatus !== 'all') {
                // Try both column names for compatibility
                query = query.or(`payment_status.eq.${filterStatus},status.eq.${filterStatus}`);
            }
            if (filterCategory !== 'all') {
                query = query.eq('category', filterCategory);
            }

            const { data, error } = await query;

            if (error) {
                // Fallback: query without joins
                console.warn('Transactions JOIN query error, trying fallback:', error.message);
                const { data: fallbackData } = await supabase
                    .from('transactions')
                    .select('*')
                    .gte('created_at', dateRange.start + 'T00:00:00')
                    .lte('created_at', dateRange.end + 'T23:59:59')
                    .order('created_at', { ascending: false });

                if (fallbackData) {
                    const mapped = fallbackData.map((t: any) => ({
                        ...t,
                        payment_status: t.payment_status || t.status || 'pending',
                        payment_method: t.payment_method || t.method || null,
                        transaction_type: t.transaction_type || 'purchase',
                    }));
                    setTransactions(mapped as any);
                }
            } else {
                if (data) {
                    // Map actual columns to expected interface
                    const mapped = data.map((t: any) => ({
                        ...t,
                        payment_status: t.payment_status || t.status || 'pending',
                        payment_method: t.payment_method || t.method || null,
                        transaction_type: t.transaction_type || 'purchase',
                    }));
                    setTransactions(mapped as any);
                }
            }
        } catch (e) {
            console.error('Error loading transactions:', e);
        }
        setLoading(false);
    }, [dateRange, filterStatus, filterCategory]);

    useEffect(() => { loadTransactions(); }, [loadTransactions]);

    // T1-1: Open refund modal with auto fee calculation
    function openRefundModal(tx: Transaction) {
        setRefundTarget(tx);
        // Auto-calc fee: default 10%, but could be adjusted
        setRefundFeePercent(10);
        setRefundReason('');
        setShowRefundModal(true);
    }

    // T1-1: Process refund
    async function processRefund() {
        if (!refundTarget) return;
        setProcessing(true);
        const supabase = createClient();
        const feeAmount = Math.round(Number(refundTarget.amount) * refundFeePercent / 100);
        const refundAmount = Number(refundTarget.amount) - feeAmount;

        // Mark original transaction as refunded
        const { error: err1 } = await (supabase as any).from('transactions').update({
            status: 'refunded',
        }).eq('id', refundTarget.id);
        if (err1) {
            toastError(`환불 상태 업데이트 실패: ${err1.message}`);
            setProcessing(false);
            return;
        }

        // Create refund transaction record
        const { error: err2 } = await (supabase as any).from('transactions').insert({
            member_id: refundTarget.member_id,
            amount: refundAmount,
            method: refundTarget.payment_method,
            status: 'completed',
            category: refundTarget.category,
            date: new Date().toISOString().split('T')[0],
        });

        if (err2) {
            toastError(`환불 기록 생성 실패: ${err2.message}`);
        } else {
            success('환불 처리가 완료되었습니다.');
            setShowRefundModal(false);
            setRefundTarget(null);
            loadTransactions();
        }

        setShowRefundModal(false);
        setRefundTarget(null);
        setProcessing(false);
        loadTransactions();
    }

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

    // T2-2: CSV Download
    function downloadTransactionsCSV() {
        if (filteredTransactions.length === 0) return;
        const rows = [['Date', 'Member', 'Email', 'Type', 'Category', 'Method', 'Status', 'Amount']];
        filteredTransactions.forEach(t => rows.push([
            t.created_at?.split('T')[0] || '', t.members?.name || '', t.members?.email || '',
            t.transaction_type || '', t.category || '', t.payment_method || '',
            t.payment_status || '', String(t.amount),
        ]));
        const csvContent = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

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
        <div className="transition-all duration-500">
            <AdminPageHeader
                category="User & Finance"
                title="Transactions"
                subtitle="Ledger"
                actions={<button onClick={downloadTransactionsCSV} disabled={filteredTransactions.length === 0} className="admin-action-btn disabled:opacity-40">⬇ CSV 다운로드</button>}
            />

            <div className="p-10 max-w-[1400px] mx-auto">
                <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                            className="admin-search-input"
                        />
                        <span className="text-white/20">~</span>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                            className="admin-search-input"
                        />
                    </div>
                </div>

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
                                className={`admin-filter-btn ${filterStatus === f ? 'active' : ''}`}
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
                                className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all"
                                style={filterCategory === f
                                    ? { background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
                                    : { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.4)' }
                                }
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
                            className="admin-search-input"
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
                        <span className="text-4xl mb-4"><IconFileText size={40} /></span>
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
                                    <th className="p-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest"></th>
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
                                            {/* T1-1: Refund button */}
                                            <td className="p-4">
                                                {t.payment_status === 'completed' && t.transaction_type !== 'refund' && (
                                                    <button
                                                        onClick={() => openRefundModal(t)}
                                                        className="px-3 py-1.5 rounded-lg text-[7px] font-black uppercase tracking-widest bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        환불
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* T1-1: Refund Modal */}
                <AdminModal show={showRefundModal && !!refundTarget} onClose={() => { setShowRefundModal(false); setRefundTarget(null); }} title="환불 처리" subtitle={refundTarget?.members?.name || ''}>
                    {refundTarget && (() => {
                        const feeAmount = Math.round(Number(refundTarget.amount) * refundFeePercent / 100);
                        const refundAmount = Number(refundTarget.amount) - feeAmount;
                        return (
                            <div className="space-y-5">
                                {/* Original transaction info */}
                                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[9px] text-[var(--text-muted)] uppercase">원거래 금액</span>
                                        <span className="text-lg font-black text-white">₩{Number(refundTarget.amount).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[9px] text-[var(--text-muted)] uppercase">결제일</span>
                                        <span className="text-xs text-white/60">{new Date(refundTarget.created_at).toLocaleDateString('ko-KR')}</span>
                                    </div>
                                </div>

                                {/* Fee calculation */}
                                <div>
                                    <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">위약금 비율 (%)</label>
                                    <div className="flex gap-2 mb-3">
                                        {[0, 5, 10, 20, 30].map(p => (
                                            <button key={p} onClick={() => setRefundFeePercent(p)} className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${refundFeePercent === p ? 'bg-purple-500/20 border border-purple-500/30 text-purple-400' : 'bg-white/[0.03] border border-white/5 text-white/50'}`}>{p}%</button>
                                        ))}
                                    </div>
                                    <input type="number" min={0} max={100} value={refundFeePercent} onChange={(e) => setRefundFeePercent(Math.min(100, Math.max(0, Number(e.target.value))))} className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                                </div>

                                {/* Refund summary */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 text-center">
                                        <p className="text-[8px] text-red-400 uppercase mb-1">위약금</p>
                                        <p className="text-lg font-black text-red-400">₩{feeAmount.toLocaleString()}</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10 text-center">
                                        <p className="text-[8px] text-purple-400 uppercase mb-1">환불액</p>
                                        <p className="text-lg font-black text-purple-400">₩{refundAmount.toLocaleString()}</p>
                                    </div>
                                </div>

                                {/* Reason */}
                                <div>
                                    <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">환불 사유</label>
                                    <input type="text" value={refundReason} onChange={(e) => setRefundReason(e.target.value)} placeholder="예: 단순 변심, 시설 불만, 이전 등" className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                                </div>

                                <div className="p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/10">
                                    <p className="text-[9px] text-yellow-500 font-bold">⚠️ 환불 처리는 취소할 수 없습니다. 신중하게 확인해주세요.</p>
                                </div>
                            </div>
                        );
                    })()}
                    <div className="flex gap-3 mt-8">
                        <button onClick={() => { setShowRefundModal(false); setRefundTarget(null); }} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/[0.06] transition-all" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>취소</button>
                        <button onClick={processRefund} disabled={processing} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all disabled:opacity-50" style={{ background: '#8B5CF6', boxShadow: '0 0 20px rgba(139,92,246,0.3)' }}>{processing ? '처리 중...' : '환불 승인'}</button>
                    </div>
                </AdminModal>
            </div>
        </div>
    );
}
