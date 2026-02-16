'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import AdminSidebar from '@/components/layout/AdminSidebar';
import Link from 'next/link';

interface Member {
    id: string;
    email: string;
    full_name: string;
    phone: string;
    created_at: string;
    membership_status: string;
    plan_name: string;
}

export default function AdminMembersPage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        loadMembers();
    }, []);

    async function loadMembers() {
        const supabase = createClient();
        setLoading(true);

        const { data, error } = await supabase
            .from('users')
            .select(`
                *,
                membership:memberships!user_id(
                    status,
                    plan:plans(name)
                )
            `)
            .eq('role', 'member')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setMembers(
                data.map((user: any) => ({
                    id: user.id,
                    email: user.email,
                    full_name: user.full_name,
                    phone: user.phone,
                    created_at: user.created_at,
                    membership_status: user.membership?.[0]?.status || 'none',
                    plan_name: user.membership?.[0]?.plan?.name || 'No Plan',
                }))
            );
        }

        setLoading(false);
    }

    const filteredMembers = members.filter((member) => {
        const matchesSearch =
            member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.phone?.includes(searchTerm);

        const matchesFilter = filterStatus === 'all' || member.membership_status === filterStatus;

        return matchesSearch && matchesFilter;
    });

    return (
        <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
            <AdminSidebar />

            <main className="flex-1 ml-64 p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Members</h1>
                        <p style={{ color: 'var(--foreground-secondary)' }}>
                            {filteredMembers.length} members found
                        </p>
                    </div>
                    <button
                        className="px-4 py-2 rounded-lg font-semibold transition-colors"
                        style={{
                            background: 'var(--bcl-orange)',
                            color: '#FFFFFF',
                        }}
                    >
                        + Add Member
                    </button>
                </div>

                {/* Filters */}
                <div className="glass-card p-4 rounded-xl mb-6">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder="Search by name, email, or phone..."
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
                            <option value="all">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="expired">Expired</option>
                            <option value="none">No Membership</option>
                        </select>
                    </div>
                </div>

                {/* Members Table */}
                <div className="glass-card rounded-xl overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <th className="text-left p-4 text-sm font-semibold" style={{ color: 'var(--foreground-secondary)' }}>
                                    Member
                                </th>
                                <th className="text-left p-4 text-sm font-semibold" style={{ color: 'var(--foreground-secondary)' }}>
                                    Contact
                                </th>
                                <th className="text-left p-4 text-sm font-semibold" style={{ color: 'var(--foreground-secondary)' }}>
                                    Membership
                                </th>
                                <th className="text-left p-4 text-sm font-semibold" style={{ color: 'var(--foreground-secondary)' }}>
                                    Status
                                </th>
                                <th className="text-left p-4 text-sm font-semibold" style={{ color: 'var(--foreground-secondary)' }}>
                                    Joined
                                </th>
                                <th className="text-right p-4 text-sm font-semibold" style={{ color: 'var(--foreground-secondary)' }}>
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="text-center p-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 mx-auto" style={{ borderColor: 'var(--bcl-orange)' }}></div>
                                    </td>
                                </tr>
                            ) : filteredMembers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center p-8" style={{ color: 'var(--foreground-secondary)' }}>
                                        No members found
                                    </td>
                                </tr>
                            ) : (
                                filteredMembers.map((member) => (
                                    <tr
                                        key={member.id}
                                        className="transition-colors hover:bg-white/5"
                                        style={{ borderBottom: '1px solid var(--border-color)' }}
                                    >
                                        <td className="p-4">
                                            <div>
                                                <p className="text-white font-medium">{member.full_name || 'N/A'}</p>
                                                <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                                                    {member.email}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-white">{member.phone || 'N/A'}</p>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-white">{member.plan_name}</p>
                                        </td>
                                        <td className="p-4">
                                            <span
                                                className="px-3 py-1 rounded-full text-xs font-semibold"
                                                style={
                                                    member.membership_status === 'active'
                                                        ? {
                                                            background: 'rgba(34, 197, 94, 0.2)',
                                                            color: '#22C55E',
                                                        }
                                                        : member.membership_status === 'expired'
                                                            ? {
                                                                background: 'rgba(239, 68, 68, 0.2)',
                                                                color: '#EF4444',
                                                            }
                                                            : {
                                                                background: 'rgba(156, 163, 175, 0.2)',
                                                                color: '#9CA3AF',
                                                            }
                                                }
                                            >
                                                {member.membership_status}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-white">
                                                {new Date(member.created_at).toLocaleDateString()}
                                            </p>
                                        </td>
                                        <td className="p-4 text-right">
                                            <Link
                                                href={`/admin/members/${member.id}`}
                                                className="text-sm font-semibold transition-colors"
                                                style={{ color: 'var(--bcl-orange)' }}
                                            >
                                                View Details →
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
