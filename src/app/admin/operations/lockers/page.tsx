'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import AdminPageHeader from '@/components/layout/AdminPageHeader';
import AdminModal from '@/components/layout/AdminModal';
import { IconLock, IconEdit, IconTrash, IconUser, IconSearch } from '@/components/icons/AdminIcons';
import { useToast } from '@/components/ui/Toast';

// ─── Types ──────────────────────────────────────────────
interface Locker {
    id: string;
    facility_id: string | null;
    locker_number: string;
    size: 'S' | 'M' | 'L';
    status: 'available' | 'occupied' | 'broken' | 'maintenance';
    monthly_fee: number;
    note: string | null;
    assigned_member_id: string | null;
    assignment_start_date: string | null;
    assignment_end_date: string | null;
    created_at: string;
    // Joined
    member_name?: string;
    member_email?: string;
}

interface MemberOption {
    id: string;
    name: string;
    email: string;
}

type FilterStatus = 'all' | 'available' | 'occupied' | 'expiring' | 'broken';

// ─── Helpers ────────────────────────────────────────────
const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
    available: { color: '#22C55E', bg: 'rgba(34,197,94,0.15)', label: '사용가능' },
    occupied: { color: '#3B82F6', bg: 'rgba(59,130,246,0.15)', label: '사용중' },
    broken: { color: '#EF4444', bg: 'rgba(239,68,68,0.15)', label: '고장' },
    maintenance: { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', label: '정비중' },
};

const sizeLabels: Record<string, string> = { S: 'Small', M: 'Medium', L: 'Large' };

function getDaysUntil(dateStr: string | null): number | null {
    if (!dateStr) return null;
    const diff = new Date(dateStr).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ─── Component ──────────────────────────────────────────
export default function LockersPage() {
    const [lockers, setLockers] = useState<Locker[]>([]);
    const [loading, setLoading] = useState(true);
    const toast = useToast();
    const [filter, setFilter] = useState<FilterStatus>('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Modal states
    const [showLockerModal, setShowLockerModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [editingLocker, setEditingLocker] = useState<Locker | null>(null);
    const [assigningLocker, setAssigningLocker] = useState<Locker | null>(null);

    // Locker form
    const [lockerForm, setLockerForm] = useState({
        locker_number: '', size: 'M', monthly_fee: '0', note: '', status: 'available',
    });

    // Assign form
    const [assignForm, setAssignForm] = useState({
        member_id: '', start_date: new Date().toISOString().split('T')[0], end_date: '',
    });
    const [memberSearch, setMemberSearch] = useState('');
    const [memberOptions, setMemberOptions] = useState<MemberOption[]>([]);
    const [memberSearching, setMemberSearching] = useState(false);
    const [selectedMember, setSelectedMember] = useState<MemberOption | null>(null);

    // ─── Data Loading ───────────────────────────────────
    const loadLockers = useCallback(async () => {
        const supabase = createClient();
        setLoading(true);

        // Fetch lockers with member info via join
        const { data, error } = await (supabase as any)
            .from('lockers')
            .select('*, members!lockers_assigned_member_id_fkey(name, email)')
            .order('locker_number');

        if (data) {
            const mapped: Locker[] = data.map((d: Record<string, unknown>) => {
                const memberData = d.members as { name: string; email: string } | null;
                return {
                    ...d,
                    member_name: memberData?.name || undefined,
                    member_email: memberData?.email || undefined,
                } as Locker;
            });
            setLockers(mapped);
        }
        if (error) console.error('Error loading lockers:', error);
        setLoading(false);
    }, []);

    useEffect(() => { loadLockers(); }, [loadLockers]);

    // ─── Filtering ──────────────────────────────────────
    const filteredLockers = lockers.filter((l) => {
        // Status filter
        if (filter === 'available' && l.status !== 'available') return false;
        if (filter === 'occupied' && l.status !== 'occupied') return false;
        if (filter === 'broken' && (l.status !== 'broken' && l.status !== 'maintenance')) return false;
        if (filter === 'expiring') {
            const days = getDaysUntil(l.assignment_end_date);
            if (days === null || days > 7 || days < 0) return false;
        }

        // Search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            return (
                l.locker_number.toLowerCase().includes(term) ||
                (l.member_name && l.member_name.toLowerCase().includes(term))
            );
        }
        return true;
    });

    // ─── KPI Calculations ───────────────────────────────
    const totalLockers = lockers.length;
    const occupiedCount = lockers.filter((l) => l.status === 'occupied').length;
    const availableCount = lockers.filter((l) => l.status === 'available').length;
    const expiringCount = lockers.filter((l) => {
        const days = getDaysUntil(l.assignment_end_date);
        return days !== null && days >= 0 && days <= 7;
    }).length;

    // ─── Locker CRUD ────────────────────────────────────
    function openLockerModal(locker?: Locker) {
        if (locker) {
            setEditingLocker(locker);
            setLockerForm({
                locker_number: locker.locker_number,
                size: locker.size,
                monthly_fee: String(locker.monthly_fee || 0),
                note: locker.note || '',
                status: locker.status,
            });
        } else {
            setEditingLocker(null);
            setLockerForm({ locker_number: '', size: 'M', monthly_fee: '0', note: '', status: 'available' });
        }
        setShowLockerModal(true);
    }

    async function saveLocker() {
        if (!lockerForm.locker_number.trim()) {
            toast.warning('락커 번호를 입력해주세요.');
            return;
        }
        const supabase = createClient();
        const payload = {
            locker_number: lockerForm.locker_number,
            size: lockerForm.size,
            monthly_fee: Number(lockerForm.monthly_fee) || 0,
            note: lockerForm.note || null,
            status: lockerForm.status,
        };

        if (editingLocker) {
            await (supabase as any).from('lockers').update(payload).eq('id', editingLocker.id);
        } else {
            await (supabase as any).from('lockers').insert(payload);
        }
        setShowLockerModal(false);
        loadLockers();
    }

    async function deleteLocker(id: string) {
        if (!confirm('이 락커를 삭제하시겠습니까? 배정 이력도 함께 삭제됩니다.')) return;
        const supabase = createClient();
        await (supabase as any).from('lockers').delete().eq('id', id);
        loadLockers();
    }

    // ─── Assignment ─────────────────────────────────────
    function openAssignModal(locker: Locker) {
        setAssigningLocker(locker);
        setAssignForm({
            member_id: '',
            start_date: new Date().toISOString().split('T')[0],
            end_date: '',
        });
        setMemberSearch('');
        setMemberOptions([]);
        setSelectedMember(null);
        setShowAssignModal(true);
    }

    async function searchMembers(term: string) {
        setMemberSearch(term);
        if (term.length < 1) {
            setMemberOptions([]);
            return;
        }
        setMemberSearching(true);
        const supabase = createClient();
        const { data } = await (supabase as any)
            .from('members')
            .select('id, name, email')
            .or(`name.ilike.%${term}%,email.ilike.%${term}%`)
            .order('name')
            .limit(10);
        if (data) setMemberOptions(data);
        setMemberSearching(false);
    }

    function selectMember(m: MemberOption) {
        setSelectedMember(m);
        setAssignForm((prev) => ({ ...prev, member_id: m.id }));
        setMemberSearch(m.name);
        setMemberOptions([]);
    }

    async function assignLocker() {
        if (!assigningLocker || !assignForm.member_id || !assignForm.end_date) {
            toast.warning('회원과 종료일을 지정해주세요.');
            return;
        }
        const supabase = createClient();

        // 1. Update locker
        await (supabase as any).from('lockers').update({
            status: 'occupied',
            assigned_member_id: assignForm.member_id,
            assignment_start_date: assignForm.start_date,
            assignment_end_date: assignForm.end_date,
        }).eq('id', assigningLocker.id);

        // 2. Create assignment record
        await (supabase as any).from('locker_assignments').insert({
            locker_id: assigningLocker.id,
            member_id: assignForm.member_id,
            start_date: assignForm.start_date,
            end_date: assignForm.end_date,
            status: 'active',
        });

        // 3. Update member's locker info
        await (supabase as any).from('members').update({
            locker_number: assigningLocker.locker_number,
            locker_end_date: assignForm.end_date,
        }).eq('id', assignForm.member_id);

        setShowAssignModal(false);
        loadLockers();
    }

    async function releaseLocker(locker: Locker) {
        if (!confirm(`락커 ${locker.locker_number}번의 배정을 해제하시겠습니까?`)) return;
        const supabase = createClient();

        // 1. Update locker
        await (supabase as any).from('lockers').update({
            status: 'available',
            assigned_member_id: null,
            assignment_start_date: null,
            assignment_end_date: null,
        }).eq('id', locker.id);

        // 2. Update assignment record
        if (locker.assigned_member_id) {
            await (supabase as any).from('locker_assignments')
                .update({ status: 'released' })
                .eq('locker_id', locker.id)
                .eq('member_id', locker.assigned_member_id)
                .eq('status', 'active');

            // 3. Clear member's locker info
            await (supabase as any).from('members').update({
                locker_number: null,
                locker_end_date: null,
            }).eq('id', locker.assigned_member_id);
        }

        loadLockers();
    }

    // ─── Render ─────────────────────────────────────────
    const filterButtons: { key: FilterStatus; label: string }[] = [
        { key: 'all', label: '전체' },
        { key: 'available', label: '사용가능' },
        { key: 'occupied', label: '사용중' },
        { key: 'expiring', label: '만료예정' },
        { key: 'broken', label: '고장/정비' },
    ];

    return (
        <div className="transition-all duration-500">
            <AdminPageHeader
                category="Operations"
                title="Lockers"
                subtitle="management"
                actions={
                    <button onClick={() => openLockerModal()} className="admin-action-btn">
                        + 락커 추가
                    </button>
                }
            />

            <div className="p-10 max-w-[1400px] mx-auto">
                {/* KPI Cards */}
                <div className="grid grid-cols-4 gap-6 mb-8">
                    {[
                        { label: 'TOTAL LOCKERS', value: totalLockers, color: 'text-white' },
                        { label: 'OCCUPIED', value: occupiedCount, color: 'text-blue-400' },
                        { label: 'AVAILABLE', value: availableCount, color: 'text-green-400' },
                        { label: 'EXPIRING SOON', value: expiringCount, color: expiringCount > 0 ? 'text-amber-400' : 'text-white/30' },
                    ].map((kpi) => (
                        <div key={kpi.label} className="glass-card p-6">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mb-3">{kpi.label}</p>
                            <p className={`text-3xl font-black ${kpi.color}`}>{kpi.value}</p>
                        </div>
                    ))}
                </div>

                {/* Filters + Search */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="flex gap-2">
                        {filterButtons.map((f) => (
                            <button
                                key={f.key}
                                onClick={() => setFilter(f.key)}
                                className={`admin-filter-btn ${filter === f.key ? 'active' : ''}`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="락커 번호, 회원 이름으로 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="admin-search-input"
                        />
                    </div>
                    <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest whitespace-nowrap">
                        {filteredLockers.length}개
                    </span>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="flex justify-center py-40">
                        <div className="w-10 h-10 rounded-xl border-2 border-white/5 border-t-[var(--primary)] animate-spin"></div>
                    </div>
                ) : filteredLockers.length === 0 ? (
                    <div className="glass-card p-20 flex flex-col items-center justify-center text-center opacity-40">
                        <IconLock size={40} />
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] mt-4">
                            {lockers.length === 0 ? 'No lockers registered' : 'No lockers found'}
                        </p>
                    </div>
                ) : (
                    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        {/* Table Header */}
                        <div className="grid grid-cols-12 gap-4 px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/30" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <span className="col-span-1">번호</span>
                            <span className="col-span-1">크기</span>
                            <span className="col-span-1">상태</span>
                            <span className="col-span-2">배정 회원</span>
                            <span className="col-span-1 text-right">월 이용료</span>
                            <span className="col-span-2">시작일</span>
                            <span className="col-span-2">종료일</span>
                            <span className="col-span-2 text-right">액션</span>
                        </div>

                        {/* Table Rows */}
                        {filteredLockers.map((locker) => {
                            const sc = statusConfig[locker.status] || statusConfig.available;
                            const daysLeft = getDaysUntil(locker.assignment_end_date);
                            const isExpiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;

                            return (
                                <div
                                    key={locker.id}
                                    className="grid grid-cols-12 gap-4 items-center px-6 py-4 transition-all hover:bg-white/[0.02]"
                                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                                >
                                    {/* Number */}
                                    <div className="col-span-1">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-black"
                                                style={{
                                                    background: locker.status === 'occupied' ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)',
                                                    color: locker.status === 'occupied' ? '#3B82F6' : 'white',
                                                    border: `1px solid ${locker.status === 'occupied' ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.08)'}`,
                                                }}
                                            >
                                                {locker.locker_number}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Size */}
                                    <div className="col-span-1">
                                        <span className="text-xs text-white/60">{sizeLabels[locker.size]}</span>
                                    </div>

                                    {/* Status */}
                                    <div className="col-span-1">
                                        <span
                                            className="px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-wider"
                                            style={{ background: sc.bg, color: sc.color }}
                                        >
                                            {sc.label}
                                        </span>
                                    </div>

                                    {/* Assigned Member */}
                                    <div className="col-span-2">
                                        {locker.member_name ? (
                                            <div>
                                                <p className="text-sm font-bold text-white truncate">{locker.member_name}</p>
                                                <p className="text-[10px] text-white/40 truncate">{locker.member_email}</p>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-white/20 italic">미배정</span>
                                        )}
                                    </div>

                                    {/* Monthly Fee */}
                                    <div className="col-span-1 text-right">
                                        <span className="text-sm text-white">
                                            {locker.monthly_fee > 0 ? `₩${Number(locker.monthly_fee).toLocaleString()}` : '-'}
                                        </span>
                                    </div>

                                    {/* Start Date */}
                                    <div className="col-span-2">
                                        <span className="text-sm text-white/60">
                                            {locker.assignment_start_date || '-'}
                                        </span>
                                    </div>

                                    {/* End Date */}
                                    <div className="col-span-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-sm ${isExpiringSoon ? 'text-amber-400 font-bold' : 'text-white/60'}`}>
                                                {locker.assignment_end_date || '-'}
                                            </span>
                                            {isExpiringSoon && (
                                                <span className="px-2 py-0.5 rounded-full text-[7px] font-black uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                                    D-{daysLeft}
                                                </span>
                                            )}
                                            {daysLeft !== null && daysLeft < 0 && (
                                                <span className="px-2 py-0.5 rounded-full text-[7px] font-black uppercase bg-red-500/15 text-red-400 border border-red-500/30">
                                                    만료
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="col-span-2 flex gap-2 justify-end">
                                        {locker.status === 'available' && (
                                            <button
                                                onClick={() => openAssignModal(locker)}
                                                className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all"
                                                style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22C55E' }}
                                                title="배정"
                                            >
                                                <span className="inline-flex items-center gap-1"><IconUser size={10} /> 배정</span>
                                            </button>
                                        )}
                                        {locker.status === 'occupied' && (
                                            <button
                                                onClick={() => releaseLocker(locker)}
                                                className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all"
                                                style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#F59E0B' }}
                                                title="해제"
                                            >
                                                해제
                                            </button>
                                        )}
                                        <button
                                            onClick={() => openLockerModal(locker)}
                                            className="px-2.5 py-1.5 rounded-lg text-[8px] font-black transition-all"
                                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}
                                            title="수정"
                                        >
                                            <IconEdit size={12} />
                                        </button>
                                        <button
                                            onClick={() => deleteLocker(locker.id)}
                                            className="px-2.5 py-1.5 rounded-lg text-[8px] font-black transition-all"
                                            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}
                                            title="삭제"
                                        >
                                            <IconTrash size={12} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ===== Locker Create/Edit Modal ===== */}
            <AdminModal show={showLockerModal} onClose={() => setShowLockerModal(false)} title={editingLocker ? '락커 수정' : '새 락커 등록'}>
                <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">락커 번호 *</label>
                            <input
                                value={lockerForm.locker_number}
                                onChange={(e) => setLockerForm({ ...lockerForm, locker_number: e.target.value })}
                                placeholder="예: 001"
                                className="bcl-input w-full rounded-xl"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">크기</label>
                            <select
                                value={lockerForm.size}
                                onChange={(e) => setLockerForm({ ...lockerForm, size: e.target.value })}
                                className="bcl-input w-full rounded-xl"
                                style={{ colorScheme: 'dark' }}
                            >
                                <option value="S">Small</option>
                                <option value="M">Medium</option>
                                <option value="L">Large</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">월 이용료 (₩)</label>
                            <input
                                type="number"
                                value={lockerForm.monthly_fee}
                                onChange={(e) => setLockerForm({ ...lockerForm, monthly_fee: e.target.value })}
                                placeholder="0"
                                className="bcl-input w-full rounded-xl"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">상태</label>
                            <select
                                value={lockerForm.status}
                                onChange={(e) => setLockerForm({ ...lockerForm, status: e.target.value })}
                                className="bcl-input w-full rounded-xl"
                                style={{ colorScheme: 'dark' }}
                            >
                                <option value="available">사용가능</option>
                                <option value="broken">고장</option>
                                <option value="maintenance">정비중</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">비고</label>
                        <textarea
                            value={lockerForm.note}
                            onChange={(e) => setLockerForm({ ...lockerForm, note: e.target.value })}
                            rows={2}
                            placeholder="추가 메모..."
                            className="bcl-input w-full rounded-xl resize-none"
                        />
                    </div>
                </div>
                <div className="flex gap-3 mt-8">
                    <button
                        onClick={() => setShowLockerModal(false)}
                        className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/[0.06] transition-all"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                    >
                        취소
                    </button>
                    <button
                        onClick={saveLocker}
                        className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all"
                        style={{ background: 'var(--primary)', boxShadow: '0 0 20px rgba(255,107,0,0.3)' }}
                    >
                        저장
                    </button>
                </div>
            </AdminModal>

            {/* ===== Assign Modal ===== */}
            <AdminModal show={showAssignModal} onClose={() => setShowAssignModal(false)} title={`락커 ${assigningLocker?.locker_number || ''}번 배정`} subtitle="회원에게 락커를 배정합니다">
                <div className="space-y-5">
                    {/* Member Search */}
                    <div>
                        <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">회원 검색 *</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={memberSearch}
                                onChange={(e) => searchMembers(e.target.value)}
                                placeholder="이름 또는 이메일로 검색..."
                                className="bcl-input w-full rounded-xl pl-10"
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">
                                <IconSearch size={14} />
                            </span>

                            {/* Dropdown */}
                            {memberOptions.length > 0 && (
                                <div
                                    className="absolute z-50 w-full mt-2 rounded-xl overflow-hidden"
                                    style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                                >
                                    {memberOptions.map((m) => (
                                        <button
                                            key={m.id}
                                            onClick={() => selectMember(m)}
                                            className="w-full text-left px-4 py-3 hover:bg-white/[0.05] transition-all flex justify-between items-center"
                                            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                                        >
                                            <div>
                                                <p className="text-sm font-bold text-white">{m.name}</p>
                                                <p className="text-[10px] text-white/40">{m.email}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {memberSearching && (
                                <div className="absolute z-50 w-full mt-2 py-4 text-center rounded-xl" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <div className="w-5 h-5 border border-white/20 border-t-[var(--primary)] rounded-full animate-spin mx-auto"></div>
                                </div>
                            )}
                        </div>

                        {/* Selected member badge */}
                        {selectedMember && (
                            <div className="mt-3 flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black" style={{ background: 'rgba(59,130,246,0.2)', color: '#3B82F6' }}>
                                    {selectedMember.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-white">{selectedMember.name}</p>
                                    <p className="text-[10px] text-white/40">{selectedMember.email}</p>
                                </div>
                                <button
                                    onClick={() => { setSelectedMember(null); setAssignForm(p => ({ ...p, member_id: '' })); setMemberSearch(''); }}
                                    className="text-[8px] font-black text-red-400 uppercase"
                                >
                                    변경
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">시작일</label>
                            <input
                                type="date"
                                value={assignForm.start_date}
                                onChange={(e) => setAssignForm({ ...assignForm, start_date: e.target.value })}
                                className="admin-search-input w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">종료일 *</label>
                            <input
                                type="date"
                                value={assignForm.end_date}
                                onChange={(e) => setAssignForm({ ...assignForm, end_date: e.target.value })}
                                className="admin-search-input w-full"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 mt-8">
                    <button
                        onClick={() => setShowAssignModal(false)}
                        className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/[0.06] transition-all"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                    >
                        취소
                    </button>
                    <button
                        onClick={assignLocker}
                        disabled={!assignForm.member_id || !assignForm.end_date}
                        className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all disabled:opacity-40"
                        style={{ background: 'var(--primary)', boxShadow: '0 0 20px rgba(255,107,0,0.3)' }}
                    >
                        배정 확정
                    </button>
                </div>
            </AdminModal>
        </div>
    );
}
