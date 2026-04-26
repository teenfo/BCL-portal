'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { query, rpc } from '@/lib/supabase/query';
import Link from 'next/link';
import AdminModal from '@/components/layout/AdminModal';
import MemberContextPanel from '@/components/members/MemberContextPanel';
import { IconUser, IconBarChart, IconClipboard, IconCreditCard, IconNotes, IconEdit, IconLock } from '@/components/icons/AdminIcons';
import { useToast } from '@/components/ui/Toast';

interface Member {
    id: string;
    name: string;
    email: string;
    phone: string;
    gender: string;
    birthdate: string;
    status: string;
    plan?: string;
    credits?: number;
    joined_date: string;
    membership_start_date?: string;
    membership_end_date?: string;
    locker_number: string;
    locker_end_date: string;
    profile_image_url: string;
}

interface Checkin {
    id: string;
    time: string;
    facility: string;
    status: string;
}

interface Transaction {
    id: string;
    amount: number;
    status: string;
    date: string;
    method: string;
    category: string;
}

interface Note {
    id: string;
    content: string;
    created_at: string;
}

interface Membership {
    id: string;
    status: string;
    start_date: string;
    end_date: string;
    remaining_credits: number;
    pause_count: number;
    paused_at: string | null;
    pause_reason: string | null;
    membership_plans: {
        name: string;
        price: number;
        duration_days: number;
        credits: number;
        max_pauses: number;
    } | null;
}

export default function MemberDetailPage() {
    const params = useParams();
    const memberId = params.id as string;

    const [member, setMember] = useState<Member | null>(null);
    const [checkins, setCheckins] = useState<Checkin[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [notes, setNotes] = useState<Note[]>([]);
    const [memberships, setMemberships] = useState<Membership[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'payments' | 'notes'>('overview');
    const [newNote, setNewNote] = useState('');

    // T1-2: Edit member modal state
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', phone: '', gender: '', birthdate: '', status: '' });
    const [saving, setSaving] = useState(false);

    // T3-5: Membership Transfer state
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [selectedMembership, setSelectedMembership] = useState<Membership | null>(null);
    const [targetMemberSearch, setTargetMemberSearch] = useState('');
    const [targetMembers, setTargetMembers] = useState<any[]>([]);
    const [selectedTargetMember, setSelectedTargetMember] = useState<any | null>(null);
    const [transferring, setTransferring] = useState(false);

    // Inline editing states
    const [inlineEdit, setInlineEdit] = useState<string | null>(null); // 'ms_start' | 'ms_end' | 'locker_end' | 'locker_number'
    const [inlineValue, setInlineValue] = useState('');
    const [inlineSaving, setInlineSaving] = useState(false);

    // Locker assign from member detail state
    const [showLockerAssignModal, setShowLockerAssignModal] = useState(false);
    const [lockerAssignForm, setLockerAssignForm] = useState({ locker_number: '', start_date: new Date().toISOString().split('T')[0], end_date: '' });
    const [availableLockers, setAvailableLockers] = useState<{ id: string; locker_number: string; size: string }[]>([]);
    const [savingLocker, setSavingLocker] = useState(false);

    // Locker change modal state (for switching locker number)
    const [showLockerChangeModal, setShowLockerChangeModal] = useState(false);
    const [selectedNewLocker, setSelectedNewLocker] = useState('');

    // Locker release confirm modal state
    const [showLockerReleaseConfirm, setShowLockerReleaseConfirm] = useState(false);
    const [releasingLocker, setReleasingLocker] = useState(false);

    const { success, error: toastError } = useToast();

    useEffect(() => {
        loadMemberData();
    }, [memberId]);

    // T3-5: Search target members for transfer
    useEffect(() => {
        if (targetMemberSearch.length < 2) {
            setTargetMembers([]);
            return;
        }
        const delaySearch = setTimeout(async () => {
            const { data } = await query('members')

                .select('id, name, email')
                .ilike('name', `%${targetMemberSearch}%`)
                .neq('id', memberId) // Cannot transfer to self
                .limit(5);
            if (data) setTargetMembers(data);
        }, 500);
        return () => clearTimeout(delaySearch);
    }, [targetMemberSearch, memberId]);

    // T1-2: Open edit modal

    // T1-2: Save member edit

    // T1-2: Open edit modal
    function openEditModal() {
        if (!member) return;
        setEditForm({ name: member.name || '', phone: member.phone || '', gender: member.gender || '', birthdate: member.birthdate || '', status: member.status || 'Active' });
        setShowEditModal(true);
    }

    async function loadMemberData() {
        setLoading(true);

        const [memberRes, checkinsRes, txRes, notesRes, membershipsRes] = await Promise.all([
            query('members').select('*').eq('id', memberId).single(),
            query('checkins').select('*').eq('member_id', memberId).order('time', { ascending: false }).limit(20),
            query('transactions').select('*').eq('member_id', memberId).order('date', { ascending: false }),
            query('member_notes').select('*').eq('member_id', memberId).order('created_at', { ascending: false }),
            query('memberships').select('*, membership_plans(name, price, duration_days, credits, max_pauses)').eq('member_id', memberId).order('created_at', { ascending: false }),
        ]);



        if (memberRes.data) setMember(memberRes.data as any);
        if (checkinsRes.data) setCheckins(checkinsRes.data);
        if (txRes.data) setTransactions(txRes.data);
        if (notesRes.data) setNotes(notesRes.data);
        if (membershipsRes.data) setMemberships(membershipsRes.data as unknown as Membership[]);

        setLoading(false);
    }

    // T1-2: Save member edit
    async function saveMemberEdit() {
        if (!member) return;
        setSaving(true);
        const { error } = await query('members').update({
            name: editForm.name, phone: editForm.phone || null, gender: editForm.gender || null, birthdate: editForm.birthdate || null, status: editForm.status,
        }).eq('id', member.id);
        if (!error) {
            setShowEditModal(false);
            success('회원 목록이 업데이트되었습니다.');
            loadMemberData();
        } else {
            toastError(`회원 정보 수정 실패: ${error.message}`);
        }
        setSaving(false);
    }

    async function handleTransfer() {
        if (!selectedMembership || !selectedTargetMember) return;
        setTransferring(true);

        try {
            // 1. Deactivate current membership
            const { error: deactivateError } = await query('memberships')
                .update({ status: 'transferred', updated_at: new Date().toISOString() })
                .eq('id', selectedMembership.id);

            if (deactivateError) throw deactivateError;

            // 2. Create new membership for target
            const { error: createError } = await query('memberships')
                .insert({
                    member_id: selectedTargetMember.id,
                    plan_id: (selectedMembership as any).plan_id,
                    status: 'active',
                    start_date: new Date().toISOString().split('T')[0],
                    end_date: selectedMembership.end_date,
                    remaining_credits: selectedMembership.remaining_credits,
                    pause_count: selectedMembership.pause_count,
                });

            if (createError) throw createError;

            // 3. Log the transfer
            await query('member_notes').insert({
                member_id: memberId,
                content: `[회원권 양도] ${selectedMembership.membership_plans?.name} -> ${selectedTargetMember.name} (${selectedTargetMember.email})`,
            });

            await query('member_notes').insert({
                member_id: selectedTargetMember.id,
                content: `[회원권 양수] ${selectedMembership.membership_plans?.name} <- ${member?.name} (${member?.email})`,
            });

            success('회원권 양도가 완료되었습니다.');
            setShowTransferModal(false);
            loadMemberData();
        } catch (e: any) {
            toastError(`양도 실패: ${e.message}`);
        } finally {
            setTransferring(false);
        }
    }

    async function addNote() {
        if (!newNote.trim()) return;
        const { error } = await query('member_notes').insert({
            member_id: memberId,
            content: newNote,
        });
        if (!error) {
            setNewNote('');
            success('메모가 저장되었습니다.');
            loadMemberData();
        } else {
            toastError(`메모 저장 실패: ${error.message}`);
        }
    }

    function getDaysRemaining(endDate: string) {
        if (!endDate) return null;
        const diff = new Date(endDate).getTime() - new Date().getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    // Inline edit helpers
    function startInlineEdit(field: string, currentValue: string) {
        setInlineEdit(field);
        // Clean display-only values like '-' so date input gets empty string
        setInlineValue(currentValue === '-' ? '' : (currentValue || ''));
    }

    function cancelInlineEdit() {
        setInlineEdit(null);
        setInlineValue('');
    }

    async function saveInlineEdit() {
        if (!member) return;

        // Validate: if editing a date field, require a valid date value
        const isDateField = inlineEdit === 'ms_start' || inlineEdit === 'ms_end' || inlineEdit === 'locker_end';
        if (isDateField && !inlineValue) {
            toastError('날짜를 입력해주세요.');
            return;
        }

        setInlineSaving(true);
        const activeMembership = memberships.find(m => m.status === 'active') || memberships[0];

        try {
            let error: any = null;
            let updated = false;

            if (inlineEdit === 'ms_start') {
                if (activeMembership) {
                    // Update memberships table
                    const res = await query('memberships')
                        .update({ start_date: inlineValue })
                        .eq('id', activeMembership.id)
                        .select();
                    error = res.error;
                    updated = !error && res.data && res.data.length > 0;
                    // Also sync members table for consistency
                    if (updated) {
                        await query('members')
                            .update({ membership_start_date: inlineValue })
                            .eq('id', member.id);
                    }

                } else {
                    // Fallback: update members table directly
                    const res = await query('members')
                        .update({ membership_start_date: inlineValue })
                        .eq('id', member.id)
                        .select();
                    error = res.error;
                    updated = !error && res.data && res.data.length > 0;

                }
                if (updated) success('시작일이 수정되었습니다.');
                else if (!error) { toastError('수정 권한이 없거나 대상 레코드를 찾을 수 없습니다.'); }
            } else if (inlineEdit === 'ms_end') {
                if (activeMembership) {
                    const res = await query('memberships')
                        .update({ end_date: inlineValue })
                        .eq('id', activeMembership.id)
                        .select();
                    error = res.error;
                    updated = !error && res.data && res.data.length > 0;
                    // Also sync members table for consistency
                    if (updated) {
                        await query('members')
                            .update({ membership_end_date: inlineValue })
                            .eq('id', member.id);
                    }
                } else {
                    const res = await query('members')
                        .update({ membership_end_date: inlineValue })
                        .eq('id', member.id)
                        .select();
                    error = res.error;
                    updated = !error && res.data && res.data.length > 0;
                }
                if (updated) success('종료일이 수정되었습니다.');
                else if (!error) { toastError('수정 권한이 없거나 대상 레코드를 찾을 수 없습니다.'); }
            } else if (inlineEdit === 'locker_end') {
                const { data: lockerData } = await query('lockers').select('id').eq('locker_number', member.locker_number).eq('assigned_member_id', member.id).single();
                if (lockerData) {
                    await query('lockers').update({ assignment_end_date: inlineValue }).eq('id', lockerData.id);
                    await query('locker_assignments').update({ end_date: inlineValue }).eq('locker_id', lockerData.id).eq('member_id', member.id).eq('status', 'active');
                }
                const res = await query('members')
                    .update({ locker_end_date: inlineValue })
                    .eq('id', member.id)
                    .select();
                error = res.error;
                updated = !error && res.data && res.data.length > 0;
                if (updated) success('락커 만료일이 수정되었습니다.');
                else if (!error) { toastError('수정 권한이 없거나 대상 레코드를 찾을 수 없습니다.'); }
            }

            if (error) {
                toastError(`수정 실패: ${error.message}`);
            } else if (updated) {
                cancelInlineEdit();
                loadMemberData();
            }
        } catch (e: any) {
            toastError(`수정 실패: ${e.message}`);
        }
        setInlineSaving(false);
    }

    // Locker assignment from member detail
    async function openLockerAssignModal() {
        setLockerAssignForm({ locker_number: '', start_date: new Date().toISOString().split('T')[0], end_date: '' });
        setShowLockerAssignModal(true);
        // Load available lockers
        const { data } = await query('lockers')
            .select('id, locker_number, size')
            .eq('status', 'available')
            .order('locker_number');
        if (data) setAvailableLockers(data);
    }

    async function assignLockerToMember() {
        if (!lockerAssignForm.locker_number || !lockerAssignForm.end_date || !member) return;
        setSavingLocker(true);
        const selectedLocker = availableLockers.find(l => l.locker_number === lockerAssignForm.locker_number);
        if (!selectedLocker) {
            toastError('선택한 락커를 찾을 수 없습니다.');
            setSavingLocker(false);
            return;
        }

        // 1. Update locker status
        await query('lockers').update({
            status: 'occupied',
            assigned_member_id: member.id,
            assignment_start_date: lockerAssignForm.start_date,
            assignment_end_date: lockerAssignForm.end_date,
        }).eq('id', selectedLocker.id);

        // 2. Create assignment record
        await query('locker_assignments').insert({
            locker_id: selectedLocker.id,
            member_id: member.id,
            start_date: lockerAssignForm.start_date,
            end_date: lockerAssignForm.end_date,
            status: 'active',
        });

        // 3. Update member locker info
        await query('members').update({
            locker_number: lockerAssignForm.locker_number,
            locker_end_date: lockerAssignForm.end_date,
        }).eq('id', member.id);

        setShowLockerAssignModal(false);
        success(`락커 ${lockerAssignForm.locker_number}번이 배정되었습니다.`);
        loadMemberData();
        setSavingLocker(false);
    }

    // Release locker from member - show confirm modal
    function releaseLockerFromMember() {
        if (!member || !member.locker_number) return;
        setShowLockerReleaseConfirm(true);
    }

    // Confirm locker release
    async function confirmReleaseLocker() {
        if (!member || !member.locker_number) return;
        setReleasingLocker(true);
        const { data: lockerData } = await query('lockers').select('id').eq('locker_number', member.locker_number).eq('assigned_member_id', member.id).single();
        if (lockerData) {
            await query('lockers').update({ status: 'available', assigned_member_id: null, assignment_start_date: null, assignment_end_date: null }).eq('id', lockerData.id);
            await query('locker_assignments').update({ status: 'released' }).eq('locker_id', lockerData.id).eq('member_id', member.id).eq('status', 'active');
        }
        await query('members').update({ locker_number: null, locker_end_date: null }).eq('id', member.id);
        setShowLockerReleaseConfirm(false);
        setReleasingLocker(false);
        success('락커 배정이 해제되었습니다.');
        loadMemberData();
    }

    // Open locker change modal (for changing locker number)
    async function openLockerEditModal(_mode: string) {
        setSelectedNewLocker('');
        setShowLockerChangeModal(true);
        const { data } = await query('lockers').select('id, locker_number, size').eq('status', 'available').order('locker_number');
        if (data) setAvailableLockers(data);
    }

    // Execute locker number change
    async function changeLockerNumber() {
        if (!member || !member.locker_number || !selectedNewLocker) return;
        setSavingLocker(true);
        const newLocker = availableLockers.find(l => l.locker_number === selectedNewLocker);
        if (!newLocker) { toastError('선택한 락커를 찾을 수 없습니다.'); setSavingLocker(false); return; }

        // Release old
        const { data: oldLocker } = await query('lockers').select('id').eq('locker_number', member.locker_number).eq('assigned_member_id', member.id).single();
        if (oldLocker) {
            await query('lockers').update({ status: 'available', assigned_member_id: null, assignment_start_date: null, assignment_end_date: null }).eq('id', oldLocker.id);
            await query('locker_assignments').update({ status: 'released' }).eq('locker_id', oldLocker.id).eq('member_id', member.id).eq('status', 'active');
        }

        // Assign new
        const startDate = new Date().toISOString().split('T')[0];
        const endDate = member.locker_end_date || null;
        await query('lockers').update({ status: 'occupied', assigned_member_id: member.id, assignment_start_date: startDate, assignment_end_date: endDate }).eq('id', newLocker.id);
        await query('locker_assignments').insert({ locker_id: newLocker.id, member_id: member.id, start_date: startDate, end_date: endDate, status: 'active' });
        await query('members').update({ locker_number: selectedNewLocker }).eq('id', member.id);

        setShowLockerChangeModal(false);
        success(`락커가 ${selectedNewLocker}번으로 변경되었습니다.`);
        loadMemberData();
        setSavingLocker(false);
    }

    // Inline edit row helper component
    function InlineEditRow({ label, value, editKey, type = 'date' }: { label: string; value: string; editKey: string; type?: string }) {
        const isEditing = inlineEdit === editKey;
        return (
            <div className="flex justify-between items-center gap-2 min-h-[32px]">
                <span className="text-xs shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</span>
                <div className="flex items-center gap-1.5">
                    {isEditing ? (
                        <>
                            <input
                                type={type}
                                value={inlineValue}
                                onChange={(e) => setInlineValue(e.target.value)}
                                autoFocus
                                className="px-2 py-1 rounded-lg text-xs text-white outline-none w-[130px]"
                                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,107,0,0.4)', colorScheme: 'dark' }}
                                onKeyDown={(e) => { if (e.key === 'Enter') saveInlineEdit(); if (e.key === 'Escape') cancelInlineEdit(); }}
                            />
                            <button onClick={saveInlineEdit} disabled={inlineSaving} className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: '#22C55E' }} title="저장">✓</button>
                            <button onClick={cancelInlineEdit} className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: '#f87171' }} title="취소">✕</button>
                        </>
                    ) : (
                        <>
                            <span className="text-sm font-bold text-white">{value || '-'}</span>
                            <button
                                onClick={() => startInlineEdit(editKey, value)}
                                className="opacity-30 hover:opacity-80 transition-opacity p-0.5"
                                title="수정"
                            >
                                <IconEdit size={12} />
                            </button>
                        </>
                    )}
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="p-8 lg:p-12 flex items-center justify-center min-h-[60vh]">
                <div className="w-10 h-10 rounded-xl border-2 animate-spin" style={{ borderColor: 'rgba(255,255,255,0.05)', borderTopColor: 'var(--primary)' }}></div>
            </div>
        );
    }

    if (!member) {
        return (
            <div className="p-8 lg:p-12">
                <div className="flex flex-col items-center justify-center py-32 opacity-50">
                    <span className="text-5xl mb-4"><IconUser size={48} /></span>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 mb-6">Member not found</p>
                    <Link href="/admin/members" className="text-xs font-black uppercase tracking-widest transition-all hover:opacity-80" style={{ color: 'var(--primary)' }}>
                        ← 회원 목록으로
                    </Link>
                </div>
            </div>
        );
    }

    const daysRemaining = getDaysRemaining(member.membership_end_date || '');
    const statusColor = member.status === 'Active' ? '#22C55E' : member.status === 'Expired' ? '#EF4444' : '#F59E0B';
    const statusBg = member.status === 'Active' ? 'rgba(34,197,94,0.15)' : member.status === 'Expired' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)';

    const tabItems = [
        { key: 'overview' as const, label: '개요', icon: <IconBarChart size={14} /> },
        { key: 'attendance' as const, label: '출석', icon: <IconClipboard size={14} /> },
        { key: 'payments' as const, label: '결제', icon: <IconCreditCard size={14} /> },
        { key: 'notes' as const, label: '메모', icon: <IconNotes size={14} /> },
    ];

    return (
        <div className="p-8 lg:p-12 transition-all duration-700">
            {/* Header */}
            <header className="mb-10 animate-premium-fade">
                <Link
                    href="/admin/members"
                    className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-8 transition-all hover:gap-3"
                    style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                    ← 회원 목록
                </Link>

                <div className="flex items-center gap-3 mb-3">
                    <span className="w-2 h-2 rounded-full" style={{ background: 'var(--primary)', boxShadow: '0 0 15px var(--primary-glow)' }}></span>
                    <span className="text-[11px] font-black uppercase tracking-[0.5em] italic" style={{ color: 'var(--primary)' }}>User &amp; Finance</span>
                </div>
                <h1 className="text-4xl font-black text-white tracking-tight leading-none uppercase">
                    Member <span className="opacity-20 font-light ml-2">Detail</span>
                </h1>
            </header>

            {/* Profile Hero Card */}
            <div
                className="rounded-2xl p-8 mb-8 relative overflow-hidden"
                style={{
                    background: 'linear-gradient(135deg, rgba(255,107,0,0.08) 0%, rgba(255,255,255,0.02) 50%, rgba(255,107,0,0.04) 100%)',
                    border: '1px solid rgba(255,255,255,0.05)',
                }}
            >
                {/* Decorative glow */}
                <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)' }}></div>

                <div className="flex items-center gap-8 relative z-10">
                    {/* Avatar */}
                    <div
                        className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-black text-white shrink-0"
                        style={{ background: 'linear-gradient(135deg, var(--primary), #FF8F3F)', boxShadow: '0 0 30px rgba(255,107,0,0.2)' }}
                    >
                        {member.name?.charAt(0) || '?'}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                            <h2 className="text-2xl font-black text-white tracking-tight">{member.name}</h2>
                            <span
                                className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest"
                                style={{ background: statusBg, color: statusColor }}
                            >
                                {member.status}
                            </span>
                            <button onClick={openEditModal} className="px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest bg-white/[0.05] border border-white/5 text-white hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all"><IconEdit size={10} className="inline mr-1" /> 수정</button>
                        </div>

                        {/* Member Detail Grid */}
                        <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-widest shrink-0" style={{ color: 'rgba(255,255,255,0.25)', width: '36px' }}>Email</span>
                                <span className="text-sm text-white/60 truncate">{member.email || '-'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-widest shrink-0" style={{ color: 'rgba(255,255,255,0.25)', width: '36px' }}>Tel</span>
                                <span className="text-sm text-white/60">{member.phone || '-'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-widest shrink-0" style={{ color: 'rgba(255,255,255,0.25)', width: '36px' }}>성별</span>
                                <span className="text-sm text-white/60">
                                    {member.gender === 'M' ? '남성' : member.gender === 'F' ? '여성' : member.gender || '-'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-widest shrink-0" style={{ color: 'rgba(255,255,255,0.25)', width: '36px' }}>생년</span>
                                <span className="text-sm text-white/60">
                                    {member.birthdate ? new Date(member.birthdate).toLocaleDateString('ko-KR') : '-'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 col-span-2">
                                <span className="text-[10px] font-bold uppercase tracking-widest shrink-0" style={{ color: 'rgba(255,255,255,0.25)', width: '36px' }}>가입</span>
                                <span className="text-sm text-white/60">
                                    {member.joined_date ? new Date(member.joined_date).toLocaleDateString('ko-KR') : '-'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Plan Badge */}
                    <div
                        className="text-right shrink-0 p-5 rounded-2xl"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                    >
                        <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>현재 이용권</p>
                        <p className="text-xl font-black" style={{ color: 'var(--primary)' }}>{member.plan || 'No Plan'}</p>
                        {daysRemaining !== null && (
                            <p className="text-sm font-black mt-1" style={{ color: daysRemaining > 7 ? '#22C55E' : daysRemaining > 0 ? '#F59E0B' : '#EF4444' }}>
                                {daysRemaining > 0 ? `D-${daysRemaining}` : '만료됨'}
                            </p>
                        )}
                        {member.credits !== undefined && member.credits > 0 && (
                            <p className="text-[10px] font-bold mt-1" style={{ color: 'var(--primary)' }}>{member.credits}회 남음</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Member Context (Priority 23 P1-A: 활성 플래그 + 출석 + 멤버십 + 코칭 노트) */}
            <MemberContextPanel memberId={memberId} />

            {/* Tabs */}
            <div className="flex gap-2 mb-8">
                {tabItems.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        style={activeTab === tab.key
                            ? { background: 'var(--primary)', color: '#fff', boxShadow: '0 0 15px rgba(255,107,0,0.3)' }
                            : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }
                        }
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-3 gap-6">
                    {/* Membership Card */}
                    <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>멤버십 정보</h3>
                            {(() => {
                                const am = memberships.find(m => m.status === 'active') || memberships[0];
                                return am && am.status === 'active' ? (
                                    <button
                                        onClick={() => { setSelectedMembership(am); setShowTransferModal(true); }}
                                        className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider transition-all hover:opacity-80"
                                        style={{ color: 'var(--primary)', border: '1px solid rgba(255,107,0,0.25)' }}
                                    >양도</button>
                                ) : null;
                            })()}
                        </div>
                        {(() => {
                            const activeMembership = memberships.find(m => m.status === 'active') || memberships[0];
                            const planName = activeMembership?.membership_plans?.name || member.plan || '-';
                            const startDate = activeMembership?.start_date || member.membership_start_date || '-';
                            const endDate = activeMembership?.end_date || member.membership_end_date || '-';
                            const remainingCredits = activeMembership?.remaining_credits ?? member.credits ?? 0;
                            const totalCredits = activeMembership?.membership_plans?.credits || 0;
                            const pauseCount = activeMembership?.pause_count || 0;
                            const maxPauses = activeMembership?.membership_plans?.max_pauses || 0;
                            const price = activeMembership?.membership_plans?.price || 0;
                            const durationDays = activeMembership?.membership_plans?.duration_days || 0;
                            const msStatus = activeMembership?.status || 'none';

                            // Calculate remaining days
                            const daysLeft = endDate !== '-' ? Math.ceil((new Date(endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;

                            // Status badge config
                            const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
                                active: { label: '이용중', bg: 'rgba(34,197,94,0.15)', color: '#22C55E' },
                                paused: { label: '일시정지', bg: 'rgba(245,158,11,0.15)', color: '#F59E0B' },
                                expired: { label: '만료', bg: 'rgba(239,68,68,0.15)', color: '#EF4444' },
                                cancelled: { label: '취소', bg: 'rgba(156,163,175,0.15)', color: '#9CA3AF' },
                                none: { label: '없음', bg: 'rgba(156,163,175,0.1)', color: '#6B7280' },
                            };
                            const badge = statusConfig[msStatus] || statusConfig.none;

                            return (
                                <div className="space-y-3">
                                    {/* Plan name + Status badge */}
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>플랜</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold" style={{ color: 'var(--primary)' }}>{planName}</span>
                                            <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
                                        </div>
                                    </div>

                                    {/* Start / End dates */}
                                    <InlineEditRow label="시작일" value={startDate} editKey="ms_start" />
                                    <InlineEditRow label="종료일" value={endDate} editKey="ms_end" />

                                    {/* Remaining days */}
                                    {daysLeft !== null && msStatus === 'active' && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>잔여일</span>
                                            <span className="text-sm font-black" style={{ color: daysLeft > 30 ? '#22C55E' : daysLeft > 7 ? '#F59E0B' : '#EF4444' }}>
                                                {daysLeft > 0 ? `D-${daysLeft}` : daysLeft === 0 ? '오늘 만료' : `D+${Math.abs(daysLeft)} (초과)`}
                                            </span>
                                        </div>
                                    )}

                                    {/* Credits (always show if totalCredits > 0) */}
                                    {totalCredits > 0 && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>잔여 횟수</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-black" style={{ color: remainingCredits > 0 ? '#fff' : '#EF4444' }}>
                                                    {remainingCredits}회
                                                </span>
                                                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>/ {totalCredits}회</span>
                                            </div>
                                        </div>
                                    )}
                                    {/* Credits bar */}
                                    {totalCredits > 0 && (
                                        <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                            <div
                                                className="h-full rounded-full transition-all"
                                                style={{
                                                    width: `${Math.min((remainingCredits / totalCredits) * 100, 100)}%`,
                                                    background: remainingCredits / totalCredits > 0.3 ? 'var(--primary)' : '#EF4444',
                                                }}
                                            />
                                        </div>
                                    )}

                                    {/* Price / Duration */}
                                    {price > 0 && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>이용권 금액</span>
                                            <span className="text-sm font-bold text-white">₩{price.toLocaleString()}</span>
                                        </div>
                                    )}
                                    {durationDays > 0 && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>이용 기간</span>
                                            <span className="text-sm text-white">{durationDays}일</span>
                                        </div>
                                    )}

                                    {/* Pause info */}
                                    {msStatus === 'paused' && (
                                        <div className="pt-2 mt-1 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>홀딩 횟수</span>
                                                <span className="text-sm font-bold" style={{ color: '#F59E0B' }}>{pauseCount} / {maxPauses}회</span>
                                            </div>
                                            {activeMembership?.paused_at && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>홀딩 시작</span>
                                                    <span className="text-xs text-white/60">{new Date(activeMembership.paused_at).toLocaleDateString('ko-KR')}</span>
                                                </div>
                                            )}
                                            {activeMembership?.pause_reason && (
                                                <div className="flex justify-between items-start">
                                                    <span className="text-xs shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }}>사유</span>
                                                    <span className="text-xs text-white/60 text-right max-w-[60%]">{activeMembership.pause_reason}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Max pauses info (when active) */}
                                    {msStatus === 'active' && maxPauses > 0 && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>홀딩 가능</span>
                                            <span className="text-xs text-white/50">{maxPauses - pauseCount}회 남음</span>
                                        </div>
                                    )}

                                    {/* Past memberships */}
                                    {memberships.length > 1 && (
                                        <div className="pt-3 mt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                            <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.25)' }}>이전 멤버십</p>
                                            <div className="space-y-1.5">
                                                {memberships.slice(1, 4).map((ms) => (
                                                    <div key={ms.id} className="flex justify-between items-center py-1 px-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                                                        <span className="text-[10px] text-white/40">{ms.membership_plans?.name || '-'}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] text-white/30">{ms.start_date?.slice(0, 10) || '-'} ~ {ms.end_date?.slice(0, 10) || '-'}</span>
                                                            <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold"
                                                                style={{ background: (statusConfig[ms.status] || statusConfig.none).bg, color: (statusConfig[ms.status] || statusConfig.none).color }}
                                                            >{(statusConfig[ms.status] || statusConfig.none).label}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                                {memberships.length > 4 && (
                                                    <p className="text-[9px] text-white/20 text-center pt-1">외 {memberships.length - 4}건</p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* No membership */}
                                    {!activeMembership && (
                                        <div className="py-4 text-center">
                                            <p className="text-xs text-white/30">등록된 멤버십이 없습니다</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>

                    {/* Stats Card */}
                    <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h3 className="text-[10px] font-black uppercase tracking-widest mb-5" style={{ color: 'rgba(255,255,255,0.3)' }}>활동 통계</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>총 출석</span>
                                <span className="text-sm font-black text-white">{checkins.length}회</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>이번 주</span>
                                <span className="text-sm font-black text-white">{checkins.filter(c => {
                                    const d = new Date(c.time);
                                    const now = new Date();
                                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                                    return d >= weekAgo;
                                }).length}회</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>총 결제</span>
                                <span className="text-sm font-black" style={{ color: 'var(--primary)' }}>₩{transactions.reduce((a, t) => a + Number(t.amount), 0).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Locker Card */}
                    <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>부가 정보</h3>
                            {member.locker_number && (
                                <button
                                    onClick={releaseLockerFromMember}
                                    className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider transition-all hover:opacity-80"
                                    style={{ color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }}
                                >해제</button>
                            )}
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center gap-2 min-h-[32px]">
                                <span className="text-xs shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }}>락커 번호</span>
                                {member.locker_number ? (
                                    <div className="flex items-center gap-1.5">
                                        <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-black" style={{ background: 'rgba(59,130,246,0.15)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.3)' }}>{member.locker_number}</span>
                                        <button
                                            onClick={() => openLockerEditModal('change_number')}
                                            className="opacity-30 hover:opacity-80 transition-opacity p-0.5"
                                            title="락커 변경"
                                        >
                                            <IconEdit size={12} />
                                        </button>
                                    </div>
                                ) : (
                                    <span className="text-sm text-white/30 italic">미배정</span>
                                )}
                            </div>
                            <InlineEditRow label="락커 만료" value={member.locker_end_date || ''} editKey="locker_end" />
                            {!member.locker_number && (
                                <button
                                    onClick={openLockerAssignModal}
                                    className="w-full mt-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-white/[0.05]"
                                    style={{ color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)' }}
                                >
                                    <IconLock size={12} className="inline mr-1" /> 락커 배정
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Recent Checkins */}
                    <div className="col-span-2 rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h3 className="text-[10px] font-black uppercase tracking-widest mb-5" style={{ color: 'rgba(255,255,255,0.3)' }}>최근 출석</h3>
                        {checkins.length === 0 ? (
                            <p className="text-xs py-6 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>출석 기록이 없습니다</p>
                        ) : (
                            <div className="space-y-2">
                                {checkins.slice(0, 5).map((c) => (
                                    <div key={c.id} className="flex items-center justify-between p-3 rounded-xl transition-all hover:bg-white/[0.02]" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)' }}>
                                        <div>
                                            <p className="text-sm font-bold text-white">{new Date(c.time).toLocaleDateString('ko-KR')} <span className="font-normal" style={{ color: 'rgba(255,255,255,0.5)' }}>{new Date(c.time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span></p>
                                            <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{c.facility}</p>
                                        </div>
                                        <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase" style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}>{c.status}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recent Transactions */}
                    <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h3 className="text-[10px] font-black uppercase tracking-widest mb-5" style={{ color: 'rgba(255,255,255,0.3)' }}>최근 결제</h3>
                        {transactions.length === 0 ? (
                            <p className="text-xs py-6 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>결제 기록이 없습니다</p>
                        ) : (
                            <div className="space-y-2">
                                {transactions.slice(0, 5).map((t) => (
                                    <div key={t.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)' }}>
                                        <div>
                                            <p className="text-sm font-bold text-white">₩{Number(t.amount).toLocaleString()}</p>
                                            <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{t.date} · {t.method}</p>
                                        </div>
                                        <span className="text-[9px] font-black uppercase" style={{ color: t.status === 'completed' ? '#22C55E' : '#EF4444' }}>{t.status}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )
            }

            {/* Attendance Tab */}
            {
                activeTab === 'attendance' && (
                    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        {/* Table Header */}
                        <div className="grid grid-cols-4 gap-4 px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            {['날짜', '시간', '지점', '상태'].map((h) => (
                                <span key={h} className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>{h}</span>
                            ))}
                        </div>
                        {checkins.length === 0 ? (
                            <div className="p-12 text-center">
                                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>출석 기록이 없습니다</p>
                            </div>
                        ) : (
                            checkins.map((c) => (
                                <div key={c.id} className="grid grid-cols-4 gap-4 px-6 py-4 transition-all hover:bg-white/[0.02]" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                    <span className="text-sm text-white">{new Date(c.time).toLocaleDateString('ko-KR')}</span>
                                    <span className="text-sm text-white">{new Date(c.time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
                                    <span className="text-sm text-white">{c.facility}</span>
                                    <span><span className="px-3 py-1 rounded-full text-[9px] font-black uppercase" style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}>{c.status}</span></span>
                                </div>
                            ))
                        )}
                    </div>
                )
            }

            {/* Payments Tab */}
            {
                activeTab === 'payments' && (
                    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        {/* Table Header */}
                        <div className="grid grid-cols-6 gap-4 px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            {['결제 ID', '금액', '카테고리', '결제 수단', '날짜', '상태'].map((h) => (
                                <span key={h} className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>{h}</span>
                            ))}
                        </div>
                        {transactions.length === 0 ? (
                            <div className="p-12 text-center">
                                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>결제 기록이 없습니다</p>
                            </div>
                        ) : (
                            transactions.map((t) => (
                                <div key={t.id} className="grid grid-cols-6 gap-4 px-6 py-4 transition-all hover:bg-white/[0.02]" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                    <span className="text-xs text-white truncate">{t.id}</span>
                                    <span className="text-sm font-bold text-white">₩{Number(t.amount).toLocaleString()}</span>
                                    <span className="text-sm text-white">{t.category}</span>
                                    <span className="text-sm text-white">{t.method}</span>
                                    <span className="text-sm text-white">{t.date}</span>
                                    <span>
                                        <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase"
                                            style={{ background: t.status === 'completed' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: t.status === 'completed' ? '#22C55E' : '#EF4444' }}>
                                            {t.status}
                                        </span>
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                )
            }

            {/* Notes Tab */}
            {
                activeTab === 'notes' && (
                    <div>
                        {/* Add Note */}
                        <div className="rounded-2xl p-5 mb-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    placeholder="새 메모를 입력하세요..."
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addNote()}
                                    className="flex-1 px-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                                />
                                <button
                                    onClick={addNote}
                                    disabled={!newNote.trim()}
                                    className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all disabled:opacity-40"
                                    style={{ background: 'var(--primary)', boxShadow: '0 0 15px rgba(255,107,0,0.3)' }}
                                >
                                    추가
                                </button>
                            </div>
                        </div>

                        {/* Notes List */}
                        <div className="space-y-3">
                            {notes.map((n) => (
                                <div key={n.id} className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <p className="text-sm text-white mb-2">{n.content}</p>
                                    <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{new Date(n.created_at).toLocaleString('ko-KR')}</p>
                                </div>
                            ))}
                            {notes.length === 0 && (
                                <div className="py-12 text-center">
                                    <span className="text-3xl mb-3 block"><IconNotes size={32} /></span>
                                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>메모가 없습니다</p>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {/* T1-2: Member Edit Modal */}
            <AdminModal show={showEditModal} onClose={() => setShowEditModal(false)} title="회원 정보 수정" subtitle={member.email}>
                <div className="space-y-5">
                    <div><label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">이름 *</label><input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} /></div>
                    <div><label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">전화번호</label><input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="010-0000-0000" className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">성별</label><select value={editForm.gender} onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })} className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}><option value="">미지정</option><option value="M">남성</option><option value="F">여성</option></select></div>
                        <div><label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">생년월일</label><input type="date" value={editForm.birthdate} onChange={(e) => setEditForm({ ...editForm, birthdate: e.target.value })} className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} /></div>
                    </div>
                    <div><label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">상태</label><select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}><option value="Active">활성</option><option value="Inactive">비활성</option><option value="Expired">만료</option><option value="Suspended">정지</option></select></div>
                </div>
                <div className="flex gap-3 mt-8">
                    <button onClick={() => setShowEditModal(false)} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/[0.06] transition-all" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>취소</button>
                    <button onClick={saveMemberEdit} disabled={saving || !editForm.name.trim()} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all disabled:opacity-50" style={{ background: 'var(--primary)', boxShadow: '0 0 20px rgba(255,107,0,0.3)' }}>{saving ? '저장 중...' : '저장'}</button>
                </div>
            </AdminModal>

            {/* T3-5: Membership Transfer Modal */}
            <AdminModal show={showTransferModal} onClose={() => setShowTransferModal(false)} title="회원권 양도" subtitle={selectedMembership?.membership_plans?.name || ''}>
                <div className="space-y-5">
                    <p className="text-xs text-white/60 leading-relaxed">
                        선택한 회원권을 다른 회원에게 양도합니다. 양도 완료 후 현재 회원의 회원권은 <span className="text-red-400 font-bold">양도됨(transferred)</span> 상태로 변경되며, 대상 회원에게 동일한 조건의 새 회원권이 부여됩니다.
                    </p>

                    <div>
                        <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">대상 회원 검색 (이름 2자 이상)</label>
                        <input
                            type="text"
                            value={targetMemberSearch}
                            onChange={(e) => setTargetMemberSearch(e.target.value)}
                            placeholder="이름으로 검색..."
                            className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                        />
                    </div>

                    {targetMembers.length > 0 && (
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                            {targetMembers.map((m) => (
                                <button
                                    key={m.id}
                                    onClick={() => setSelectedTargetMember(m)}
                                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${selectedTargetMember?.id === m.id ? 'bg-[var(--primary)]/20 border border-[var(--primary)]/50' : 'bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05]'}`}
                                >
                                    <div className="text-left">
                                        <p className="text-xs font-bold text-white">{m.name}</p>
                                        <p className="text-[10px] text-white/40">{m.email}</p>
                                    </div>
                                    {selectedTargetMember?.id === m.id && <span className="text-xs">✅</span>}
                                </button>
                            ))}
                        </div>
                    )}

                    {selectedTargetMember && (
                        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                            <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-1">양도 대상 선택됨</p>
                            <p className="text-sm font-bold text-white">{selectedTargetMember.name} ({selectedTargetMember.email})</p>
                        </div>
                    )}
                </div>

                <div className="flex gap-3 mt-8">
                    <button onClick={() => setShowTransferModal(false)} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/[0.06] transition-all" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>취소</button>
                    <button
                        onClick={handleTransfer}
                        disabled={transferring || !selectedTargetMember}
                        className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all disabled:opacity-50"
                        style={{ background: 'var(--primary)', boxShadow: '0 0 20px rgba(255,107,0,0.3)' }}
                    >
                        {transferring ? '처리 중...' : '양도 실행'}
                    </button>
                </div>
            </AdminModal>


            {/* Locker Assign Modal */}
            <AdminModal show={showLockerAssignModal} onClose={() => setShowLockerAssignModal(false)} title="락커 배정" subtitle={member?.name || ''}>
                <div className="space-y-5">
                    <div>
                        <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">사용 가능한 락커 선택 *</label>
                        {availableLockers.length === 0 ? (
                            <p className="text-xs py-4 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>사용 가능한 락커가 없습니다</p>
                        ) : (
                            <div className="grid grid-cols-5 gap-2 max-h-40 overflow-y-auto pr-1">
                                {availableLockers.map((l) => (
                                    <button
                                        key={l.id}
                                        onClick={() => setLockerAssignForm(prev => ({ ...prev, locker_number: l.locker_number }))}
                                        className="py-2.5 rounded-xl text-[11px] font-black transition-all text-center"
                                        style={lockerAssignForm.locker_number === l.locker_number
                                            ? { background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.4)', color: '#22C55E' }
                                            : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }
                                        }
                                    >
                                        {l.locker_number}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">시작일</label>
                            <input
                                type="date"
                                value={lockerAssignForm.start_date}
                                onChange={(e) => setLockerAssignForm({ ...lockerAssignForm, start_date: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', colorScheme: 'dark' }}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">종료일 *</label>
                            <input
                                type="date"
                                value={lockerAssignForm.end_date}
                                onChange={(e) => setLockerAssignForm({ ...lockerAssignForm, end_date: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', colorScheme: 'dark' }}
                            />
                        </div>
                    </div>
                </div>
                <div className="flex gap-3 mt-8">
                    <button onClick={() => setShowLockerAssignModal(false)} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/[0.06] transition-all" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>취소</button>
                    <button onClick={assignLockerToMember} disabled={savingLocker || !lockerAssignForm.locker_number || !lockerAssignForm.end_date} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all disabled:opacity-40" style={{ background: '#22C55E', boxShadow: '0 0 20px rgba(34,197,94,0.3)' }}>{savingLocker ? '배정 중...' : '락커 배정'}</button>
                </div>
            </AdminModal>

            {/* Locker Change Modal */}
            <AdminModal show={showLockerChangeModal} onClose={() => setShowLockerChangeModal(false)} title="락커 번호 변경" subtitle={`현재: ${member?.locker_number || '-'}번`}>
                <div className="space-y-5">
                    <div>
                        <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">새 락커 선택 *</label>
                        {availableLockers.length === 0 ? (
                            <p className="text-xs py-4 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>사용 가능한 락커가 없습니다</p>
                        ) : (
                            <div className="grid grid-cols-5 gap-2 max-h-40 overflow-y-auto pr-1">
                                {availableLockers.map((l) => (
                                    <button
                                        key={l.id}
                                        onClick={() => setSelectedNewLocker(l.locker_number)}
                                        className="py-2.5 rounded-xl text-[11px] font-black transition-all text-center"
                                        style={selectedNewLocker === l.locker_number
                                            ? { background: 'rgba(167,139,250,0.2)', border: '1px solid rgba(167,139,250,0.4)', color: '#a78bfa' }
                                            : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }
                                        }
                                    >
                                        {l.locker_number}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex gap-3 mt-8">
                    <button onClick={() => setShowLockerChangeModal(false)} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/[0.06] transition-all" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>취소</button>
                    <button onClick={changeLockerNumber} disabled={savingLocker || !selectedNewLocker} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all disabled:opacity-40" style={{ background: '#a78bfa', boxShadow: '0 0 20px rgba(167,139,250,0.3)' }}>{savingLocker ? '변경 중...' : '락커 변경'}</button>
                </div>
            </AdminModal>

            {/* Locker Release Confirm Modal */}
            <AdminModal show={showLockerReleaseConfirm} onClose={() => setShowLockerReleaseConfirm(false)} title="락커 해제" size="sm">
                <div className="text-center py-4">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                        <IconLock size={28} />
                    </div>
                    <p className="text-white text-sm font-bold mb-2">
                        락커 <span style={{ color: '#3B82F6' }}>{member?.locker_number}번</span>의 배정을 해제하시겠습니까?
                    </p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        이 작업은 되돌릴 수 없으며, 해당 락커는 즉시 사용 가능 상태로 변경됩니다.
                    </p>
                </div>
                <div className="flex gap-3 mt-4">
                    <button
                        onClick={() => setShowLockerReleaseConfirm(false)}
                        className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/[0.06] transition-all"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                    >취소</button>
                    <button
                        onClick={confirmReleaseLocker}
                        disabled={releasingLocker}
                        className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all disabled:opacity-40"
                        style={{ background: '#EF4444', boxShadow: '0 0 20px rgba(239,68,68,0.3)' }}
                    >{releasingLocker ? '해제 중...' : '락커 해제'}</button>
                </div>
            </AdminModal>

        </div>
    );
}
