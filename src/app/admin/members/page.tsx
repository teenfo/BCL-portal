'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import AdminPageHeader from '@/components/layout/AdminPageHeader';
import AdminModal from '@/components/layout/AdminModal';
import { IconMembers } from '@/components/icons/AdminIcons';

interface Member {
    id: string;
    name: string;
    email: string;
    phone: string;
    status: string;
    plan: string;
    credits: number;
    joined_date: string;
    membership_end_date: string;
}

interface PendingUser {
    id: string;
    full_name: string;
    email: string;
    created_at: string;
    role: string;
}

export default function AdminMembersPage() {
    const [view, setView] = useState<'list' | 'approvals'>('list');
    const [members, setMembers] = useState<Member[]>([]);
    const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [showAddModal, setShowAddModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [addForm, setAddForm] = useState({
        name: '',
        email: '',
        phone: '',
        gender: '',
        birthdate: '',
    });
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    useEffect(() => {
        if (view === 'list') loadMembers();
        else loadPendingUsers();
    }, [view]);

    async function loadMembers() {
        const supabase = createClient();
        setLoading(true);
        const { data, error } = await supabase
            .from('members')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) setMembers(data as any[]);
        setLoading(false);
    }

    async function loadPendingUsers() {
        const supabase = createClient();
        setLoading(true);

        const { data: profiles, error: profileError } = await (supabase as any)
            .from('profiles')
            .select('*')
            .eq('approval_status', 'pending')
            .order('updated_at', { ascending: false });

        if (profileError) {
            console.error('Error loading pending profiles:', profileError);
            setLoading(false);
            return;
        }

        setPendingUsers((profiles as any[]).map(p => ({
            id: p.id,
            full_name: p.full_name || 'N/A',
            email: p.email || 'N/A', // Assuming email was synced to profile or we use a placeholder
            created_at: p.updated_at || new Date().toISOString(),
            role: p.role || 'member'
        })));

        setLoading(false);
    }

    async function handleApproval(id: string, approve: boolean) {
        setSaving(true);
        const supabase = createClient();

        const newStatus = approve ? 'approved' : 'rejected';

        const { error } = await supabase
            .from('profiles')
            .update({ approval_status: newStatus } as any)
            .eq('id', id);

        if (!error) {
            if (approve) {
                const userProfile = pendingUsers.find(u => u.id === id);
                if (userProfile) {
                    await supabase.from('members').insert({
                        name: userProfile.full_name,
                        email: userProfile.email !== 'N/A' ? userProfile.email : '',
                        status: 'Active',
                    } as any);
                }
            }
            loadPendingUsers();
        }
        setSaving(false);
    }

    async function addMember() {
        if (!addForm.name.trim() || !addForm.email.trim()) return;
        setSaving(true);
        const supabase = createClient();
        const { error } = await supabase.from('members').insert({
            name: addForm.name,
            email: addForm.email,
            phone: addForm.phone || null,
            gender: addForm.gender || null,
            birthdate: addForm.birthdate || null,
            status: 'Active',
        } as any);
        setSaving(false);
        if (!error) {
            setShowAddModal(false);
            setAddForm({ name: '', email: '', phone: '', gender: '', birthdate: '' });
            loadMembers();
        }
    }

    const filteredMembers = members.filter((member) => {
        const matchesSearch =
            member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.phone?.includes(searchTerm);
        const matchesFilter = filterStatus === 'all' || member.status === filterStatus;
        const matchesDateStart = !dateRange.start || (member.joined_date && member.joined_date >= dateRange.start);
        const matchesDateEnd = !dateRange.end || (member.joined_date && member.joined_date <= dateRange.end);
        return matchesSearch && matchesFilter && matchesDateStart && matchesDateEnd;
    });

    const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
        Active: { bg: 'rgba(34, 197, 94, 0.15)', color: '#22C55E', label: '활성' },
        Expired: { bg: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', label: '만료' },
        Suspended: { bg: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', label: '정지' },
    };

    return (
        <div className="transition-all duration-500">
            <AdminPageHeader
                category="User & Finance"
                title="Members"
                subtitle={view === 'list' ? "Management" : "Account Approvals"}
                actions={
                    <div className="flex gap-2">
                        {view === 'list' ? (
                            <button onClick={() => setShowAddModal(true)} className="admin-action-btn">+ 신규 회원</button>
                        ) : null}
                    </div>
                }
            />

            <div className="p-10 max-w-[1400px] mx-auto">
                {/* View Tabs */}
                <div className="flex gap-2 mb-8">
                    <button
                        onClick={() => setView('list')}
                        className={`admin-filter-btn ${view === 'list' ? 'active' : ''}`}
                    >
                        회원 목록
                    </button>
                    <button
                        onClick={() => setView('approvals')}
                        className={`admin-filter-btn flex items-center gap-2 ${view === 'approvals' ? 'active' : ''}`}
                    >
                        가입 승인 대기
                        {pendingUsers.length > 0 && view === 'list' && (
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                        )}
                    </button>
                </div>

                {view === 'list' ? (
                    <>
                        {/* Filters & Search */}
                        <div className="flex items-center gap-4 mb-8 flex-wrap">
                            <div className="flex gap-2">
                                {(['all', 'Active', 'Expired'] as const).map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => setFilterStatus(f)}
                                        className={`admin-filter-btn ${filterStatus === f ? 'active' : ''}`}
                                    >
                                        {f === 'all' ? '전체' : f === 'Active' ? '활성' : '만료'}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    value={dateRange.start}
                                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                    className="admin-search-input"
                                    title="가입일 시작"
                                />
                                <span className="text-white/20">~</span>
                                <input
                                    type="date"
                                    value={dateRange.end}
                                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                    className="admin-search-input"
                                    title="가입일 종료"
                                />
                                {(dateRange.start || dateRange.end) && (
                                    <button
                                        onClick={() => setDateRange({ start: '', end: '' })}
                                        className="admin-filter-btn text-[9px]"
                                        title="날짜 필터 초기화"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                            <div className="flex-1">
                                <input
                                    type="text"
                                    placeholder="이름, 이메일, 전화번호로 검색..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="admin-search-input"
                                />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                {filteredMembers.length}명
                            </span>
                        </div>

                        {/* Members Table */}
                        {loading ? (
                            <div className="flex justify-center py-32">
                                <div className="w-10 h-10 rounded-xl border-2 animate-spin" style={{ borderColor: 'rgba(255,255,255,0.05)', borderTopColor: 'var(--primary)' }}></div>
                            </div>
                        ) : filteredMembers.length === 0 ? (
                            <div className="glass-card p-20 flex flex-col items-center justify-center opacity-40">
                                <span className="text-4xl mb-4"><IconMembers size={40} /></span>
                                <p className="text-[10px] font-black uppercase tracking-[0.4em]" style={{ color: 'rgba(255,255,255,0.4)' }}>No members found</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {/* Table Header */}
                                <div className="grid grid-cols-12 gap-4 px-6 py-3">
                                    {['회원', '연락처', '플랜', '상태', '만료일', ''].map((header, i) => (
                                        <div key={i} className={`${i === 0 ? 'col-span-3' : i === 5 ? 'col-span-1 text-right' : 'col-span-2'} text-[9px] font-black uppercase tracking-widest`}
                                            style={{ color: 'rgba(255,255,255,0.25)' }}>
                                            {header}
                                        </div>
                                    ))}
                                </div>

                                {/* Table Rows */}
                                {filteredMembers.map((member) => {
                                    const sc = statusConfig[member.status] || statusConfig.Expired;
                                    return (
                                        <div
                                            key={member.id}
                                            className="grid grid-cols-12 gap-4 items-center px-6 py-4 rounded-2xl transition-all group hover:scale-[1.01]"
                                            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)' }}
                                        >
                                            <div className="col-span-3 flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-white"
                                                    style={{ background: 'linear-gradient(135deg, var(--primary), #FF8F3F)' }}>
                                                    {member.name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white">{member.name || 'N/A'}</p>
                                                    <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{member.email}</p>
                                                </div>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-sm text-white">{member.phone || 'N/A'}</p>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-sm font-bold text-white">{member.plan || '-'}</p>
                                                {member.credits > 0 && (
                                                    <p className="text-[10px] font-bold" style={{ color: 'var(--primary)' }}>{member.credits}회 남음</p>
                                                )}
                                            </div>
                                            <div className="col-span-2">
                                                <span className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest"
                                                    style={{ background: sc.bg, color: sc.color }}>
                                                    {sc.label}
                                                </span>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{member.membership_end_date || '-'}</p>
                                            </div>
                                            <div className="col-span-1 text-right">
                                                <Link href={`/admin/members/${member.id}`}
                                                    className="text-xs font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all"
                                                    style={{ color: 'var(--primary)' }}>
                                                    상세 →
                                                </Link>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        {/* Approvals View */}
                        {loading ? (
                            <div className="flex justify-center py-32">
                                <div className="w-10 h-10 rounded-xl border-2 animate-spin" style={{ borderColor: 'rgba(255,255,255,0.05)', borderTopColor: 'var(--primary)' }}></div>
                            </div>
                        ) : pendingUsers.length === 0 ? (
                            <div className="glass-card p-20 flex flex-col items-center justify-center opacity-40 text-center">
                                <span className="text-4xl mb-4">✨</span>
                                <p className="text-[10px] font-black uppercase tracking-[0.4em]" style={{ color: 'rgba(255,255,255,0.4)' }}>No pending approvals</p>
                                <p className="text-[10px] mt-2 opacity-60">모든 가입 신청이 처리되었습니다.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {pendingUsers.map((user) => (
                                    <div
                                        key={user.id}
                                        className="flex items-center justify-between px-8 py-6 rounded-3xl transition-all"
                                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)' }}
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black text-white"
                                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                {user.full_name?.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <p className="text-lg font-bold text-white">{user.full_name}</p>
                                                    <span className="px-2 py-0.5 rounded bg-white/5 text-[8px] font-black uppercase tracking-widest text-white/40">
                                                        {user.role}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-white/40">{user.email}</p>
                                                <p className="text-[10px] mt-1 text-white/20">신청일: {new Date(user.created_at).toLocaleString()}</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-3 shrink-0">
                                            <button
                                                onClick={() => handleApproval(user.id, false)}
                                                disabled={saving}
                                                className="px-5 py-2.5 rounded-xl border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 transition-all whitespace-nowrap"
                                            >
                                                거절
                                            </button>
                                            <button
                                                onClick={() => handleApproval(user.id, true)}
                                                disabled={saving}
                                                className="px-6 py-2.5 rounded-xl bg-green-500 text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-green-500/20 whitespace-nowrap"
                                            >
                                                승인 완료
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* Add Member Modal */}
                <AdminModal show={showAddModal} onClose={() => setShowAddModal(false)} title="새 회원 추가" subtitle="신규 회원 정보를 입력하세요">
                    <div className="space-y-5">
                        {/* ... Modal content ... */}
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>이름 *</label>
                            <input
                                type="text"
                                value={addForm.name}
                                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                                placeholder="회원 이름"
                                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>이메일 *</label>
                            <input
                                type="email"
                                value={addForm.email}
                                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                                placeholder="email@example.com"
                                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                            />
                        </div>
                    </div>
                    {/* ... Rest of modal ... */}
                    <div className="flex gap-3 mt-8">
                        <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest bg-white/[0.03] border border-white/[0.05]">취소</button>
                        <button onClick={addMember} disabled={saving} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest bg-[var(--primary)]">{saving ? '저장 중...' : '회원 등록'}</button>
                    </div>
                </AdminModal>
            </div>
        </div>
    );
}
