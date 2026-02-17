'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import AdminPageHeader from '@/components/layout/AdminPageHeader';
import AdminModal from '@/components/layout/AdminModal';
import { IconMegaphone, IconPalette } from '@/components/icons/AdminIcons';

interface Notice {
    id: string;
    facility_id: string | null;
    title: string;
    content: string;
    category: string;
    priority: string;
    is_published: boolean;
    published_at: string | null;
    created_at: string;
    facilities?: { name: string };
}

export default function ContentPage() {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'notices' | 'banners'>('notices');
    const [showModal, setShowModal] = useState(false);
    const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
    const [form, setForm] = useState({ title: '', content: '', category: 'general', priority: 'normal', is_published: false });
    const [filterCategory, setFilterCategory] = useState('all');

    const loadNotices = useCallback(async () => {
        const supabase = createClient();
        setLoading(true);
        let query = supabase.from('notices').select('*, facilities(name)').order('created_at', { ascending: false });
        if (filterCategory !== 'all') query = query.eq('category', filterCategory);
        const { data } = await query;
        if (data) setNotices(data);
        setLoading(false);
    }, [filterCategory]);

    useEffect(() => { loadNotices(); }, [loadNotices]);

    function openModal(notice?: Notice) {
        if (notice) {
            setEditingNotice(notice);
            setForm({ title: notice.title, content: notice.content, category: notice.category, priority: notice.priority, is_published: notice.is_published });
        } else {
            setEditingNotice(null);
            setForm({ title: '', content: '', category: 'general', priority: 'normal', is_published: false });
        }
        setShowModal(true);
    }

    async function saveNotice() {
        const supabase = createClient();
        const data = { ...form, published_at: form.is_published ? new Date().toISOString() : null };
        if (editingNotice) {
            await supabase.from('notices').update(data).eq('id', editingNotice.id);
        } else {
            await supabase.from('notices').insert(data);
        }
        setShowModal(false);
        loadNotices();
    }

    async function deleteNotice(id: string) {
        if (!confirm('이 공지를 삭제하시겠습니까?')) return;
        const supabase = createClient();
        await supabase.from('notices').delete().eq('id', id);
        loadNotices();
    }

    async function togglePublish(notice: Notice) {
        const supabase = createClient();
        await supabase.from('notices').update({ is_published: !notice.is_published, published_at: !notice.is_published ? new Date().toISOString() : null }).eq('id', notice.id);
        loadNotices();
    }

    const priorityConfig: Record<string, { color: string; label: string }> = {
        urgent: { color: '#EF4444', label: '긴급' },
        high: { color: '#F59E0B', label: '중요' },
        normal: { color: '#3B82F6', label: '일반' },
        low: { color: '#6B7280', label: '낮음' },
    };

    return (
        <div className="transition-all duration-500">
            <AdminPageHeader
                category="CRM"
                title="Content"
                subtitle="Management"
                actions={<button onClick={() => openModal()} className="admin-action-btn">+ 공지 작성</button>}
            />

            <div className="p-10 max-w-[1400px] mx-auto">

                <div className="flex gap-2 mb-8">
                    {(['notices', 'banners'] as const).map((tab) => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all" style={activeTab === tab ? { background: 'var(--primary)', color: '#fff', boxShadow: '0 0 15px rgba(255,107,0,0.3)' } : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}>
                            {tab === 'notices' ? <span className="inline-flex items-center gap-1"><IconMegaphone size={14} /> 공지사항</span> : <span className="inline-flex items-center gap-1"><IconPalette size={14} /> 배너</span>}
                        </button>
                    ))}
                </div>

                {activeTab === 'notices' && (
                    <>
                        <div className="flex gap-2 mb-6">
                            {['all', 'general', 'schedule', 'event', 'maintenance'].map((cat) => (
                                <button key={cat} onClick={() => setFilterCategory(cat)} className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all" style={filterCategory === cat ? { background: 'var(--primary)', color: '#fff', boxShadow: '0 0 15px rgba(255,107,0,0.3)' } : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}>
                                    {cat === 'all' ? '전체' : cat === 'general' ? '일반' : cat === 'schedule' ? '스케줄' : cat === 'event' ? '이벤트' : '점검'}
                                </button>
                            ))}
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-64"><div className="w-10 h-10 rounded-xl border-2 border-white/5 border-t-[var(--primary)] animate-spin"></div></div>
                        ) : notices.length === 0 ? (
                            <div className="glass-card p-20 flex flex-col items-center justify-center opacity-40"><span className="text-4xl mb-4"><IconMegaphone size={40} /></span><p className="text-[10px] font-black uppercase tracking-[0.4em]">No notices</p></div>
                        ) : (
                            <div className="space-y-3">
                                {notices.map((n) => {
                                    const pc = priorityConfig[n.priority] || priorityConfig.normal;
                                    return (
                                        <div key={n.id} className="grid grid-cols-12 gap-4 items-center p-5 rounded-2xl bg-white/[0.02] border border-white/[0.03] hover:border-white/10 transition-all group">
                                            <div className="col-span-5">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-1.5 h-8 rounded-full" style={{ background: pc.color }}></span>
                                                    <div>
                                                        <h4 className="text-sm font-black text-white">{n.title}</h4>
                                                        <p className="text-[9px] text-[var(--text-muted)] mt-1 line-clamp-1">{n.content}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-span-1"><span className="text-[8px] font-black uppercase" style={{ color: pc.color }}>{pc.label}</span></div>
                                            <div className="col-span-2"><span className="text-[10px] text-[var(--text-muted)]">{new Date(n.created_at).toLocaleDateString('ko-KR')}</span></div>
                                            <div className="col-span-1">
                                                <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase ${n.is_published ? 'bg-green-500/15 text-green-400' : 'bg-white/5 text-white/30'}`}>
                                                    {n.is_published ? '게시중' : '비공개'}
                                                </span>
                                            </div>
                                            <div className="col-span-3 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => togglePublish(n)} className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase ${n.is_published ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400' : 'bg-green-500/10 border border-green-500/20 text-green-400'}`}>
                                                    {n.is_published ? '비공개' : '게시'}
                                                </button>
                                                <button onClick={() => openModal(n)} className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase bg-white/[0.03] border border-white/5 text-white">수정</button>
                                                <button onClick={() => deleteNotice(n.id)} className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase bg-red-500/10 border border-red-500/20 text-red-400">삭제</button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'banners' && (
                    <div className="glass-card p-20 flex flex-col items-center justify-center opacity-40">
                        <span className="text-4xl mb-4"><IconPalette size={40} /></span>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em]">배너 관리 기능 준비 중</p>
                    </div>
                )}

                <AdminModal show={showModal} onClose={() => setShowModal(false)} title={editingNotice ? '공지 수정' : '새 공지 작성'}>
                    <div className="space-y-5">
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">제목</label>
                            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">내용</label>
                            <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={5} className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all resize-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">카테고리</label>
                                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <option value="general">일반</option><option value="schedule">스케줄</option><option value="event">이벤트</option><option value="maintenance">점검</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">우선순위</label>
                                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <option value="urgent">긴급</option><option value="high">중요</option><option value="normal">일반</option><option value="low">낮음</option>
                                </select>
                            </div>
                        </div>
                        <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} className="w-4 h-4 rounded" /><span className="text-[10px] font-black text-white uppercase tracking-widest">즉시 게시</span></label>
                    </div>
                    <div className="flex gap-3 mt-8">
                        <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/[0.06] transition-all" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>취소</button>
                        <button onClick={saveNotice} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all" style={{ background: 'var(--primary)', boxShadow: '0 0 20px rgba(255,107,0,0.3)' }}>저장</button>
                    </div>
                </AdminModal>
            </div>
        </div>
    );
}
