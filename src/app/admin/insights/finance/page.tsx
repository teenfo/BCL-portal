'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import AdminPageHeader from '@/components/layout/AdminPageHeader';
import { IconBarChart, IconDollar, IconClipboard } from '@/components/icons/AdminIcons';

interface MonthlyRevenue {
    month: string;
    revenue: number;
    refund: number;
}

interface CategoryRevenue {
    category: string;
    amount: number;
}

export default function FinanceReportPage() {
    const [period, setPeriod] = useState<'3m' | '6m' | '12m'>('6m');
    const [monthlyData, setMonthlyData] = useState<MonthlyRevenue[]>([]);
    const [categoryData, setCategoryData] = useState<CategoryRevenue[]>([]);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [totalRefund, setTotalRefund] = useState(0);
    const [avgMonthly, setAvgMonthly] = useState(0);
    const [growthRate, setGrowthRate] = useState(0);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        const supabase = createClient();
        setLoading(true);

        const months = period === '3m' ? 3 : period === '6m' ? 6 : 12;
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);

        const { data: transactions }: any = await supabase
            .from('transactions')
            .select('amount, payment_status, transaction_type, category, created_at')
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: true });

        if (transactions && transactions.length > 0) {
            // Monthly aggregation
            const monthMap: Record<string, { revenue: number; refund: number }> = {};
            const catMap: Record<string, number> = {};

            transactions.forEach((t) => {
                const monthKey = new Date(t.created_at).toISOString().substring(0, 7);
                if (!monthMap[monthKey]) monthMap[monthKey] = { revenue: 0, refund: 0 };

                if (t.payment_status === 'completed' && t.transaction_type === 'purchase') {
                    monthMap[monthKey].revenue += Number(t.amount);
                    catMap[t.category] = (catMap[t.category] || 0) + Number(t.amount);
                }
                if (t.transaction_type === 'refund' || t.payment_status === 'refunded') {
                    monthMap[monthKey].refund += Number(t.amount);
                }
            });

            const monthly = Object.entries(monthMap).map(([month, data]) => ({ month, ...data }));
            const categories = Object.entries(catMap).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);

            setMonthlyData(monthly);
            setCategoryData(categories);

            const rev = transactions.filter(t => t.payment_status === 'completed' && t.transaction_type === 'purchase').reduce((s, t) => s + Number(t.amount), 0);
            const ref = transactions.filter(t => t.transaction_type === 'refund' || t.payment_status === 'refunded').reduce((s, t) => s + Number(t.amount), 0);
            setTotalRevenue(rev);
            setTotalRefund(ref);
            setAvgMonthly(Math.round(rev / months));

            if (monthly.length >= 2) {
                const last = monthly[monthly.length - 1].revenue;
                const prev = monthly[monthly.length - 2].revenue;
                setGrowthRate(prev > 0 ? ((last - prev) / prev) * 100 : 0);
            }
        } else {
            // No data available - show empty state
            setMonthlyData([]);
            setCategoryData([]);
            setTotalRevenue(0);
            setTotalRefund(0);
            setAvgMonthly(0);
            setGrowthRate(0);
        }

        setLoading(false);
    }, [period]);

    useEffect(() => { loadData(); }, [loadData]);

    const maxMonthlyRevenue = Math.max(...monthlyData.map(m => m.revenue), 1);
    const totalCategoryAmount = categoryData.reduce((s, c) => s + c.amount, 0) || 1;

    const categoryConfig: Record<string, { label: string; color: string }> = {
        membership: { label: '멤버십', color: '#FF6B00' },
        pt: { label: 'PT', color: '#3B82F6' },
        goods: { label: '상품', color: '#22C55E' },
        locker: { label: '락커', color: '#8B5CF6' },
        etc: { label: '기타', color: '#6B7280' },
    };

    // SVG bar chart
    function renderBarChart() {
        if (monthlyData.length === 0) return null;
        const w = 800, h = 200;
        const barWidth = (w / monthlyData.length) * 0.6;
        const gap = (w / monthlyData.length) * 0.4;

        return (
            <svg viewBox={`0 0 ${w} ${h + 30}`} className="w-full h-full" preserveAspectRatio="none">
                {[0, 50, 100, 150].map(y => (<line key={y} x1="0" y1={y} x2={w} y2={y} stroke="rgba(255,255,255,0.03)" />))}
                {monthlyData.map((m, i) => {
                    const x = i * (barWidth + gap) + gap / 2;
                    const barH = (m.revenue / maxMonthlyRevenue) * h * 0.85;
                    const refundH = (m.refund / maxMonthlyRevenue) * h * 0.85;
                    return (
                        <g key={m.month}>
                            <rect x={x} y={h - barH} width={barWidth * 0.7} height={barH} rx="4" fill="var(--primary)" opacity="0.8" />
                            <rect x={x + barWidth * 0.7 + 2} y={h - refundH} width={barWidth * 0.3 - 2} height={refundH} rx="3" fill="#8B5CF6" opacity="0.5" />
                            <text x={x + barWidth / 2} y={h + 18} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="9" fontWeight="bold">{m.month.substring(5)}</text>
                        </g>
                    );
                })}
            </svg>
        );
    }

    // T2-1: CSV Download helper
    function downloadCSV() {
        if (monthlyData.length === 0) return;
        const rows = [['Month', 'Revenue', 'Refund']];
        monthlyData.forEach(m => rows.push([m.month, String(m.revenue), String(m.refund)]));
        const csvContent = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `finance_${period}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <div className="transition-all duration-500">
            <AdminPageHeader
                category="Corporate Insights"
                title="Finance"
                subtitle="Dynamics"
            />

            <div className="p-10 max-w-[1400px] mx-auto">
                {/* Period Filter */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="flex gap-2">
                        {(['3m', '6m', '12m'] as const).map((p) => (
                            <button key={p} onClick={() => setPeriod(p)} className={`admin-filter-btn ${period === p ? 'active' : ''}`}>
                                {p.toUpperCase()}
                            </button>
                        ))}
                    </div>
                    <button onClick={downloadCSV} disabled={monthlyData.length === 0} className="admin-action-btn disabled:opacity-40">⬇ CSV 다운로드</button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-64"><div className="w-10 h-10 rounded-xl border-2 border-white/5 border-t-[var(--primary)] animate-spin"></div></div>
                ) : (
                    <div className="space-y-10">
                        {/* KPI Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
                            {[
                                { label: 'Total Revenue', value: `₩${(totalRevenue / 100000000).toFixed(1)}억`, sub: '총 매출', color: 'var(--primary)' },
                                { label: 'Avg Monthly', value: `₩${(avgMonthly / 10000).toFixed(0)}만`, sub: '월 평균', color: '#22C55E' },
                                { label: 'Growth Rate', value: `${growthRate >= 0 ? '+' : ''}${growthRate.toFixed(1)}%`, sub: '전월 대비', color: growthRate >= 0 ? '#22C55E' : '#EF4444' },
                                { label: 'Total Refund', value: `₩${(totalRefund / 10000).toFixed(0)}만`, sub: '환불 합계', color: '#8B5CF6' },
                            ].map((kpi, i) => (
                                <div key={i} className="kpi-card">
                                    <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">{kpi.label}</h4>
                                    <p className="text-3xl font-black text-white mt-4">{kpi.value}</p>
                                    <p className="text-[9px] font-bold mt-1 uppercase tracking-widest" style={{ color: kpi.color }}>{kpi.sub}</p>
                                </div>
                            ))}
                        </div>

                        {/* Monthly Bar Chart */}
                        <div className="glass-card p-8">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-black text-white uppercase tracking-tight inline-flex items-center gap-2"><IconBarChart size={20} /> Monthly Revenue vs Refund</h3>
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ background: 'var(--primary)' }}></span><span className="text-[9px] text-[var(--text-muted)] uppercase">Revenue</span></div>
                                    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-purple-500"></span><span className="text-[9px] text-[var(--text-muted)] uppercase">Refund</span></div>
                                </div>
                            </div>
                            <div className="h-[230px]">{renderBarChart()}</div>
                        </div>

                        {/* Category Breakdown */}
                        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                            <div className="glass-card p-8" style={{ flex: '2 1 400px', minWidth: 0 }}>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-8 inline-flex items-center gap-2"><IconDollar size={20} /> Revenue by Category</h3>
                                <div className="space-y-5">
                                    {categoryData.map((c) => {
                                        const cc = categoryConfig[c.category] || { label: c.category, color: '#6B7280' };
                                        const pct = ((c.amount / totalCategoryAmount) * 100).toFixed(1);
                                        return (
                                            <div key={c.category}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-bold text-white">{cc.label}</span>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs text-white/60">₩{(c.amount / 10000).toFixed(0)}만</span>
                                                        <span className="text-[10px] font-black" style={{ color: cc.color }}>{pct}%</span>
                                                    </div>
                                                </div>
                                                <div className="h-3 w-full bg-white/[0.05] rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: cc.color }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="glass-card p-8" style={{ flex: '1 1 280px', minWidth: 0 }}>
                                <h3 className="text-lg font-black text-white uppercase tracking-tight mb-6 inline-flex items-center gap-2"><IconClipboard size={18} /> Summary</h3>
                                <div className="space-y-4">
                                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                                        <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest mb-1">Net Revenue</p>
                                        <p className="text-2xl font-black text-white">₩{((totalRevenue - totalRefund) / 100000000).toFixed(2)}억</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                                        <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest mb-1">Refund Rate</p>
                                        <p className="text-2xl font-black text-purple-400">{totalRevenue > 0 ? ((totalRefund / totalRevenue) * 100).toFixed(1) : 0}%</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                                        <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest mb-1">Top Category</p>
                                        <p className="text-lg font-black text-[var(--primary)]">{categoryConfig[categoryData[0]?.category]?.label || '-'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
