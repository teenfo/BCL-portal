'use client';

import { useState } from 'react';
import AdminPageHeader from '@/components/layout/AdminPageHeader';

interface AuditLog {
    id: string;
    timestamp: string;
    user: string;
    role: string;
    action: string;
    resource: string;
    details: string;
    ip: string;
    severity: 'info' | 'warning' | 'critical';
}

export default function AuditLogsPage() {
    const [filterSeverity, setFilterSeverity] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const logs: AuditLog[] = [
        { id: '1', timestamp: '2026-02-17 13:45:21', user: 'admin@bcl.com', role: 'Super Admin', action: 'UPDATE', resource: 'membership_plans', details: '월간 무제한 플랜 가격 변경: ₩200,000 → ₩220,000', ip: '192.168.1.100', severity: 'warning' },
        { id: '2', timestamp: '2026-02-17 13:30:15', user: 'manager@bcl.com', role: 'Branch Manager', action: 'CREATE', resource: 'notices', details: '공지사항 작성: "2월 점검 안내"', ip: '192.168.1.101', severity: 'info' },
        { id: '3', timestamp: '2026-02-17 12:20:00', user: 'admin@bcl.com', role: 'Super Admin', action: 'DELETE', resource: 'members', details: '회원 삭제: ID #1234 (탈퇴 요청)', ip: '192.168.1.100', severity: 'critical' },
        { id: '4', timestamp: '2026-02-17 11:00:00', user: 'coach@bcl.com', role: 'Coach', action: 'UPDATE', resource: 'sessions', details: '수업 시간 변경: WOD Classic 09:00 → 10:00', ip: '192.168.1.105', severity: 'info' },
        { id: '5', timestamp: '2026-02-17 10:30:00', user: 'admin@bcl.com', role: 'Super Admin', action: 'UPDATE', resource: 'roles', details: 'Coach 역할 권한 수정: bookings.manage 추가', ip: '192.168.1.100', severity: 'warning' },
        { id: '6', timestamp: '2026-02-16 18:00:00', user: 'manager@bcl.com', role: 'Branch Manager', action: 'CREATE', resource: 'memberships', details: '멤버십 생성: 김민수 - 3개월 무제한', ip: '192.168.1.101', severity: 'info' },
        { id: '7', timestamp: '2026-02-16 15:30:00', user: 'admin@bcl.com', role: 'Super Admin', action: 'UPDATE', resource: 'facilities', details: '지점 운영시간 변경: Main Center', ip: '192.168.1.100', severity: 'info' },
    ];

    const filtered = logs.filter(l => {
        if (filterSeverity !== 'all' && l.severity !== filterSeverity) return false;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            return l.user.toLowerCase().includes(term) || l.resource.toLowerCase().includes(term) || l.details.toLowerCase().includes(term);
        }
        return true;
    });

    const severityConfig: Record<string, { color: string; bg: string; label: string }> = {
        info: { color: '#3B82F6', bg: 'rgba(59,130,246,0.15)', label: 'INFO' },
        warning: { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', label: 'WARN' },
        critical: { color: '#EF4444', bg: 'rgba(239,68,68,0.15)', label: 'CRIT' },
    };

    const actionColors: Record<string, string> = { CREATE: '#22C55E', UPDATE: '#3B82F6', DELETE: '#EF4444' };

    return (
        <div className="transition-all duration-500">
            <AdminPageHeader
                category="Infrastructure"
                title="Audit"
                subtitle="Logs"
            />

            <div className="p-10 max-w-[1400px] mx-auto">

                {/* Filters */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="flex gap-2">
                        {['all', 'info', 'warning', 'critical'].map((s) => (
                            <button key={s} onClick={() => setFilterSeverity(s)} className={`admin-filter-btn ${filterSeverity === s ? 'active' : ''}`}>
                                {s === 'all' ? '전체' : severityConfig[s]?.label}
                            </button>
                        ))}
                    </div>
                    <input type="text" placeholder="사용자, 리소스, 내용 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 admin-search-input" />
                </div>

                {/* Log List */}
                <div className="glass-card rounded-2xl overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <th className="text-left p-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">시간</th>
                                <th className="text-left p-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">사용자</th>
                                <th className="text-left p-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">액션</th>
                                <th className="text-left p-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">리소스</th>
                                <th className="text-left p-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">상세</th>
                                <th className="text-left p-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Level</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((log) => {
                                const sc = severityConfig[log.severity];
                                return (
                                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                        <td className="p-4"><p className="text-[10px] text-white font-mono">{log.timestamp}</p></td>
                                        <td className="p-4"><p className="text-xs text-white font-bold">{log.user}</p><p className="text-[8px] text-[var(--text-muted)]">{log.role} · {log.ip}</p></td>
                                        <td className="p-4"><span className="text-[9px] font-black uppercase" style={{ color: actionColors[log.action] || '#6B7280' }}>{log.action}</span></td>
                                        <td className="p-4"><code className="text-[10px] text-[var(--primary)] bg-white/[0.03] px-2 py-0.5 rounded font-mono">{log.resource}</code></td>
                                        <td className="p-4"><p className="text-[10px] text-white/60 max-w-xs truncate">{log.details}</p></td>
                                        <td className="p-4"><span className="px-2 py-0.5 rounded-full text-[7px] font-black uppercase" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
