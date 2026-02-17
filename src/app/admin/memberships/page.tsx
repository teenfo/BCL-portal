'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Membership {
    id: string;
    member_id: string;
    plan_id: string;
    start_date: string;
    end_date: string | null;
    remaining_credits: number | null;
    status: string;
    created_at: string;
    members?: { id: string; name: string; email: string; phone: string };
    membership_plans?: { id: string; name: string; type: string; price: number; duration_days: number; credit_count: number };
}

interface Member {
    id: string;
    name: string;
    email: string;
}

interface Plan {
    id: string;
    name: string;
    type: string;
    price: number;
    duration_days: number;
    credit_count: number;
}

export default function MembershipsPage() {
    const [memberships, setMemberships] = useState<Membership[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'active' | 'expired' | 'cancelled'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showCreditModal, setShowCreditModal] = useState(false);
    const [selectedMembership, setSelectedMembership] = useState<Membership | null>(null);
    const [creditAdjust, setCreditAdjust] = useState(0);
    const [creditReason, setCreditReason] = useState('');
    const [createForm, setCreateForm] = useState({ member_id: '', plan_id: '', start_date: new Date().toISOString().split('T')[0] });

    const loadData = useCallback(async () => {
        const supabase = createClient();
        setLoading(true);

        let query = supabase
            .from('memberships')
            .select('*, members(id, name, email, phone), membership_plans(id, name, type, price, duration_days, credit_count)')
            .order('created_at', { ascending: false });

        if (filter !== 'all') {
            query = query.eq('status', filter);
        }

        const [msRes, membersRes, plansRes] = await Promise.all([
            query,
            supabase.from('members').select('id, name, email').order('name'),
            supabase.from('membership_plans').select('*').eq('is_active', true).order('price'),
        ]);

        if (msRes.data) setMemberships(msRes.data);
        if (membersRes.data) setMembers(membersRes.data);
        if (plansRes.data) setPlans(plansRes.data);
        setLoading(false);
    }, [filter]);

    useEffect(() => { loadData(); }, [loadData]);

    const filteredMemberships = memberships.filter((ms) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            ms.members?.name?.toLowerCase().includes(term) ||
            ms.members?.email?.toLowerCase().includes(term) ||
            ms.membership_plans?.name?.toLowerCase().includes(term)
        );
    });

    async function createMembership() {
        if (!createForm.member_id || !createForm.plan_id) return;
        const supabase = createClient();
        const plan = plans.find(p => p.id === createForm.plan_id);
        if (!plan) return;

        const startDate = new Date(createForm.start_date);
        const endDate = plan.duration_days ? new Date(startDate.getTime() + plan.duration_days * 86400000) : null;

        await supabase.from('memberships').insert({
            member_id: createForm.member_id,
            plan_id: createForm.plan_id,
            start_date: createForm.start_date,
            end_date: endDate?.toISOString().split('T')[0] || null,
            remaining_credits: plan.type === 'count' ? plan.credit_count : null,
            status: 'active',
        });

        setShowCreateModal(false);
        setCreateForm({ member_id: '', plan_id: '', start_date: new Date().toISOString().split('T')[0] });
        loadData();
    }

    async function toggleHold(ms: Membership) {
        const supabase = createClient();
        const newStatus = ms.status === 'active' ? 'expired' : 'active';
        await supabase.from('memberships').update({ status: newStatus }).eq('id', ms.id);
        loadData();
    }

    async function adjustCredits() {
        if (!selectedMembership || creditAdjust === 0) return;
        const supabase = createClient();
        const newCredits = (selectedMembership.remaining_credits || 0) + creditAdjust;
        await supabase.from('memberships').update({ remaining_credits: Math.max(0, newCredits) }).eq('id', selectedMembership.id);
        setShowCreditModal(false);
        setSelectedMembership(null);
        setCreditAdjust(0);
        setCreditReason('');
        loadData();
    }

    async function extendMembership(ms: Membership, days: number) {
        if (!ms.end_date) return;
        const supabase = createClient();
        const newEnd = new Date(new Date(ms.end_date).getTime() + days * 86400000);
        await supabase.from('memberships').update({ end_date: newEnd.toISOString().split('T')[0] }).eq('id', ms.id);
        loadData();
    }

    function getDaysRemaining(endDate: string | null) {
        if (!endDate) return null;
        const diff = new Date(endDate).getTime() - new Date().getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
        active: { bg: 'rgba(34, 197, 94, 0.15)', color: '#22C55E', label: '활성' },
        expired: { bg: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', label: '만료' },
        cancelled: { bg: 'rgba(107, 114, 128, 0.15)', color: '#9CA3AF', label: '취소' },
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
                            Memberships <span className="opacity-20 font-light ml-2">Management</span>
                        </h1>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        style={{ background: 'var(--primary)', color: '#fff', boxShadow: '0 0 20px rgba(255, 107, 0, 0.3)' }}
                    >
                        + 멤버십 추가
                    </button>
                </div>
            </header>

            {/* Filters */}
            <div className="flex items-center gap-4 mb-8">
                <div className="flex gap-2">
                    {(['all', 'active', 'expired', 'cancelled'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filter === f
                                ? 'bg-[var(--primary)] text-white shadow-[0_0_15px_rgba(255,107,0,0.3)]'
                                : 'bg-white/[0.03] border border-white/5 text-[var(--text-muted)] hover:text-white'
                                }`}
                        >
                            {f === 'all' ? '전체' : f === 'active' ? '활성' : f === 'expired' ? '만료' : '취소'}
                        </button>
                    ))}
                </div>
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="회원명, 이메일, 플랜명으로 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-white placeholder-[var(--text-muted)] outline-none focus:border-[var(--primary)]/50 transition-all"
                    />
                </div>
                <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                    {filteredMemberships.length}건
                </span>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex justify-center py-64">
                    <div className="w-10 h-10 rounded-xl border-2 border-white/5 border-t-[var(--primary)] animate-spin"></div>
                </div>
            ) : filteredMemberships.length === 0 ? (
                <div className="glass-card p-20 flex flex-col items-center justify-center text-center opacity-40">
                    <span className="text-4xl mb-4">💳</span>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em]">No memberships found</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredMemberships.map((ms) => {
                        const days = getDaysRemaining(ms.end_date);
                        const sc = statusConfig[ms.status] || statusConfig.cancelled;
                        return (
                            <div key={ms.id} className="grid grid-cols-12 gap-4 items-center p-5 rounded-2xl bg-white/[0.02] border border-white/[0.03] hover:border-white/10 transition-all group">
                                {/* Member Info */}
                                <div className="col-span-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-black" style={{ background: 'linear-gradient(135deg, rgba(255,107,0,0.3), rgba(255,107,0,0.1))', color: 'var(--primary)' }}>
                                            {ms.members?.name?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-white group-hover:text-[var(--primary)] transition-colors">{ms.members?.name || 'Unknown'}</h4>
                                            <p className="text-[9px] text-[var(--text-muted)] mt-0.5">{ms.members?.email}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Plan */}
                                <div className="col-span-2">
                                    <p className="text-xs font-bold text-white uppercase">{ms.membership_plans?.name || '-'}</p>
                                    <p className="text-[9px] text-[var(--primary)] mt-0.5 font-bold">
                                        ₩{ms.membership_plans?.price?.toLocaleString() || 0}
                                    </p>
                                </div>

                                {/* Period */}
                                <div className="col-span-2">
                                    <p className="text-[10px] text-white font-bold">{ms.start_date} ~ {ms.end_date || '∞'}</p>
                                    {days !== null && (
                                        <p className="text-[9px] font-bold mt-0.5" style={{ color: days > 14 ? '#22C55E' : days > 0 ? '#F59E0B' : '#EF4444' }}>
                                            {days > 0 ? `D-${days}` : days === 0 ? '오늘 만료' : `${Math.abs(days)}일 지남`}
                                        </p>
                                    )}
                                </div>

                                {/* Credits */}
                                <div className="col-span-1 text-center">
                                    {ms.remaining_credits !== null ? (
                                        <div>
                                            <p className="text-lg font-black text-white">{ms.remaining_credits}</p>
                                            <p className="text-[8px] text-[var(--text-muted)] uppercase tracking-widest">크레딧</p>
                                        </div>
                                    ) : (
                                        <p className="text-[9px] text-[var(--text-muted)]">기간제</p>
                                    )}
                                </div>

                                {/* Status */}
                                <div className="col-span-1">
                                    <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase" style={{ background: sc.bg, color: sc.color }}>
                                        {sc.label}
                                    </span>
                                </div>

                                {/* Actions */}
                                <div className="col-span-3 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {ms.remaining_credits !== null && (
                                        <button
                                            onClick={() => { setSelectedMembership(ms); setShowCreditModal(true); }}
                                            className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-white/[0.03] border border-white/5 text-white hover:border-[var(--primary)]/50 transition-all"
                                        >
                                            크레딧 조정
                                        </button>
                                    )}
                                    {ms.end_date && ms.status === 'active' && (
                                        <button
                                            onClick={() => extendMembership(ms, 30)}
                                            className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all"
                                        >
                                            +30일 연장
                                        </button>
                                    )}
                                    <button
                                        onClick={() => toggleHold(ms)}
                                        className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${ms.status === 'active'
                                            ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/20'
                                            : 'bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20'
                                            }`}
                                    >
                                        {ms.status === 'active' ? '홀딩' : '재개'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Membership Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
                    <div className="glass-card p-8 rounded-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight mb-8">새 멤버십 추가</h2>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">회원 선택</label>
                                <select
                                    value={createForm.member_id}
                                    onChange={(e) => setCreateForm({ ...createForm, member_id: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-white outline-none focus:border-[var(--primary)]/50"
                                >
                                    <option value="">회원을 선택하세요</option>
                                    {members.map((m) => (
                                        <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">요금제</label>
                                <select
                                    value={createForm.plan_id}
                                    onChange={(e) => setCreateForm({ ...createForm, plan_id: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-white outline-none focus:border-[var(--primary)]/50"
                                >
                                    <option value="">요금제를 선택하세요</option>
                                    {plans.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name} - ₩{p.price.toLocaleString()} ({p.type === 'period' ? `${p.duration_days}일` : `${p.credit_count}회`})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">시작일</label>
                                <input
                                    type="date"
                                    value={createForm.start_date}
                                    onChange={(e) => setCreateForm({ ...createForm, start_date: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-white outline-none focus:border-[var(--primary)]/50"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <button onClick={() => setShowCreateModal(false)} className="flex-1 py-3 rounded-xl bg-white/[0.03] border border-white/5 text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/[0.06] transition-all">취소</button>
                            <button onClick={createMembership} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all" style={{ background: 'var(--primary)', boxShadow: '0 0 20px rgba(255,107,0,0.3)' }}>생성</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Credit Adjustment Modal */}
            {showCreditModal && selectedMembership && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowCreditModal(false)}>
                    <div className="glass-card p-8 rounded-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight mb-2">크레딧 조정</h2>
                        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest mb-8">
                            {selectedMembership.members?.name} · 현재 {selectedMembership.remaining_credits}회
                        </p>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">조정 수량 (+ 증가 / - 감소)</label>
                                <input
                                    type="number"
                                    value={creditAdjust}
                                    onChange={(e) => setCreditAdjust(Number(e.target.value))}
                                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-white outline-none focus:border-[var(--primary)]/50"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">사유</label>
                                <input
                                    type="text"
                                    value={creditReason}
                                    onChange={(e) => setCreditReason(e.target.value)}
                                    placeholder="예: 보정, 환불, 프로모션 등"
                                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-white placeholder-[var(--text-muted)] outline-none focus:border-[var(--primary)]/50"
                                />
                            </div>
                            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                                <p className="text-[10px] text-[var(--text-muted)] mb-1">조정 후 크레딧</p>
                                <p className="text-2xl font-black text-white">{Math.max(0, (selectedMembership.remaining_credits || 0) + creditAdjust)}회</p>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <button onClick={() => { setShowCreditModal(false); setSelectedMembership(null); }} className="flex-1 py-3 rounded-xl bg-white/[0.03] border border-white/5 text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/[0.06] transition-all">취소</button>
                            <button onClick={adjustCredits} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all" style={{ background: 'var(--primary)', boxShadow: '0 0 20px rgba(255,107,0,0.3)' }}>적용</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
