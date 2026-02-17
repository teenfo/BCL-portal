'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import AdminPageHeader from '@/components/layout/AdminPageHeader';
import { IconHeadphones } from '@/components/icons/AdminIcons';

interface Ticket {
    id: string;
    member_id: string;
    subject: string;
    description: string;
    status: string;
    priority: string;
    category: string;
    created_at: string;
    updated_at: string;
    members?: { name: string; email: string };
}

export default function SupportPage() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

    const loadTickets = useCallback(async () => {
        const supabase = createClient();
        setLoading(true);
        let query = supabase.from('support_tickets').select('*, members(name, email)').order('created_at', { ascending: false });
        if (filterStatus !== 'all') query = query.eq('status', filterStatus);
        const { data } = await query;
        if (data) setTickets(data);
        setLoading(false);
    }, [filterStatus]);

    useEffect(() => { loadTickets(); }, [loadTickets]);

    async function updateTicketStatus(id: string, status: string) {
        const supabase = createClient();
        await supabase.from('support_tickets').update({ status }).eq('id', id);
        if (selectedTicket?.id === id) setSelectedTicket({ ...selectedTicket, status });
        loadTickets();
    }

    const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
        open: { color: '#3B82F6', bg: 'rgba(59,130,246,0.15)', label: '접수' },
        in_progress: { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', label: '처리중' },
        resolved: { color: '#22C55E', bg: 'rgba(34,197,94,0.15)', label: '해결' },
        closed: { color: '#6B7280', bg: 'rgba(107,114,128,0.15)', label: '종료' },
    };

    const priorityColors: Record<string, string> = { urgent: '#EF4444', high: '#F59E0B', normal: '#3B82F6', low: '#6B7280' };

    const openCount = tickets.filter(t => t.status === 'open').length;
    const inProgressCount = tickets.filter(t => t.status === 'in_progress').length;

    return (
        <div className="transition-all duration-500">
            <AdminPageHeader
                category="CRM"
                title="Support"
                subtitle="Tickets"
            />

            <div className="p-10 max-w-[1400px] mx-auto">

                <div className="flex gap-2 mb-8">
                    {['all', 'open', 'in_progress', 'resolved', 'closed'].map((s) => (
                        <button key={s} onClick={() => setFilterStatus(s)} className={`admin-filter-btn ${filterStatus === s ? 'active' : ''}`}>
                            {s === 'all' ? '전체' : statusConfig[s]?.label || s}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-12 gap-8">
                    {/* Ticket List */}
                    <div className={`${selectedTicket ? 'col-span-5' : 'col-span-12'} space-y-2`}>
                        {loading ? (
                            <div className="flex justify-center py-64"><div className="w-10 h-10 rounded-xl border-2 border-white/5 border-t-[var(--primary)] animate-spin"></div></div>
                        ) : tickets.length === 0 ? (
                            <div className="glass-card p-20 flex flex-col items-center justify-center opacity-40"><span className="text-4xl mb-4"><IconHeadphones size={40} /></span><p className="text-[10px] font-black uppercase tracking-[0.4em]">No tickets</p></div>
                        ) : tickets.map((t) => {
                            const sc = statusConfig[t.status] || statusConfig.open;
                            return (
                                <button key={t.id} onClick={() => setSelectedTicket(t)} className={`w-full text-left p-4 rounded-2xl transition-all ${selectedTicket?.id === t.id ? 'bg-white/[0.05] border border-[var(--primary)]/30' : 'bg-white/[0.02] border border-white/[0.03] hover:border-white/10'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-xs font-black text-white line-clamp-1">{t.subject}</h4>
                                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: priorityColors[t.priority] || '#6B7280' }}></span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] text-[var(--text-muted)]">{t.members?.name} · {new Date(t.created_at).toLocaleDateString('ko-KR')}</span>
                                        <span className="px-2 py-0.5 rounded-full text-[7px] font-black uppercase" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Ticket Detail */}
                    {selectedTicket && (
                        <div className="col-span-7 glass-card p-8 rounded-2xl">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-black text-white">{selectedTicket.subject}</h3>
                                <button onClick={() => setSelectedTicket(null)} className="text-[var(--text-muted)] hover:text-white text-lg">✕</button>
                            </div>
                            <div className="space-y-4 mb-8">
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div className="p-3 rounded-xl bg-white/[0.02]"><p className="text-[8px] text-[var(--text-muted)] uppercase mb-1">Status</p><span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase" style={{ background: (statusConfig[selectedTicket.status]?.bg), color: (statusConfig[selectedTicket.status]?.color) }}>{statusConfig[selectedTicket.status]?.label}</span></div>
                                    <div className="p-3 rounded-xl bg-white/[0.02]"><p className="text-[8px] text-[var(--text-muted)] uppercase mb-1">Member</p><p className="text-xs font-bold text-white">{selectedTicket.members?.name}</p></div>
                                    <div className="p-3 rounded-xl bg-white/[0.02]"><p className="text-[8px] text-[var(--text-muted)] uppercase mb-1">Created</p><p className="text-xs font-bold text-white">{new Date(selectedTicket.created_at).toLocaleDateString('ko-KR')}</p></div>
                                </div>
                                <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.03]"><p className="text-sm text-white/80 leading-relaxed">{selectedTicket.description}</p></div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(statusConfig).map(([key, val]) => (
                                    <button key={key} onClick={() => updateTicketStatus(selectedTicket.id, key)} disabled={selectedTicket.status === key} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${selectedTicket.status === key ? 'opacity-30' : 'hover:opacity-80'}`} style={{ background: val.bg, color: val.color, border: `1px solid ${val.color}30` }}>{val.label}</button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
