'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import AdminPageHeader from '@/components/layout/AdminPageHeader';
import AdminModal from '@/components/layout/AdminModal';
import { IconFileText, IconCheck, IconAlertCircle } from '@/components/icons/AdminIcons';
import { useToast } from '@/components/ui/Toast';

interface Transaction {
    id: string;
    member_id: string | null;
    user_id: string | null;
    membership_id: string | null;
    amount: number;
    payment_method: string | null;
    payment_status: string;
    transaction_type: string;
    category: string;
    order_id: string | null;
    payment_key: string | null;
    source: string | null;
    receipt_url: string | null;
    toss_raw_data: any;
    created_at: string;
    members?: { name: string; email: string };
}

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed' | 'failed' | 'refunded'>('all');
    const [filterCategory, setFilterCategory] = useState<'all' | 'membership' | 'pt' | 'goods' | 'locker' | 'etc'>('all');
    const [filterSource, setFilterSource] = useState<'all' | 'online' | 'offline'>('all');
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
    });
    const [searchTerm, setSearchTerm] = useState('');

    // Modal states
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [refundTarget, setRefundTarget] = useState<Transaction | null>(null);
    const [refundReason, setRefundReason] = useState('');
    const [refundFeePercent, setRefundFeePercent] = useState(10);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
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
                query = (query as any).or(`payment_status.eq.${filterStatus},status.eq.${filterStatus}`);
            }
            if (filterCategory !== 'all') {
                query = (query as any).eq('category', filterCategory);
            }
            if (filterSource !== 'all') {
                query = (query as any).eq('source', filterSource);
            }

            const { data, error } = await query;

            if (data) {
                const mapped = data.map((t: any) => ({
                    ...t,
                    payment_status: t.payment_status || t.status || 'pending',
                    payment_method: t.payment_method || t.method || null,
                    transaction_type: t.transaction_type || 'purchase',
                }));
                setTransactions(mapped as Transaction[]);
            }
        } catch (e) {
            console.error('Error loading transactions:', e);
        }
        setLoading(false);
    }, [dateRange, filterStatus, filterCategory, filterSource]);

    useEffect(() => { loadTransactions(); }, [loadTransactions]);

    function openRefundModal(tx: Transaction) {
        setRefundTarget(tx);
        setRefundFeePercent(10);
        setRefundReason('');
        setShowRefundModal(true);
    }

    async function processRefund() {
        if (!refundTarget) return;
        if (!refundReason) { toastError('환불 사유를 입력해주세요.'); return; }

        setProcessing(true);
        try {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const feeAmount = Math.round(Number(refundTarget.amount) * refundFeePercent / 100);
            const refundAmount = Number(refundTarget.amount) - feeAmount;

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/cancel-payment`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({
                        transactionId: refundTarget.id,
                        cancelReason: refundReason,
                        cancelAmount: refundAmount
                    })
                }
            );

            const result = await response.json();
            if (response.ok) {
                success('환불 처리가 완료되었습니다.');
                setShowRefundModal(false);
                setRefundTarget(null);
                loadTransactions();
            } else {
                throw new Error(result.error || '환불 실패');
            }
        } catch (err: any) {
            toastError(err.message);
        } finally {
            setProcessing(false);
        }
    }

    const filteredTransactions = transactions.filter((t) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            t.members?.name?.toLowerCase().includes(term) ||
            t.members?.email?.toLowerCase().includes(term) ||
            t.order_id?.toLowerCase().includes(term) ||
            t.payment_key?.toLowerCase().includes(term)
        );
    });

    const totalRevenue = transactions.filter(t => t.payment_status === 'completed' && t.transaction_type === 'purchase').reduce((sum, t) => sum + Number(t.amount), 0);
    const totalRefund = transactions.filter(t => t.payment_status === 'refunded' || t.transaction_type === 'refund').reduce((sum, t) => sum + Number(t.amount), 0);
    const txCount = transactions.length;

    function downloadTransactionsCSV() {
        if (filteredTransactions.length === 0) return;
        const rows = [['Date', 'Member', 'Email', 'Type', 'Category', 'Source', 'Status', 'Amount']];
        filteredTransactions.forEach(t => rows.push([
            t.created_at?.split('T')[0] || '', t.members?.name || '', t.members?.email || '',
            t.transaction_type || '', t.category || '', t.source || 'Offline',
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
                actions={<button onClick={downloadTransactionsCSV} disabled={filteredTransactions.length === 0} className="admin-action-btn disabled:opacity-40">⬇ CSV Download</button>}
            />

            <div className="p-10 max-w-[1400px] mx-auto">
                <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                        <input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} className="admin-search-input" />
                        <span className="text-white/20">~</span>
                        <input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} className="admin-search-input" />
                    </div>
                </div>

                <div className="grid grid-cols-12 gap-6 mb-10">
                    {[
                        { label: 'Total Revenue', value: `₩${(totalRevenue / 10000).toFixed(0)}만`, color: '#22C55E', sub: '완료 결제 합계' },
                        { label: 'Refunded', value: `₩${(totalRefund / 10000).toFixed(0)}만`, color: '#8B5CF6', sub: '환불 합계' },
                        { label: 'Transactions', value: txCount.toLocaleString(), color: 'var(--primary)', sub: '전체 건수' },
                    ].map((kpi, i) => (
                        <div key={i} className="col-span-12 md:col-span-4">
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

                <div className="flex flex-wrap items-center gap-4 mb-8">
                    <div className="flex gap-2">
                        {(['all', 'completed', 'pending', 'failed', 'refunded'] as const).map((f) => (
                            <button key={f} onClick={() => setFilterStatus(f)} className={`admin-filter-btn ${filterStatus === f ? 'active' : ''}`}>{f === 'all' ? '전체' : statusConfig[f]?.label || f}</button>
                        ))}
                    </div>
                    <div className="h-6 w-px bg-white/10"></div>
                    <div className="flex gap-2">
                        {(['all', 'online', 'offline'] as const).map((f) => (
                            <button key={f} onClick={() => setFilterSource(f)} className={`admin-filter-btn ${filterSource === f ? 'active' : ''}`}>{f === 'all' ? '전체' : f === 'online' ? '온라인' : '오프라인'}</button>
                        ))}
                    </div>
                    <div className="flex-1">
                        <input type="text" placeholder="회원명, 주문번호 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="admin-search-input" />
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-64"><div className="w-10 h-10 rounded-xl border-2 border-white/5 border-t-[var(--primary)] animate-spin"></div></div>
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
                                    <th className="text-left p-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">수로</th>
                                    <th className="text-left p-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">상태</th>
                                    <th className="text-right p-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">금액</th>
                                    <th className="p-4"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.map((t) => {
                                    const sc = statusConfig[t.payment_status] || statusConfig.pending;
                                    return (
                                        <tr key={t.id} className="hover:bg-white/[0.02] transition-colors group" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                            <td className="p-4 text-xs font-bold text-white">
                                                {new Date(t.created_at).toLocaleDateString('ko-KR')}
                                                <div className="text-[8px] text-white/30">{new Date(t.created_at).toLocaleTimeString('ko-KR')}</div>
                                            </td>
                                            <td className="p-4">
                                                <p className="text-xs font-bold text-white">{t.members?.name || 'Unknown'}</p>
                                                <p className="text-[9px] text-white/30">{t.members?.email || '-'}</p>
                                            </td>
                                            <td className="p-4 text-[9px] font-black uppercase text-white/40">{t.source || 'Offline'}</td>
                                            <td className="p-4">
                                                <span className="px-2.5 py-1 rounded-full text-[8px] font-black uppercase" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                                            </td>
                                            <td className="p-4 text-right text-sm font-black text-white">
                                                {t.transaction_type === 'refund' ? '-' : ''}₩{Number(t.amount).toLocaleString()}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => { setSelectedTx(t); setShowDetailModal(true); }} className="px-2 py-1.5 rounded-lg text-[7px] font-black uppercase tracking-widest bg-white/[0.03] border border-white/5 text-white/60 hover:text-white">Details</button>
                                                    {t.payment_status === 'completed' && t.transaction_type !== 'refund' && (
                                                        <button onClick={() => openRefundModal(t)} className="px-3 py-1.5 rounded-lg text-[7px] font-black uppercase tracking-widest bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20">환불</button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Refund Modal */}
                <AdminModal show={showRefundModal && !!refundTarget} onClose={() => { setShowRefundModal(false); setRefundTarget(null); }} title="환불 처리">
                    {refundTarget && (
                        <div className="space-y-5">
                            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[9px] text-[var(--text-muted)] uppercase">원거래 금액</span>
                                    <span className="text-lg font-black text-white">₩{Number(refundTarget.amount).toLocaleString()}</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">위약금 비율 (%)</label>
                                <div className="flex gap-2 mb-3">
                                    {[0, 5, 10, 20, 30].map(p => (
                                        <button key={p} onClick={() => setRefundFeePercent(p)} className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${refundFeePercent === p ? 'bg-purple-500/20 text-purple-400' : 'bg-white/[0.03] text-white/50'}`}>{p}%</button>
                                    ))}
                                </div>
                                <input type="number" value={refundFeePercent} onChange={(e) => setRefundFeePercent(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl text-sm text-white" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10 text-center">
                                    <p className="text-[8px] text-purple-400 uppercase mb-1">최종 환불액</p>
                                    <p className="text-lg font-black text-purple-400">₩{Math.round(Number(refundTarget.amount) * (1 - refundFeePercent / 100)).toLocaleString()}</p>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">환불 사유</label>
                                <input type="text" value={refundReason} onChange={(e) => setRefundReason(e.target.value)} placeholder="사유 입력" className="w-full px-4 py-3 rounded-xl text-sm text-white" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                            </div>
                        </div>
                    )}
                    <div className="flex gap-3 mt-8">
                        <button onClick={() => { setShowRefundModal(false); setRefundTarget(null); }} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white">취소</button>
                        <button onClick={processRefund} disabled={processing} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white bg-[#8B5CF6]">{processing ? '처리 중...' : '환불 승인'}</button>
                    </div>
                </AdminModal>

                {/* Detail Modal */}
                <AdminModal show={showDetailModal && !!selectedTx} onClose={() => { setShowDetailModal(false); setSelectedTx(null); }} title="Details">
                    {selectedTx && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-white/[0.02] rounded-lg">
                                    <p className="text-[7px] text-white/30 uppercase">Order ID</p>
                                    <p className="text-[10px] text-white font-mono truncate">{selectedTx.order_id || selectedTx.id}</p>
                                </div>
                                <div className="p-3 bg-white/[0.02] rounded-lg">
                                    <p className="text-[7px] text-white/30 uppercase">Source</p>
                                    <p className="text-[10px] text-white uppercase">{selectedTx.source || 'Offline'}</p>
                                </div>
                            </div>
                            {selectedTx.receipt_url && (
                                <a href={selectedTx.receipt_url} target="_blank" rel="noopener noreferrer" className="block p-3 bg-[var(--primary)]/10 text-[var(--primary)] text-[10px] font-black text-center rounded-lg uppercase">영수증 보기</a>
                            )}
                            <div className="p-3 bg-black/20 rounded-lg">
                                <p className="text-[7px] text-white/30 uppercase mb-2">Raw Metadata</p>
                                <pre className="text-[8px] text-white/20 overflow-auto max-h-[200px]">{JSON.stringify(selectedTx.toss_raw_data, null, 2)}</pre>
                            </div>
                        </div>
                    )}
                </AdminModal>
            </div>
        </div>
    );
}
