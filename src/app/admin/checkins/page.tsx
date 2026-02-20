'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { query, rpc } from '@/lib/supabase/query';
import AdminPageHeader from '@/components/layout/AdminPageHeader';
import AdminModal from '@/components/layout/AdminModal';
import { IconQRCode, IconSmartphone, IconMonitor, IconUser, IconHand, IconFaceId, IconClock } from '@/components/icons/AdminIcons';

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

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let dbQ: any = query('checkins')
                .select('*, members!checkins_member_id_fkey(name, email), sessions!checkins_session_id_fkey(title, session_date, start_time), facilities!checkins_facility_id_fkey(name)')
                .gte('checkin_time', selectedDate + 'T00:00:00')
                .lte('checkin_time', selectedDate + 'T23:59:59')
                .order('checkin_time', { ascending: false });

            if (filterMethod !== 'all') {
                dbQ = dbQ.eq('checkin_method', filterMethod);
            }

            const { data, error } = await dbQ;

            if (error) {
                // Fallback: query without joins using 'time' column
                console.warn('Checkins JOIN query failed, trying fallback:', error.message);
                let fallbackQuery: any = query('checkins')
                    
                    .select('*')
                    .order('created_at', { ascending: false });

                const { data: fallbackData } = await fallbackQuery;
                if (fallbackData) {
                    // Map old column names to expected interface
                    const mapped = fallbackData.map((c: any) => ({
                        ...c,
                        checkin_time: c.checkin_time || c.time || c.created_at,
                        checkin_method: c.checkin_method || 'manual',
                        members: { name: c.member_name || 'Unknown', email: '' },
                    }));
                    // Filter by date
                    const filtered = mapped.filter((c: any) => {
                        const ct = c.checkin_time;
                        return ct && ct >= selectedDate + 'T00:00:00' && ct <= selectedDate + 'T23:59:59';
                    });
                    setCheckins(filtered as Checkin[]);
                }
            } else {
                if (data) setCheckins(data as Checkin[]);
            }
        } catch (e) {
            console.error('Error loading checkins:', e);
        }
        setLoading(false);
    }, [selectedDate, filterMethod]);

    useEffect(() => { loadCheckins(); }, [loadCheckins]);

    // Realtime subscription - 오늘 날짜일 때만 활성화
    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        if (selectedDate !== today) return;

        const supabase = createClient();
        const channel = supabase
            .channel('checkins-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'checkins',
                },
                () => {
                    loadCheckins();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedDate, loadCheckins]);

    useEffect(() => {
        async function loadMembers() {
            const supabase = createClient();
            const { data } = await query('members').select('id, name, email').order('name');
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
        await query('checkins').insert({
            member_id: manualForm.member_id,
            checkin_time: new Date().toISOString(),
            checkin_method: 'manual',
            notes: manualForm.notes || '관리자 수동 체크인',
        });
        setShowManualModal(false);
        setManualForm({ member_id: '', notes: '' });
        loadCheckins();
    }

    const methodConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
        qr: { icon: <IconQRCode size={16} />, label: 'QR', color: '#22C55E' },
        manual: { icon: <IconHand size={16} />, label: 'Manual', color: '#3B82F6' },
        kiosk: { icon: <IconMonitor size={16} />, label: 'Kiosk', color: '#8B5CF6' },
        face: { icon: <IconFaceId size={16} />, label: 'Face', color: '#F59E0B' },
    };

    // Stats
    const todayTotal = checkins.length;
    const methodStats = checkins.reduce((acc, c) => {
        acc[c.checkin_method] = (acc[c.checkin_method] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="transition-all duration-500">
            <AdminPageHeader
                category="Operations"
                title="Check-ins"
                subtitle="Live Stream"
                actions={<button onClick={() => setShowManualModal(true)} className="admin-action-btn">+ 수동 체크인</button>}
            />

            <div className="p-10 max-w-[1400px] mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="admin-search-input"
                        />
                    </div>
                    <div className="flex-1" />
                    <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                        {filteredCheckins.length}건
                    </span>
                </div>

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
                                className={`admin-filter-btn ${filterMethod === f ? 'active' : ''}`}
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
                            className="admin-search-input"
                        />
                    </div>
                </div>

                {/* Checkin List */}
                {
                    loading ? (
                        <div className="flex justify-center py-64">
                            <div className="w-10 h-10 rounded-xl border-2 border-white/5 border-t-[var(--primary)] animate-spin"></div>
                        </div>
                    ) : filteredCheckins.length === 0 ? (
                        <div className="glass-card p-20 flex flex-col items-center justify-center text-center opacity-40">
                            <span className="text-4xl mb-4"><IconClock size={40} /></span>
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
                    )
                }

                {/* Manual Checkin Modal */}
                <AdminModal show={showManualModal} onClose={() => setShowManualModal(false)} title="수동 체크인">
                    <div className="space-y-5">
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">회원 선택</label>
                            <select
                                value={manualForm.member_id}
                                onChange={(e) => setManualForm({ ...manualForm, member_id: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
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
                                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 mt-8">
                        <button onClick={() => setShowManualModal(false)} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/[0.06] transition-all" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>취소</button>
                        <button onClick={manualCheckin} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all" style={{ background: 'var(--primary)', boxShadow: '0 0 20px rgba(255,107,0,0.3)' }}>체크인 처리</button>
                    </div>
                </AdminModal>
            </div>
        </div>
    );
}
