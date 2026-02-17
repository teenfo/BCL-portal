'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Checkin {
    id: string;
    member_id: string;
    session_id: string | null;
    facility_id: string | null;
    booking_id: string | null;
    checkin_time: string;
    checkin_method: string;
    notes: string | null;
    created_at: string;
    members?: { name: string; email: string };
    sessions?: { title: string; session_date: string; start_time: string };
    facilities?: { name: string };
}

export default function CheckinsPage() {
    const [checkins, setCheckins] = useState<Checkin[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [filterMethod, setFilterMethod] = useState<'all' | 'qr' | 'manual' | 'kiosk' | 'face'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [showManualModal, setShowManualModal] = useState(false);
    const [manualForm, setManualForm] = useState({ member_id: '', notes: '' });
    const [members, setMembers] = useState<{ id: string; name: string; email: string }[]>([]);

    const loadCheckins = useCallback(async () => {
        const supabase = createClient();
        setLoading(true);

        let query = supabase
            .from('checkins')
            .select('*, members(name, email), sessions(title, session_date, start_time), facilities(name)')
            .gte('checkin_time', selectedDate + 'T00:00:00')
            .lte('checkin_time', selectedDate + 'T23:59:59')
            .order('checkin_time', { ascending: false });

        if (filterMethod !== 'all') {
            query = query.eq('checkin_method', filterMethod);
        }

        const { data } = await query;
        if (data) setCheckins(data);
        setLoading(false);
    }, [selectedDate, filterMethod]);

    useEffect(() => { loadCheckins(); }, [loadCheckins]);

    useEffect(() => {
        async function loadMembers() {
            const supabase = createClient();
            const { data } = await supabase.from('members').select('id, name, email').order('name');
            if (data) setMembers(data);
        }
        loadMembers();
    }, []);

    const filteredCheckins = checkins.filter((c) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            c.members?.name?.toLowerCase().includes(term) ||
            c.members?.email?.toLowerCase().includes(term)
        );
    });

    async function manualCheckin() {
        if (!manualForm.member_id) return;
        const supabase = createClient();
        await supabase.from('checkins').insert({
            member_id: manualForm.member_id,
            checkin_time: new Date().toISOString(),
            checkin_method: 'manual',
            notes: manualForm.notes || '관리자 수동 체크인',
        });
        setShowManualModal(false);
        setManualForm({ member_id: '', notes: '' });
        loadCheckins();
    }

    const methodConfig: Record<string, { icon: string; label: string; color: string }> = {
        qr: { icon: '📱', label: 'QR', color: '#22C55E' },
        manual: { icon: '✋', label: 'Manual', color: '#3B82F6' },
        kiosk: { icon: '🖥️', label: 'Kiosk', color: '#8B5CF6' },
        face: { icon: '👤', label: 'Face', color: '#F59E0B' },
    };

    // Stats
    const todayTotal = checkins.length;
    const methodStats = checkins.reduce((acc, c) => {
        acc[c.checkin_method] = (acc[c.checkin_method] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="p-8 lg:p-12 transition-all duration-700">
            {/* Header */}
            <header className="flex items-end justify-between mb-12 animate-premium-fade">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-[var(--primary)] shadow-[0_0_15px_var(--primary-glow)]"></span>
                            <span className="text-[11px] font-black text-[var(--primary)] uppercase tracking-[0.5em] italic">User &amp; Finance</span>
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight leading-none uppercase">
                            Check-in <span className="opacity-20 font-light ml-2">Logs</span>
                        </h1>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-white outline-none focus:border-[var(--primary)]/50 transition-all"
                    />
                    <button
                        onClick={() => setShowManualModal(true)}
                        className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        style={{ background: 'var(--primary)', color: '#fff', boxShadow: '0 0 20px rgba(255,107,0,0.3)' }}
                    >
                        + 수동 체크인
                    </button>
                </div>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-12 gap-6 mb-10">
                <div className="col-span-12 md:col-span-3">
                    <div className="kpi-card">
                        <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] italic">Today Total</h4>
                        <div className="mt-4">
                            <p className="text-3xl font-black text-white tracking-tighter">{todayTotal}</p>
                            <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">전체 체크인</p>
                        </div>
                    </div>
                </div>
                {Object.entries(methodConfig).map(([method, config]) => (
                    <div key={method} className="col-span-6 md:col-span-2">
                        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.03]">
                            <div className="flex items-center gap-2 mb-3">
                                <span>{config.icon}</span>
                                <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: config.color }}>{config.label}</span>
                            </div>
                            <p className="text-xl font-black text-white">{methodStats[method] || 0}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 mb-8">
                <div className="flex gap-2">
                    {(['all', 'qr', 'manual', 'kiosk', 'face'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilterMethod(f)}
                            className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filterMethod === f
                                ? 'bg-[var(--primary)] text-white shadow-[0_0_15px_rgba(255,107,0,0.3)]'
                                : 'bg-white/[0.03] border border-white/5 text-[var(--text-muted)] hover:text-white'
                                }`}
                        >
                            {f === 'all' ? '전체' : f.toUpperCase()}
                        </button>
                    ))}
                </div>
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="회원명, 이메일로 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-white placeholder-[var(--text-muted)] outline-none focus:border-[var(--primary)]/50 transition-all"
                    />
                </div>
            </div>

            {/* Checkin List */}
            {loading ? (
                <div className="flex justify-center py-64">
                    <div className="w-10 h-10 rounded-xl border-2 border-white/5 border-t-[var(--primary)] animate-spin"></div>
                </div>
            ) : filteredCheckins.length === 0 ? (
                <div className="glass-card p-20 flex flex-col items-center justify-center text-center opacity-40">
                    <span className="text-4xl mb-4">🕒</span>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em]">No check-ins for this date</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredCheckins.map((c) => {
                        const mc = methodConfig[c.checkin_method] || methodConfig.manual;
                        return (
                            <div key={c.id} className="grid grid-cols-12 gap-4 items-center p-5 rounded-2xl bg-white/[0.02] border border-white/[0.03] hover:border-white/10 transition-all group">
                                {/* Time */}
                                <div className="col-span-2">
                                    <p className="text-lg font-black text-white">
                                        {new Date(c.checkin_time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                                    </p>
                                </div>

                                {/* Member */}
                                <div className="col-span-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-black" style={{ background: 'linear-gradient(135deg, rgba(255,107,0,0.3), rgba(255,107,0,0.1))', color: 'var(--primary)' }}>
                                            {c.members?.name?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white group-hover:text-[var(--primary)] transition-colors">{c.members?.name || 'Unknown'}</p>
                                            <p className="text-[9px] text-[var(--text-muted)]">{c.members?.email}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Session */}
                                <div className="col-span-3">
                                    {c.sessions ? (
                                        <div>
                                            <p className="text-xs font-bold text-white uppercase">{c.sessions.title}</p>
                                            <p className="text-[9px] text-[var(--text-muted)] mt-0.5">{c.sessions.start_time}</p>
                                        </div>
                                    ) : (
                                        <p className="text-[9px] text-[var(--text-muted)] italic">일반 입장</p>
                                    )}
                                </div>

                                {/* Facility */}
                                <div className="col-span-2">
                                    <p className="text-xs text-white">{c.facilities?.name || '-'}</p>
                                </div>

                                {/* Method */}
                                <div className="col-span-2 flex items-center gap-2">
                                    <span>{mc.icon}</span>
                                    <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: mc.color }}>{mc.label}</span>
                                    {c.notes && (
                                        <span className="text-[8px] text-[var(--text-muted)] truncate max-w-[80px]" title={c.notes}>({c.notes})</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Manual Checkin Modal */}
            {showManualModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowManualModal(false)}>
                    <div className="glass-card p-8 rounded-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight mb-8">수동 체크인</h2>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">회원 선택</label>
                                <select
                                    value={manualForm.member_id}
                                    onChange={(e) => setManualForm({ ...manualForm, member_id: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-white outline-none focus:border-[var(--primary)]/50"
                                >
                                    <option value="">회원을 선택하세요</option>
                                    {members.map((m) => (
                                        <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">비고</label>
                                <input
                                    type="text"
                                    value={manualForm.notes}
                                    onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                                    placeholder="예: QR 미지참, 단말기 오류 등"
                                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-white placeholder-[var(--text-muted)] outline-none focus:border-[var(--primary)]/50"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <button onClick={() => setShowManualModal(false)} className="flex-1 py-3 rounded-xl bg-white/[0.03] border border-white/5 text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/[0.06] transition-all">취소</button>
                            <button onClick={manualCheckin} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all" style={{ background: 'var(--primary)', boxShadow: '0 0 20px rgba(255,107,0,0.3)' }}>체크인 처리</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
