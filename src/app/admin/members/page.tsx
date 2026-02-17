'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

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

    const filteredMembers = members.filter((member) => {
        const matchesSearch =
            member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.phone?.includes(searchTerm);
        const matchesFilter = filterStatus === 'all' || member.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
            <main className="flex-1 ml-64 p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">회원 관리</h1>
                        <p style={{ color: 'var(--foreground-secondary)' }}>{filteredMembers.length}명</p>
                    </div>
                    <button className="px-4 py-2 rounded-lg font-semibold transition-colors" style={{ background: 'var(--bcl-orange)', color: '#FFFFFF' }}>
                        + 회원 추가
                    </button>
                </div>

                {/* Filters */}
                <div className="glass-card p-4 rounded-xl mb-6">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder="이름, 이메일, 전화번호로 검색..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bcl-input w-full"
                            />
                        </div>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="bcl-input"
                        >
                            <option value="all">전체</option>
                            <option value="Active">활성</option>
                            <option value="Expired">만료</option>
                        </select>
                    </div>
                </div>

                {/* Members Table */}
                <div className="glass-card rounded-xl overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <th className="text-left p-4 text-sm font-semibold" style={{ color: 'var(--foreground-secondary)' }}>회원</th>
                                <th className="text-left p-4 text-sm font-semibold" style={{ color: 'var(--foreground-secondary)' }}>연락처</th>
                                <th className="text-left p-4 text-sm font-semibold" style={{ color: 'var(--foreground-secondary)' }}>플랜</th>
                                <th className="text-left p-4 text-sm font-semibold" style={{ color: 'var(--foreground-secondary)' }}>상태</th>
                                <th className="text-left p-4 text-sm font-semibold" style={{ color: 'var(--foreground-secondary)' }}>만료일</th>
                                <th className="text-right p-4 text-sm font-semibold" style={{ color: 'var(--foreground-secondary)' }}>상세</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className="text-center p-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 mx-auto" style={{ borderColor: 'var(--bcl-orange)' }}></div>
                                </td></tr>
                            ) : filteredMembers.length === 0 ? (
                                <tr><td colSpan={6} className="text-center p-8" style={{ color: 'var(--foreground-secondary)' }}>회원을 찾을 수 없습니다</td></tr>
                            ) : (
                                filteredMembers.map((member) => (
                                    <tr key={member.id} className="transition-colors hover:bg-white/5" style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--bcl-orange), #FF8F3F)' }}>
                                                    {member.name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-white font-medium">{member.name || 'N/A'}</p>
                                                    <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>{member.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-white">{member.phone || 'N/A'}</td>
                                        <td className="p-4">
                                            <p className="text-white">{member.plan || '-'}</p>
                                            {member.credits > 0 && (
                                                <p className="text-xs" style={{ color: 'var(--bcl-orange)' }}>{member.credits}회 남음</p>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <span className="px-3 py-1 rounded-full text-xs font-semibold" style={
                                                member.status === 'Active'
                                                    ? { background: 'rgba(34, 197, 94, 0.2)', color: '#22C55E' }
                                                    : { background: 'rgba(239, 68, 68, 0.2)', color: '#EF4444' }
                                            }>{member.status === 'Active' ? '활성' : '만료'}</span>
                                        </td>
                                        <td className="p-4 text-white text-sm">{member.membership_end_date || '-'}</td>
                                        <td className="p-4 text-right">
                                            <Link href={`/admin/members/${member.id}`} className="text-sm font-semibold transition-colors" style={{ color: 'var(--bcl-orange)' }}>
                                                상세 →
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}
