'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { query, rpc } from '@/lib/supabase/query';
import AdminPageHeader from '@/components/layout/AdminPageHeader';
import AdminModal from '@/components/layout/AdminModal';
import { IconCreditCard } from '@/components/icons/AdminIcons';

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
    membership_plans?: { id: string; name: string; type: string; price: number; duration_days: number; credit_count: number; max_pauses?: number };
    pause_count?: number;
    paused_at?: string | null;
    pause_reason?: string | null;
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

    // T1-3: Hold modal state
    const [showHoldModal, setShowHoldModal] = useState(false);
    const [holdTarget, setHoldTarget] = useState<Membership | null>(null);
    const [holdReason, setHoldReason] = useState('');
    // T1-3: Custom extension
    const [showExtendModal, setShowExtendModal] = useState(false);
    const [extendTarget, setExtendTarget] = useState<Membership | null>(null);
    const [extendDays, setExtendDays] = useState(30);

    const loadData = useCallback(async () => {
        setLoading(true);

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let msQuery: any = query('memberships')
                .select('*, members!memberships_member_id_fkey(id, name, email, phone), membership_plans(id, name, type, price, duration_days, credit_count, max_pauses)')
                .order('created_at', { ascending: false });

            if (filter !== 'all') {
                msQuery = msQuery.eq('status', filter);
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const [msRes, membersRes, plansRes]: any[] = await Promise.all([
                msQuery,
                query('members').select('id, name, email').order('name'),
                query('membership_plans').select('*').order('price'),
            ]);

            if (msRes.error) {
                console.warn('Memberships JOIN error, trying fallback:', msRes.error.message);
                // Fallback: query without explicit FK name
                let fallbackQ: any = query('memberships')
                    .select('*, members(id, name, email, phone), membership_plans(id, name, type, price, duration_days, credit_count, max_pauses)')
                    .order('created_at', { ascending: false });
                if (filter !== 'all') fallbackQ = fallbackQ.eq('status', filter);
                const { data: fallbackData, error: fallbackError } = await fallbackQ;
                if (fallbackError) {
                    console.warn('Memberships fallback also failed, trying raw:', fallbackError.message);
                    // Final fallback: no joins
                    let rawQ: any = query('memberships').select('*').order('created_at', { ascending: false });
                    if (filter !== 'all') rawQ = rawQ.eq('status', filter);
                    const { data: rawData } = await rawQ;
                    if (rawData) setMemberships(rawData as any);
                } else {
                    if (fallbackData) setMemberships(fallbackData as any);
                }
            } else {
                if (msRes.data) setMemberships(msRes.data as any);
            }
            if (membersRes.data) setMembers(membersRes.data as any);
            if (plansRes.data) setPlans(plansRes.data as any);
        } catch (e) {
            console.error('Error loading memberships:', e);
        }
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
        const plan = plans.find(p => p.id === createForm.plan_id);
        if (!plan) return;

        const startDate = new Date(createForm.start_date);
        const endDate = plan.duration_days ? new Date(startDate.getTime() + plan.duration_days * 86400000) : null;

        await query('memberships').insert({
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

    // T1-3: Proper hold/resume with pause_count, paused_at, and duration extension
    async function toggleHold(ms: Membership) {
        if (ms.status === 'active') {
            // Check max_pauses
            const maxPauses = ms.membership_plans?.max_pauses ?? 99;
            const currentPauses = ms.pause_count ?? 0;
            if (currentPauses >= maxPauses) {
                alert(`최대 홀딩 횟수(${maxPauses}회)를 초과했습니다.`);
                return;
            }
            // Open hold reason modal
            setHoldTarget(ms);
            setHoldReason('');
            setShowHoldModal(true);
        } else if (ms.status === 'expired' || ms.status === 'paused') {
            // Resume: extend end_date by paused duration
            let newEndDate = ms.end_date;
            if (ms.paused_at && ms.end_date) {
                const pausedMs = Date.now() - new Date(ms.paused_at).getTime();
                const pausedDays = Math.ceil(pausedMs / 86400000);
                const extEnd = new Date(new Date(ms.end_date).getTime() + pausedDays * 86400000);
                newEndDate = extEnd.toISOString().split('T')[0];
            }
            await query('memberships').update({ status: 'active', paused_at: null, pause_reason: null, end_date: newEndDate }).eq('id', ms.id);
            loadData();
        }
    }

    async function adjustCredits() {
        if (!selectedMembership || creditAdjust === 0) return;
        const newCredits = (selectedMembership.remaining_credits || 0) + creditAdjust;
        await query('memberships').update({ remaining_credits: Math.max(0, newCredits) }).eq('id', selectedMembership.id);
        setShowCreditModal(false);
        setSelectedMembership(null);
        setCreditAdjust(0);
        setCreditReason('');
        loadData();
    }

    // T1-3: Confirm hold with reason
    async function confirmHold() {
        if (!holdTarget) return;
        await query('memberships').update({
            status: 'paused',
            paused_at: new Date().toISOString(),
            pause_count: (holdTarget.pause_count ?? 0) + 1,
            pause_reason: holdReason || null,
        }).eq('id', holdTarget.id);
        setShowHoldModal(false);
        setHoldTarget(null);
        loadData();
    }

    // T1-3: Custom day extension
    async function extendMembership(ms: Membership, days: number) {
        if (!ms.end_date) return;
        const newEnd = new Date(new Date(ms.end_date).getTime() + days * 86400000);
        await query('memberships').update({ end_date: newEnd.toISOString().split('T')[0] }).eq('id', ms.id);
        loadData();
    }

    function openExtendModal(ms: Membership) {
        setExtendTarget(ms);
        setExtendDays(30);
        setShowExtendModal(true);
    }

    function getDaysRemaining(endDate: string | null) {
        if (!endDate) return null;
        const diff = new Date(endDate).getTime() - new Date().getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
        active: { bg: 'rgba(34, 197, 94, 0.15)', color: '#22C55E', label: '활성' },
        paused: { bg: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', label: '홀딩' },
        expired: { bg: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', label: '만료' },
        cancelled: { bg: 'rgba(107, 114, 128, 0.15)', color: '#9CA3AF', label: '취소' },
    };

    return (
        <div className="transition-all duration-500">
            <AdminPageHeader
                category="User & Finance"
                title="Memberships"
                subtitle="Subscriptions"
                actions={<button onClick={() => setShowCreateModal(true)} className="admin-action-btn">+ 신규 멤버십</button>}
            />

            <div className="p-10 max-w-[1400px] mx-auto">
                {/* Filters */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="flex gap-2">
                        {(['all', 'active', 'expired', 'cancelled'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`admin-filter-btn ${filter === f ? 'active' : ''}`}
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
                            className="admin-search-input"
                        />
                    </div>
                    <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                        {filteredMemberships.length}건
                    </span>
                </div>

                {/* Table */}

                {
                    loading ? (
                        <div className="flex justify-center py-64">
                            <div className="w-10 h-10 rounded-xl border-2 border-white/5 border-t-[var(--primary)] animate-spin"></div>
                        </div>
                    ) : filteredMemberships.length === 0 ? (
                        <div className="glass-card p-20 flex flex-col items-center justify-center text-center opacity-40">
                            <span className="text-4xl mb-4"><IconCreditCard size={40} /></span>
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
                                                    onClick={() => openExtendModal(ms)}
                                                    className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all"
                                                >
                                                    연장
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
                                            {ms.status === 'paused' && ms.paused_at && (
                                                <span className="text-[7px] text-yellow-500/60 ml-1">
                                                    {Math.ceil((Date.now() - new Date(ms.paused_at).getTime()) / 86400000)}일째
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )
                }

                {/* Create Membership Modal */}
                <AdminModal show={showCreateModal} onClose={() => setShowCreateModal(false)} title="새 멤버십 추가">
                    <div className="space-y-5">
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">회원 선택</label>
                            <select
                                value={createForm.member_id}
                                onChange={(e) => setCreateForm({ ...createForm, member_id: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
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
                                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
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
                                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 mt-8">
                        <button onClick={() => setShowCreateModal(false)} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/[0.06] transition-all" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>취소</button>
                        <button onClick={createMembership} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all" style={{ background: 'var(--primary)', boxShadow: '0 0 20px rgba(255,107,0,0.3)' }}>생성</button>
                    </div>
                </AdminModal>

                {/* Credit Adjustment Modal */}
                <AdminModal show={showCreditModal && !!selectedMembership} onClose={() => { setShowCreditModal(false); setSelectedMembership(null); }} title="크레딧 조정" subtitle={selectedMembership ? `${selectedMembership.members?.name} · 현재 ${selectedMembership.remaining_credits}회` : ''}>
                    <div className="space-y-5">
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">조정 수량 (+ 증가 / - 감소)</label>
                            <input
                                type="number"
                                value={creditAdjust}
                                onChange={(e) => setCreditAdjust(Number(e.target.value))}
                                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">사유</label>
                            <input
                                type="text"
                                value={creditReason}
                                onChange={(e) => setCreditReason(e.target.value)}
                                placeholder="예: 보정, 환불, 프로모션 등"
                                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                            />
                        </div>
                        {selectedMembership && (
                            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                                <p className="text-[10px] text-[var(--text-muted)] mb-1">조정 후 크레딧</p>
                                <p className="text-2xl font-black text-white">{Math.max(0, (selectedMembership.remaining_credits || 0) + creditAdjust)}회</p>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-3 mt-8">
                        <button onClick={() => { setShowCreditModal(false); setSelectedMembership(null); }} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/[0.06] transition-all" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>취소</button>
                        <button onClick={adjustCredits} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all" style={{ background: 'var(--primary)', boxShadow: '0 0 20px rgba(255,107,0,0.3)' }}>적용</button>
                    </div>
                </AdminModal>

                {/* T1-3: Hold Reason Modal */}
                <AdminModal show={showHoldModal && !!holdTarget} onClose={() => { setShowHoldModal(false); setHoldTarget(null); }} title="멤버십 홀딩" subtitle={holdTarget ? `${holdTarget.members?.name} · 홀딩 ${(holdTarget.pause_count ?? 0)}/${holdTarget.membership_plans?.max_pauses ?? '∞'}회` : ''}>
                    <div className="space-y-5">
                        <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/10">
                            <p className="text-[10px] text-yellow-500 font-bold">⚠️ 홀딩 시 멤버십 기간이 정지됩니다. 재개 시 홀딩 기간만큼 자동 연장됩니다.</p>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">홀딩 사유 (선택)</label>
                            <input type="text" value={holdReason} onChange={(e) => setHoldReason(e.target.value)} placeholder="예: 부상, 출장, 개인사유" className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                        </div>
                    </div>
                    <div className="flex gap-3 mt-8">
                        <button onClick={() => { setShowHoldModal(false); setHoldTarget(null); }} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/[0.06] transition-all" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>취소</button>
                        <button onClick={confirmHold} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all" style={{ background: '#F59E0B', boxShadow: '0 0 20px rgba(245,158,11,0.3)' }}>홀딩 확인</button>
                    </div>
                </AdminModal>

                {/* T1-3: Custom Extension Modal */}
                <AdminModal show={showExtendModal && !!extendTarget} onClose={() => { setShowExtendModal(false); setExtendTarget(null); }} title="멤버십 연장" subtitle={extendTarget?.members?.name || ''}>
                    <div className="space-y-5">
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">연장 일수</label>
                            <div className="flex gap-2 mb-3">
                                {[7, 14, 30, 60, 90].map(d => (
                                    <button key={d} onClick={() => setExtendDays(d)} className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${extendDays === d ? 'bg-blue-500/20 border border-blue-500/30 text-blue-400' : 'bg-white/[0.03] border border-white/5 text-white/50'}`}>{d}일</button>
                                ))}
                            </div>
                            <input type="number" min={1} value={extendDays} onChange={(e) => setExtendDays(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                        </div>
                        {extendTarget?.end_date && (
                            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                                <p className="text-[10px] text-[var(--text-muted)] mb-1">연장 후 종료일</p>
                                <p className="text-lg font-black text-white">{new Date(new Date(extendTarget.end_date).getTime() + extendDays * 86400000).toLocaleDateString('ko-KR')}</p>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-3 mt-8">
                        <button onClick={() => { setShowExtendModal(false); setExtendTarget(null); }} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/[0.06] transition-all" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>취소</button>
                        <button onClick={() => { if (extendTarget) { extendMembership(extendTarget, extendDays); setShowExtendModal(false); setExtendTarget(null); } }} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all" style={{ background: 'var(--primary)', boxShadow: '0 0 20px rgba(255,107,0,0.3)' }}>연장 확인</button>
                    </div>
                </AdminModal>
            </div>
        </div>
    );
}
