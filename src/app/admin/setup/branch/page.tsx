'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Facility {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    operating_hours: Record<string, unknown> | null;
    created_at: string;
}

export default function BranchSetupPage() {
    const [facilities, setFacilities] = useState<Facility[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
    const [form, setForm] = useState({ name: '', address: '', phone: '' });

    useEffect(() => { loadFacilities(); }, []);

    async function loadFacilities() {
        const supabase = createClient();
        setLoading(true);
        const { data } = await supabase.from('facilities').select('*').order('name');
        if (data) setFacilities(data);
        setLoading(false);
    }

    function openModal(facility?: Facility) {
        if (facility) {
            setEditingFacility(facility);
            setForm({ name: facility.name, address: facility.address || '', phone: facility.phone || '' });
        } else {
            setEditingFacility(null);
            setForm({ name: '', address: '', phone: '' });
        }
        setShowModal(true);
    }

    async function saveFacility() {
        const supabase = createClient();
        const data = { name: form.name, address: form.address || null, phone: form.phone || null };
        if (editingFacility) {
            await supabase.from('facilities').update(data).eq('id', editingFacility.id);
        } else {
            await supabase.from('facilities').insert(data);
        }
        setShowModal(false);
        loadFacilities();
    }

    async function deleteFacility(id: string) {
        if (!confirm('이 지점을 삭제하시겠습니까? 관련 데이터가 모두 영향을 받을 수 있습니다.')) return;
        const supabase = createClient();
        await supabase.from('facilities').delete().eq('id', id);
        loadFacilities();
    }

    return (
        <div className="p-8 lg:p-12">
            <header className="flex items-end justify-between mb-12">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="w-2 h-2 rounded-full bg-[var(--primary)]"></span>
                        <span className="text-[11px] font-black text-[var(--primary)] uppercase tracking-[0.5em]">Infrastructure</span>
                    </div>
                    <h1 className="text-4xl font-black text-white uppercase">Branch <span className="opacity-20 font-light ml-2">Setup</span></h1>
                </div>
                <button onClick={() => openModal()} className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest" style={{ background: 'var(--primary)', color: '#fff', boxShadow: '0 0 20px rgba(255,107,0,0.3)' }}>+ 지점 추가</button>
            </header>

            {loading ? (
                <div className="flex justify-center py-64"><div className="w-10 h-10 rounded-xl border-2 border-white/5 border-t-[var(--primary)] animate-spin"></div></div>
            ) : facilities.length === 0 ? (
                <div className="glass-card p-20 flex flex-col items-center justify-center opacity-40"><span className="text-4xl mb-4">🏢</span><p className="text-[10px] font-black uppercase tracking-[0.4em]">No branches configured</p></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {facilities.map((f) => (
                        <div key={f.id} className="glass-card p-6 rounded-2xl group hover:border-white/10 transition-all relative">
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openModal(f)} className="px-2.5 py-1 rounded-lg text-[8px] font-black uppercase bg-white/[0.05] border border-white/5 text-white">수정</button>
                                <button onClick={() => deleteFacility(f.id)} className="px-2.5 py-1 rounded-lg text-[8px] font-black uppercase bg-red-500/10 border border-red-500/20 text-red-400">삭제</button>
                            </div>
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-5 bg-white/[0.03] border border-white/5">🏢</div>
                            <h3 className="text-lg font-black text-white mb-2 group-hover:text-[var(--primary)] transition-colors">{f.name}</h3>
                            <div className="space-y-2 text-[10px]">
                                <div className="flex items-center gap-2"><span className="text-[var(--text-muted)]">📍</span><span className="text-white/60">{f.address || '주소 미설정'}</span></div>
                                <div className="flex items-center gap-2"><span className="text-[var(--text-muted)]">📞</span><span className="text-white/60">{f.phone || '번호 미설정'}</span></div>
                                <div className="flex items-center gap-2"><span className="text-[var(--text-muted)]">📅</span><span className="text-white/60">등록일: {new Date(f.created_at).toLocaleDateString('ko-KR')}</span></div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
                    <div className="glass-card p-8 rounded-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-xl font-black text-white uppercase mb-8">{editingFacility ? '지점 수정' : '새 지점 등록'}</h2>
                        <div className="space-y-5">
                            <div><label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">지점명 *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-white outline-none focus:border-[var(--primary)]/50" /></div>
                            <div><label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">주소</label><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-white outline-none focus:border-[var(--primary)]/50" /></div>
                            <div><label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">전화번호</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-white outline-none focus:border-[var(--primary)]/50" /></div>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl bg-white/[0.03] border border-white/5 text-[10px] font-black text-white uppercase">취소</button>
                            <button onClick={saveFacility} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase" style={{ background: 'var(--primary)' }}>저장</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
