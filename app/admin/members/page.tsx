"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/assets/theme/hooks/supabase";
import { Search, Filter, MoreHorizontal, UserCheck, UserMinus, Eye } from "lucide-react";

interface Member {
    id: string;
    email: string;
    status: 'active' | 'suspended' | 'pending';
    last_login: string;
}

export default function MemberListPage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);

    const supabase = createClient();

    useEffect(() => {
        const fetchMembers = async () => {
            setLoading(true);
            // In a real app, we'd fetch from a custom 'members' table or Auth admin API
            // For this skeleton, we'll simulate with real-feeling data if table doesn't exist
            const { data, error } = await supabase.from("members").select("*");

            if (error) {
                console.warn("Table 'members' not found. Showing demo data.");
                setMembers([
                    { id: '1', email: 'user1@example.com', status: 'active', last_login: '2026-01-25' },
                    { id: '2', email: 'user2@example.com', status: 'suspended', last_login: '2026-01-20' },
                    { id: '3', email: 'newbie@gmail.com', status: 'active', last_login: '2026-01-24' },
                ]);
            } else {
                setMembers(data || []);
            }
            setLoading(false);
        };
        fetchMembers();
    }, [supabase]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Member Directory</h1>
                    <p className="text-muted text-sm font-medium mt-1">Manage all membership accounts and permissions.</p>
                </div>
                <button className="bg-primary text-on-primary px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-[0.98]">
                    Register New Member
                </button>
            </div>

            <div className="bg-surface rounded-2xl border border-border shadow-soft overflow-hidden">
                <div className="p-4 border-b border-border bg-surface2/30 flex flex-wrap gap-4 items-center">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                        <input
                            type="text"
                            placeholder="Search by name, email or ID..."
                            className="w-full bg-surface border border-border pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                        />
                    </div>
                    <button className="bg-surface border border-border px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-surface2 transition-colors">
                        <Filter size={16} />
                        Filters
                    </button>
                </div>

                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-surface2/50 text-muted border-b border-border uppercase text-[10px] font-black tracking-widest italic">
                            <th className="p-5">Member / ID</th>
                            <th className="p-5">Status</th>
                            <th className="p-5">Recent Access</th>
                            <th className="p-5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {loading ? (
                            [1, 2, 3].map(i => (
                                <tr key={i} className="animate-pulse">
                                    <td className="p-5"><div className="h-4 bg-surface2 rounded w-48"></div></td>
                                    <td className="p-5"><div className="h-4 bg-surface2 rounded w-20"></div></td>
                                    <td className="p-5"><div className="h-4 bg-surface2 rounded w-32"></div></td>
                                    <td className="p-5"><div className="h-8 bg-surface2 rounded w-8 ml-auto"></div></td>
                                </tr>
                            ))
                        ) : (
                            members.map((m) => (
                                <tr key={m.id} className="hover:bg-surface2/30 transition-colors group">
                                    <td className="p-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-primary-soft text-primary flex items-center justify-center font-bold text-xs">
                                                {m.email.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm tracking-tight">{m.email.split('@')[0]}</p>
                                                <p className="text-[10px] text-muted font-medium italic">{m.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-5">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${m.status === 'active' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                                            }`}>
                                            {m.status}
                                        </span>
                                    </td>
                                    <td className="p-5 text-muted font-medium text-xs">
                                        {m.last_login}
                                    </td>
                                    <td className="p-5 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button className="p-2 text-muted hover:text-primary transition-colors hover:bg-primary/10 rounded-lg" title="View Profile">
                                                <Eye size={18} />
                                            </button>
                                            <button className="p-2 text-muted hover:text-danger transition-colors hover:bg-danger/10 rounded-lg" title="Suspend">
                                                <UserMinus size={18} />
                                            </button>
                                            <button className="p-2 text-muted hover:text-fg transition-colors hover:bg-surface2 rounded-lg">
                                                <MoreHorizontal size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
