'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import AdminPageHeader from '@/components/layout/AdminPageHeader';

interface AuditLog {
    id: string;
    user_id: string | null;
    action: string;
    table_name: string | null;
    record_id: string | null;
    old_values: any;
    new_values: any;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
}

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterAction, setFilterAction] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

    const loadLogs = useCallback(async () => {
        const supabase = createClient();
        setLoading(true);
        try {
            let query = supabase
                .from('audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

            if (filterAction !== 'all') {
                query = query.eq('action', filterAction);
            }

            const { data, error } = await query;
            if (error) {
                console.error('Error loading audit logs:', error);
            } else if (data) {
                setLogs(data as unknown as AuditLog[]);
            }
        } catch (e) {
            console.error('Error:', e);
        }
        setLoading(false);
    }, [filterAction]);

    useEffect(() => { loadLogs(); }, [loadLogs]);

    const filtered = logs.filter(l => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            l.table_name?.toLowerCase().includes(term) ||
            l.action?.toLowerCase().includes(term) ||
            JSON.stringify(l.new_values || l.old_values || '').toLowerCase().includes(term) ||
            l.ip_address?.includes(term)
        );
    });

    const actionConfig: Record<string, { color: string; bg: string; icon: string }> = {
        CREATE: { color: '#22C55E', bg: 'rgba(34,197,94,0.15)', icon: '+' },
        UPDATE: { color: '#3B82F6', bg: 'rgba(59,130,246,0.15)', icon: '✎' },
        DELETE: { color: '#EF4444', bg: 'rgba(239,68,68,0.15)', icon: '✕' },
        INSERT: { color: '#22C55E', bg: 'rgba(34,197,94,0.15)', icon: '+' },
        LOGIN: { color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)', icon: '→' },
    };

    function getDetails(log: AuditLog): string {
        if (log.new_values && typeof log.new_values === 'object') {
            const entries = Object.entries(log.new_values).slice(0, 3);
            return entries.map(([k, v]) => `${k}: ${v}`).join(', ');
        }
        if (log.old_values && typeof log.old_values === 'object') {
            const entries = Object.entries(log.old_values).slice(0, 3);
            return entries.map(([k, v]) => `${k}: ${v}`).join(', ');
        }
        return '-';
    }

    function getSeverity(log: AuditLog): { color: string; bg: string; label: string } {
        if (log.action === 'DELETE') return { color: '#EF4444', bg: 'rgba(239,68,68,0.15)', label: 'CRIT' };
        if (log.action === 'UPDATE' && ['admin_roles', 'membership_plans', 'facilities'].includes(log.table_name || ''))
            return { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', label: 'WARN' };
        return { color: '#3B82F6', bg: 'rgba(59,130,246,0.15)', label: 'INFO' };
    }

    return (
        <div className="transition-all duration-500">
            <AdminPageHeader
                category="Infrastructure"
                title="Audit"
                subtitle="Logs"
            />

            <div className="p-10 max-w-[1400px] mx-auto">

                {/* Stats */}
                <div className="grid grid-cols-12 gap-6 mb-10">
                    <div className="col-span-3 kpi-card">
                        <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Total Logs</h4>
                        <p className="text-4xl font-black text-white mt-4">{logs.length}</p>
                    </div>
                    <div className="col-span-3 kpi-card">
                        <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Creates</h4>
                        <p className="text-4xl font-black text-green-400 mt-4">{logs.filter(l => l.action === 'CREATE' || l.action === 'INSERT').length}</p>
                    </div>
                    <div className="col-span-3 kpi-card">
                        <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Updates</h4>
                        <p className="text-4xl font-black text-blue-400 mt-4">{logs.filter(l => l.action === 'UPDATE').length}</p>
                    </div>
                    <div className="col-span-3 kpi-card">
                        <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Deletes</h4>
                        <p className="text-4xl font-black text-red-400 mt-4">{logs.filter(l => l.action === 'DELETE').length}</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="flex gap-2">
                        {['all', 'CREATE', 'UPDATE', 'DELETE'].map((s) => (
                            <button key={s} onClick={() => setFilterAction(s)} className={`admin-filter-btn ${filterAction === s ? 'active' : ''}`}>
                                {s === 'all' ? '전체' : s}
                            </button>
                        ))}
                    </div>
                    <input type="text" placeholder="테이블, 내용, IP 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 admin-search-input" />
                </div>

                {/* Loading */}
                {loading ? (
                    <div className="glass-card rounded-2xl p-8 animate-pulse">
                        <div className="h-4 bg-white/5 rounded w-1/3 mb-4" />
                        <div className="space-y-3">
                            {[1, 2, 3, 4].map(i => <div key={i} className="h-12 bg-white/[0.02] rounded" />)}
                        </div>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="glass-card p-16 rounded-2xl text-center">
                        <p className="text-4xl mb-4">📋</p>
                        <p className="text-white/40 text-sm">감사 로그가 없습니다</p>
                    </div>
                ) : (
                    /* Log Table */
                    <div className="glass-card rounded-2xl overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <th className="text-left p-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">시간</th>
                                    <th className="text-left p-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">액션</th>
                                    <th className="text-left p-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">리소스</th>
                                    <th className="text-left p-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">상세</th>
                                    <th className="text-left p-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">IP</th>
                                    <th className="text-left p-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Level</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((log) => {
                                    const ac = actionConfig[log.action] || { color: '#6B7280', bg: 'rgba(107,114,128,0.15)', icon: '?' };
                                    const sev = getSeverity(log);
                                    const ts = log.created_at ? new Date(log.created_at).toLocaleString('ko-KR', {
                                        year: 'numeric', month: '2-digit', day: '2-digit',
                                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                                    }) : '-';

                                    return (
                                        <tr
                                            key={log.id}
                                            className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                                            style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                                            onClick={() => setSelectedLog(log)}
                                        >
                                            <td className="p-4"><p className="text-[10px] text-white font-mono">{ts}</p></td>
                                            <td className="p-4">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase" style={{ background: ac.bg, color: ac.color }}>
                                                    {ac.icon} {log.action}
                                                </span>
                                            </td>
                                            <td className="p-4"><code className="text-[10px] text-[var(--primary)] bg-white/[0.03] px-2 py-0.5 rounded font-mono">{log.table_name || '-'}</code></td>
                                            <td className="p-4"><p className="text-[10px] text-white/60 max-w-xs truncate">{getDetails(log)}</p></td>
                                            <td className="p-4"><p className="text-[10px] text-white/40 font-mono">{log.ip_address || '-'}</p></td>
                                            <td className="p-4"><span className="px-2 py-0.5 rounded-full text-[7px] font-black uppercase" style={{ background: sev.bg, color: sev.color }}>{sev.label}</span></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Detail Panel */}
                {selectedLog && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSelectedLog(null)}>
                        <div className="glass-card p-8 rounded-2xl w-[600px] max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-black text-white">로그 상세</h3>
                                <button onClick={() => setSelectedLog(null)} className="text-white/30 hover:text-white text-xl">✕</button>
                            </div>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[9px] font-black text-[var(--text-muted)] uppercase block mb-1">Action</label>
                                        <p className="text-sm text-white font-bold">{selectedLog.action}</p>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-[var(--text-muted)] uppercase block mb-1">Table</label>
                                        <code className="text-sm text-[var(--primary)]">{selectedLog.table_name || '-'}</code>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-[var(--text-muted)] uppercase block mb-1">IP</label>
                                        <p className="text-sm text-white/60 font-mono">{selectedLog.ip_address || '-'}</p>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-[var(--text-muted)] uppercase block mb-1">Time</label>
                                        <p className="text-sm text-white/60">{selectedLog.created_at ? new Date(selectedLog.created_at).toLocaleString('ko-KR') : '-'}</p>
                                    </div>
                                </div>
                                {selectedLog.old_values && (
                                    <div>
                                        <label className="text-[9px] font-black text-[var(--text-muted)] uppercase block mb-2">이전 값</label>
                                        <pre className="text-[10px] text-red-300/70 bg-red-500/5 p-3 rounded-xl border border-red-500/10 overflow-x-auto font-mono">
                                            {JSON.stringify(selectedLog.old_values, null, 2)}
                                        </pre>
                                    </div>
                                )}
                                {selectedLog.new_values && (
                                    <div>
                                        <label className="text-[9px] font-black text-[var(--text-muted)] uppercase block mb-2">새 값</label>
                                        <pre className="text-[10px] text-green-300/70 bg-green-500/5 p-3 rounded-xl border border-green-500/10 overflow-x-auto font-mono">
                                            {JSON.stringify(selectedLog.new_values, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
