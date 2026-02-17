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

export default function AdminMembersPage() {
    const [members, setMembers] = useState<Member[]>([]);
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

    useEffect(() => { loadMembers(); }, []);

    async function loadMembers() {
        const supabase = createClient();
        setLoading(true);
        const { data, error } = await supabase
            .from('members')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) setMembers(data);
        setLoading(false);
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
        });
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
        return matchesSearch && matchesFilter;
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
                subtitle="Management"
                actions={<button onClick={() => setShowAddModal(true)} className="admin-action-btn">+ 신규 회원</button>}
            />

            <div className="p-10 max-w-[1400px] mx-auto">
                {/* Filters & Search */}
                <div className="flex items-center gap-4 mb-8">
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
                                    {/* Member Name + Email */}
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

                                    {/* Phone */}
                                    <div className="col-span-2">
                                        <p className="text-sm text-white">{member.phone || 'N/A'}</p>
                                    </div>

                                    {/* Plan */}
                                    <div className="col-span-2">
                                        <p className="text-sm font-bold text-white">{member.plan || '-'}</p>
                                        {member.credits > 0 && (
                                            <p className="text-[10px] font-bold" style={{ color: 'var(--primary)' }}>{member.credits}회 남음</p>
                                        )}
                                    </div>

                                    {/* Status */}
                                    <div className="col-span-2">
                                        <span className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest"
                                            style={{ background: sc.bg, color: sc.color }}>
                                            {sc.label}
                                        </span>
                                    </div>

                                    {/* Expiry */}
                                    <div className="col-span-2">
                                        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{member.membership_end_date || '-'}</p>
                                    </div>

                                    {/* Action */}
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

                {/* Add Member Modal */}
                <AdminModal show={showAddModal} onClose={() => setShowAddModal(false)} title="새 회원 추가" subtitle="신규 회원 정보를 입력하세요">
                    <div className="space-y-5">
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
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>전화번호</label>
                                <input
                                    type="text"
                                    value={addForm.phone}
                                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                                    placeholder="010-0000-0000"
                                    className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>성별</label>
                                <select
                                    value={addForm.gender}
                                    onChange={(e) => setAddForm({ ...addForm, gender: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                                >
                                    <option value="">선택</option>
                                    <option value="M">남성</option>
                                    <option value="F">여성</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>생년월일</label>
                            <input
                                type="date"
                                value={addForm.birthdate}
                                onChange={(e) => setAddForm({ ...addForm, birthdate: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 mt-8">
                        <button
                            onClick={() => setShowAddModal(false)}
                            className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all hover:bg-white/[0.06]"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                        >
                            취소
                        </button>
                        <button
                            onClick={addMember}
                            disabled={saving || !addForm.name.trim() || !addForm.email.trim()}
                            className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all disabled:opacity-40"
                            style={{ background: 'var(--primary)', boxShadow: '0 0 20px rgba(255,107,0,0.3)' }}
                        >
                            {saving ? '저장 중...' : '회원 등록'}
                        </button>
                    </div>
                </AdminModal>
            </div>
        </div>
    );
}
