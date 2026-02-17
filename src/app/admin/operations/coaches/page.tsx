'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Coach {
    id: string;
    user_id: string | null;
    name: string;
    email: string | null;
    phone: string | null;
    specialties: string[] | null;
    bio: string | null;
    profile_image_url: string | null;
    status: string;
    created_at: string;
}

export default function OperationsCoachesPage() {
    const [coaches, setCoaches] = useState<Coach[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'on_leave'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingCoach, setEditingCoach] = useState<Coach | null>(null);
    const [form, setForm] = useState({
        name: '', email: '', phone: '', specialties: '', bio: '', status: 'active',
    });

    const loadCoaches = useCallback(async () => {
        const supabase = createClient();
        setLoading(true);
        let query = supabase.from('coaches').select('*').order('name');
        if (filterStatus !== 'all') {
            query = query.eq('status', filterStatus);
        }
        const { data } = await query;
        if (data) setCoaches(data);
        setLoading(false);
    }, [filterStatus]);

    useEffect(() => { loadCoaches(); }, [loadCoaches]);

    const filteredCoaches = coaches.filter((c) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            c.name?.toLowerCase().includes(term) ||
            c.email?.toLowerCase().includes(term) ||
            c.specialties?.some(s => s.toLowerCase().includes(term))
        );
    });

    function openModal(coach?: Coach) {
        if (coach) {
            setEditingCoach(coach);
            setForm({
                name: coach.name, email: coach.email || '', phone: coach.phone || '',
                specialties: coach.specialties?.join(', ') || '', bio: coach.bio || '', status: coach.status,
            });
        } else {
            setEditingCoach(null);
            setForm({ name: '', email: '', phone: '', specialties: '', bio: '', status: 'active' });
        }
        setShowModal(true);
    }

    async function saveCoach() {
        const supabase = createClient();
        const coachData = {
            name: form.name,
            email: form.email || null,
            phone: form.phone || null,
            specialties: form.specialties ? form.specialties.split(',').map(s => s.trim()) : [],
            bio: form.bio || null,
            status: form.status,
        };

        if (editingCoach) {
            await supabase.from('coaches').update(coachData).eq('id', editingCoach.id);
        } else {
            await supabase.from('coaches').insert(coachData);
        }
        setShowModal(false);
        loadCoaches();
    }

    async function deleteCoach(id: string) {
        if (!confirm('정말 이 코치를 삭제하시겠습니까?')) return;
        const supabase = createClient();
        await supabase.from('coaches').delete().eq('id', id);
        loadCoaches();
    }

    const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
        active: { color: '#22C55E', bg: 'rgba(34,197,94,0.15)', label: '활동중' },
        inactive: { color: '#EF4444', bg: 'rgba(239,68,68,0.15)', label: '비활성' },
        on_leave: { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', label: '휴직' },
    };

    const specialtyColors: Record<string, string> = {
        'Olympic Lifting': '#3B82F6',
        'Gymnastics': '#8B5CF6',
        'Endurance': '#22C55E',
        'Strength': '#EF4444',
        'CrossFit': '#F59E0B',
        'Yoga': '#EC4899',
        'Pilates': '#06B6D4',
    };

    return (
        <div className="p-8 lg:p-12 transition-all duration-700">
            {/* Header */}
            <header className="flex items-end justify-between mb-12 animate-premium-fade">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-[var(--primary)] shadow-[0_0_15px_var(--primary-glow)]"></span>
                            <span className="text-[11px] font-black text-[var(--primary)] uppercase tracking-[0.5em] italic">Operations</span>
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight leading-none uppercase">
                            Coaches <span className="opacity-20 font-light ml-2">Management</span>
                        </h1>
                    </div>
                </div>
                <button
                    onClick={() => openModal()}
                    className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                    style={{ background: 'var(--primary)', color: '#fff', boxShadow: '0 0 20px rgba(255,107,0,0.3)' }}
                >
                    + 코치 등록
                </button>
            </header>

            {/* Filters */}
            <div className="flex items-center gap-4 mb-8">
                <div className="flex gap-2">
                    {(['all', 'active', 'inactive', 'on_leave'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilterStatus(f)}
                            className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filterStatus === f
                                ? 'bg-[var(--primary)] text-white shadow-[0_0_15px_rgba(255,107,0,0.3)]'
                                : 'bg-white/[0.03] border border-white/5 text-[var(--text-muted)] hover:text-white'
                                }`}
                        >
                            {f === 'all' ? '전체' : statusConfig[f]?.label || f}
                        </button>
                    ))}
                </div>
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="이름, 이메일, 전문 분야로 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-white placeholder-[var(--text-muted)] outline-none focus:border-[var(--primary)]/50 transition-all"
                    />
                </div>
                <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">{filteredCoaches.length}명</span>
            </div>

            {/* Coach Grid */}
            {loading ? (
                <div className="flex justify-center py-64">
                    <div className="w-10 h-10 rounded-xl border-2 border-white/5 border-t-[var(--primary)] animate-spin"></div>
                </div>
            ) : filteredCoaches.length === 0 ? (
                <div className="glass-card p-20 flex flex-col items-center justify-center text-center opacity-40">
                    <span className="text-4xl mb-4">👨‍🏫</span>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em]">No coaches found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCoaches.map((coach) => {
                        const sc = statusConfig[coach.status] || statusConfig.active;
                        return (
                            <div key={coach.id} className="glass-card p-6 rounded-2xl group hover:border-white/10 transition-all relative">
                                {/* Actions */}
                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openModal(coach)} className="px-2.5 py-1 rounded-lg text-[8px] font-black uppercase bg-white/[0.05] border border-white/5 text-white hover:border-[var(--primary)]/50 transition-all">수정</button>
                                    <button onClick={() => deleteCoach(coach.id)} className="px-2.5 py-1 rounded-lg text-[8px] font-black uppercase bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all">삭제</button>
                                </div>

                                {/* Profile */}
                                <div className="flex items-center gap-4 mb-5">
                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black" style={{ background: 'linear-gradient(135deg, rgba(255,107,0,0.3) 0%, rgba(255,107,0,0.05) 100%)', color: 'var(--primary)' }}>
                                        {coach.name?.charAt(0) || '?'}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-white group-hover:text-[var(--primary)] transition-colors">{coach.name}</h3>
                                        <p className="text-[10px] text-[var(--text-muted)]">{coach.email || 'No email'}</p>
                                    </div>
                                </div>

                                {/* Status */}
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="px-3 py-1 rounded-full text-[8px] font-black uppercase" style={{ background: sc.bg, color: sc.color }}>
                                        {sc.label}
                                    </span>
                                    {coach.phone && (
                                        <span className="text-[9px] text-[var(--text-muted)]">📞 {coach.phone}</span>
                                    )}
                                </div>

                                {/* Specialties */}
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {coach.specialties?.map((s, i) => (
                                        <span
                                            key={i}
                                            className="px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider"
                                            style={{
                                                background: `${specialtyColors[s] || '#6B7280'}15`,
                                                color: specialtyColors[s] || '#6B7280',
                                                border: `1px solid ${specialtyColors[s] || '#6B7280'}30`,
                                            }}
                                        >
                                            {s}
                                        </span>
                                    ))}
                                    {(!coach.specialties || coach.specialties.length === 0) && (
                                        <span className="text-[9px] text-[var(--text-muted)] italic">전문 분야 미설정</span>
                                    )}
                                </div>

                                {/* Bio */}
                                {coach.bio && (
                                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed line-clamp-2">{coach.bio}</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
                    <div className="glass-card p-8 rounded-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight mb-8">{editingCoach ? '코치 수정' : '새 코치 등록'}</h2>
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">이름 *</label>
                                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="코치 이름" className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-white outline-none focus:border-[var(--primary)]/50" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">이메일</label>
                                    <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="coach@bcl.com" className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-white outline-none focus:border-[var(--primary)]/50" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">전화번호</label>
                                    <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="010-1234-5678" className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-white outline-none focus:border-[var(--primary)]/50" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">상태</label>
                                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-white outline-none focus:border-[var(--primary)]/50">
                                        <option value="active">활동중</option>
                                        <option value="inactive">비활성</option>
                                        <option value="on_leave">휴직</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">전문 분야 (쉼표 구분)</label>
                                <input value={form.specialties} onChange={(e) => setForm({ ...form, specialties: e.target.value })} placeholder="Olympic Lifting, Gymnastics, Endurance" className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-white outline-none focus:border-[var(--primary)]/50" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">소개</label>
                                <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} placeholder="코치 소개를 입력하세요" className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-white outline-none focus:border-[var(--primary)]/50 resize-none" />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl bg-white/[0.03] border border-white/5 text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/[0.06] transition-all">취소</button>
                            <button onClick={saveCoach} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all" style={{ background: 'var(--primary)', boxShadow: '0 0 20px rgba(255,107,0,0.3)' }}>저장</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
