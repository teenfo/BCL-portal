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

interface Banner {
    id: string;
    title: string;
    description: string;
    image_url: string;
    link_url: string;
    position: string;
    priority_order: number;
    is_active: boolean;
    start_date: string;
    end_date: string;
    created_at: string;
}

interface BannerForm {
    title: string;
    description: string;
    image_url: string;
    link_url: string;
    position: string;
    priority_order: number;
    is_active: boolean;
    start_date: string;
    end_date: string;
}

function generateMockBanners(): Banner[] {
    const now = new Date();
    const in30 = new Date();
    in30.setDate(in30.getDate() + 30);
    const past = new Date();
    past.setDate(past.getDate() - 5);

    return [
        {
            id: 'bn-1',
            title: '🎄 크리스마스 특별 프로모션',
            description: '12월 한 달간 신규 등록 시 20% 할인',
            image_url: '/images/banners/christmas.jpg',
            link_url: '/apps/promotions/christmas',
            position: 'home_top',
            priority_order: 1,
            is_active: true,
            start_date: now.toISOString(),
            end_date: in30.toISOString(),
            created_at: past.toISOString(),
        },
        {
            id: 'bn-2',
            title: '🏋️ 신규 PT 프로그램 오픈',
            description: '1:1 PT 프로그램으로 목표를 달성하세요',
            image_url: '/images/banners/pt.jpg',
            link_url: '/apps/schedule',
            position: 'home_middle',
            priority_order: 2,
            is_active: true,
            start_date: now.toISOString(),
            end_date: in30.toISOString(),
            created_at: past.toISOString(),
        },
        {
            id: 'bn-3',
            title: '⏰ 운영시간 변경 안내',
            description: '1월부터 토요일 운영시간이 08:00~18:00으로 변경됩니다',
            image_url: '/images/banners/notice.jpg',
            link_url: '',
            position: 'home_top',
            priority_order: 3,
            is_active: false,
            start_date: past.toISOString(),
            end_date: now.toISOString(),
            created_at: past.toISOString(),
        },
        {
            id: 'bn-4',
            title: '🏆 월간 챌린지 참가자 모집',
            description: '2월 로잉 챌린지에 도전해보세요',
            image_url: '/images/banners/challenge.jpg',
            link_url: '/apps/race',
            position: 'home_bottom',
            priority_order: 4,
            is_active: true,
            start_date: now.toISOString(),
            end_date: in30.toISOString(),
            created_at: past.toISOString(),
        },
    ];
}

const POSITION_CONFIG: Record<string, { label: string; color: string }> = {
    home_top: { label: '홈 상단', color: '#F59E0B' },
    home_middle: { label: '홈 중단', color: '#3B82F6' },
    home_bottom: { label: '홈 하단', color: '#8B5CF6' },
    popup: { label: '팝업', color: '#EF4444' },
    event: { label: '이벤트', color: '#22C55E' },
};

export default function ContentPage() {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'notices' | 'banners'>('notices');
    const [showModal, setShowModal] = useState(false);
    const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
    const [form, setForm] = useState({ title: '', content: '', category: 'general', priority: 'normal', is_published: false });
    const [filterCategory, setFilterCategory] = useState('all');

    // Banner States
    const [showBannerModal, setShowBannerModal] = useState(false);
    const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
    const [bannerFilterPosition, setBannerFilterPosition] = useState('all');

    const emptyBannerForm: BannerForm = {
        title: '',
        description: '',
        image_url: '',
        link_url: '',
        position: 'home_top',
        priority_order: 1,
        is_active: true,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    };
    const [bannerForm, setBannerForm] = useState<BannerForm>(emptyBannerForm);

    const loadNotices = useCallback(async () => {
        const supabase = createClient();
        setLoading(true);
        let query = supabase.from('notices').select('*, facilities(name)').order('created_at', { ascending: false });
        if (filterCategory !== 'all') query = query.eq('category', filterCategory);
        const { data } = await query;
        if (data) setNotices(data as any);
        setLoading(false);
    }, [filterCategory]);

    const loadBanners = useCallback(async () => {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('banners')
            .select('*')
            .order('priority_order', { ascending: true });

        if (error || !data || data.length === 0) {
            setBanners(generateMockBanners());
        } else {
            setBanners(data);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'notices') loadNotices();
        else loadBanners();
    }, [activeTab, loadNotices, loadBanners]);

    // ---- NOTICES ----
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

    // ---- BANNERS ----
    function openBannerModal(banner?: Banner) {
        if (banner) {
            setEditingBanner(banner);
            setBannerForm({
                title: banner.title,
                description: banner.description,
                image_url: banner.image_url,
                link_url: banner.link_url,
                position: banner.position,
                priority_order: banner.priority_order,
                is_active: banner.is_active,
                start_date: new Date(banner.start_date).toISOString().split('T')[0],
                end_date: new Date(banner.end_date).toISOString().split('T')[0],
            });
        } else {
            setEditingBanner(null);
            setBannerForm(emptyBannerForm);
        }
        setShowBannerModal(true);
    }

    async function saveBanner() {
        const supabase = createClient();
        const payload = {
            ...bannerForm,
            start_date: new Date(bannerForm.start_date).toISOString(),
            end_date: new Date(bannerForm.end_date).toISOString(),
        };
        if (editingBanner) {
            await supabase.from('banners').update(payload).eq('id', editingBanner.id);
        } else {
            await supabase.from('banners').insert(payload);
        }
        setShowBannerModal(false);
        loadBanners();
    }

    async function deleteBanner(id: string) {
        if (!confirm('이 배너를 삭제하시겠습니까?')) return;
        const supabase = createClient();
        await supabase.from('banners').delete().eq('id', id);
        loadBanners();
    }

    async function toggleBannerActive(banner: Banner) {
        const supabase = createClient();
        await supabase.from('banners').update({ is_active: !banner.is_active }).eq('id', banner.id);
        // Optimistic update for mock data
        setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, is_active: !b.is_active } : b));
    }

    function moveBannerOrder(bannerId: string, direction: 'up' | 'down') {
        setBanners(prev => {
            const idx = prev.findIndex(b => b.id === bannerId);
            if (idx < 0) return prev;
            const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
            if (swapIdx < 0 || swapIdx >= prev.length) return prev;
            const newArr = [...prev];
            [newArr[idx], newArr[swapIdx]] = [newArr[swapIdx], newArr[idx]];
            return newArr.map((b, i) => ({ ...b, priority_order: i + 1 }));
        });
    }

    const filteredBanners = bannerFilterPosition === 'all' ? banners : banners.filter(b => b.position === bannerFilterPosition);

    // Banner KPI
    const activeBanners = banners.filter(b => b.is_active).length;
    const expiredBanners = banners.filter(b => new Date(b.end_date) < new Date()).length;

    return (
        <div className="transition-all duration-500">
            <AdminPageHeader
                category="CRM"
                title="Content"
                subtitle="Management"
                actions={
                    activeTab === 'notices'
                        ? <button onClick={() => openModal()} className="admin-action-btn">+ 공지 작성</button>
                        : <button onClick={() => openBannerModal()} className="admin-action-btn">+ 배너 추가</button>
                }
            />

            <div className="p-10 max-w-[1400px] mx-auto">

                <div className="flex gap-2 mb-8">
                    {(['notices', 'banners'] as const).map((tab) => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all" style={activeTab === tab ? { background: 'var(--primary)', color: '#fff', boxShadow: '0 0 15px rgba(255,107,0,0.3)' } : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}>
                            {tab === 'notices' ? <span className="inline-flex items-center gap-1"><IconMegaphone size={14} /> 공지사항</span> : <span className="inline-flex items-center gap-1"><IconPalette size={14} /> 배너</span>}
                        </button>
                    ))}
                </div>

                {/* ====== NOTICES TAB ====== */}
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

                {/* ====== BANNERS TAB ====== */}
                {activeTab === 'banners' && (
                    <>
                        {/* KPI Cards */}
                        <div className="grid grid-cols-3 gap-4 mb-8">
                            {[
                                { label: '총 배너', value: banners.length, color: '#3B82F6' },
                                { label: '활성 배너', value: activeBanners, color: '#22C55E' },
                                { label: '만료된 배너', value: expiredBanners, color: '#EF4444' },
                            ].map((kpi) => (
                                <div key={kpi.label} className="glass-card p-5 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${kpi.color}15` }}>
                                        <span className="text-lg font-black" style={{ color: kpi.color }}>{kpi.value}</span>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em]">{kpi.label}</p>
                                        <p className="text-xl font-black text-white">{kpi.value}개</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Position Filter */}
                        <div className="flex gap-2 mb-6">
                            <button
                                onClick={() => setBannerFilterPosition('all')}
                                className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all"
                                style={bannerFilterPosition === 'all' ? { background: 'var(--primary)', color: '#fff', boxShadow: '0 0 15px rgba(255,107,0,0.3)' } : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}
                            >
                                전체
                            </button>
                            {Object.entries(POSITION_CONFIG).map(([key, cfg]) => (
                                <button
                                    key={key}
                                    onClick={() => setBannerFilterPosition(key)}
                                    className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all"
                                    style={bannerFilterPosition === key ? { background: cfg.color, color: '#fff', boxShadow: `0 0 15px ${cfg.color}40` } : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}
                                >
                                    {cfg.label}
                                </button>
                            ))}
                        </div>

                        {/* Banner List */}
                        {filteredBanners.length === 0 ? (
                            <div className="glass-card p-20 flex flex-col items-center justify-center opacity-40">
                                <span className="text-4xl mb-4"><IconPalette size={40} /></span>
                                <p className="text-[10px] font-black uppercase tracking-[0.4em]">등록된 배너가 없습니다</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredBanners.map((banner, idx) => {
                                    const posConfig = POSITION_CONFIG[banner.position] || { label: banner.position, color: '#6B7280' };
                                    const isExpired = new Date(banner.end_date) < new Date();
                                    return (
                                        <div key={banner.id} className="grid grid-cols-12 gap-4 items-center p-5 rounded-2xl bg-white/[0.02] border border-white/[0.03] hover:border-white/10 transition-all group">
                                            {/* Order & Preview */}
                                            <div className="col-span-1 flex flex-col items-center gap-1">
                                                <button
                                                    onClick={() => moveBannerOrder(banner.id, 'up')}
                                                    disabled={idx === 0}
                                                    className="text-[10px] text-white/20 hover:text-white disabled:opacity-20 transition-all"
                                                >▲</button>
                                                <span className="text-lg font-black text-white/20">#{banner.priority_order}</span>
                                                <button
                                                    onClick={() => moveBannerOrder(banner.id, 'down')}
                                                    disabled={idx === filteredBanners.length - 1}
                                                    className="text-[10px] text-white/20 hover:text-white disabled:opacity-20 transition-all"
                                                >▼</button>
                                            </div>
                                            {/* Banner Image Preview */}
                                            <div className="col-span-2">
                                                <div className="w-full h-16 rounded-lg overflow-hidden flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                                    {banner.image_url ? (
                                                        <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-white/30 uppercase">
                                                            🖼️ {banner.image_url.split('/').pop()}
                                                        </div>
                                                    ) : (
                                                        <IconPalette size={20} className="text-white/20" />
                                                    )}
                                                </div>
                                            </div>
                                            {/* Info */}
                                            <div className="col-span-3">
                                                <h4 className="text-sm font-black text-white">{banner.title}</h4>
                                                <p className="text-[9px] text-[var(--text-muted)] mt-1 line-clamp-1">{banner.description}</p>
                                            </div>
                                            {/* Position */}
                                            <div className="col-span-1">
                                                <span className="px-2 py-1 rounded text-[8px] font-black uppercase" style={{ background: `${posConfig.color}15`, color: posConfig.color }}>
                                                    {posConfig.label}
                                                </span>
                                            </div>
                                            {/* Period */}
                                            <div className="col-span-2">
                                                <p className="text-[9px] text-[var(--text-muted)]">
                                                    {new Date(banner.start_date).toLocaleDateString('ko-KR')}
                                                </p>
                                                <p className="text-[9px] text-[var(--text-muted)]">
                                                    ~ {new Date(banner.end_date).toLocaleDateString('ko-KR')}
                                                </p>
                                            </div>
                                            {/* Status */}
                                            <div className="col-span-1">
                                                {isExpired ? (
                                                    <span className="px-2.5 py-1 rounded-full text-[8px] font-black uppercase bg-red-500/15 text-red-400">만료</span>
                                                ) : banner.is_active ? (
                                                    <span className="px-2.5 py-1 rounded-full text-[8px] font-black uppercase bg-green-500/15 text-green-400">활성</span>
                                                ) : (
                                                    <span className="px-2.5 py-1 rounded-full text-[8px] font-black uppercase bg-white/5 text-white/30">비활성</span>
                                                )}
                                            </div>
                                            {/* Actions */}
                                            <div className="col-span-2 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => toggleBannerActive(banner)}
                                                    className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase ${banner.is_active ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400' : 'bg-green-500/10 border border-green-500/20 text-green-400'}`}
                                                >
                                                    {banner.is_active ? '비활성' : '활성'}
                                                </button>
                                                <button onClick={() => openBannerModal(banner)} className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase bg-white/[0.03] border border-white/5 text-white">수정</button>
                                                <button onClick={() => deleteBanner(banner.id)} className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase bg-red-500/10 border border-red-500/20 text-red-400">삭제</button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {/* ====== NOTICE MODAL ====== */}
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

                {/* ====== BANNER MODAL ====== */}
                <AdminModal show={showBannerModal} onClose={() => setShowBannerModal(false)} title={editingBanner ? '배너 수정' : '새 배너 추가'} width="580px">
                    <div className="space-y-5">
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">배너 제목</label>
                            <input
                                value={bannerForm.title}
                                onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                                placeholder="예: 크리스마스 특별 프로모션"
                                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">설명</label>
                            <textarea
                                value={bannerForm.description}
                                onChange={(e) => setBannerForm({ ...bannerForm, description: e.target.value })}
                                rows={3}
                                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all resize-none"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">이미지 URL</label>
                                <input
                                    value={bannerForm.image_url}
                                    onChange={(e) => setBannerForm({ ...bannerForm, image_url: e.target.value })}
                                    placeholder="/images/banners/..."
                                    className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">링크 URL</label>
                                <input
                                    value={bannerForm.link_url}
                                    onChange={(e) => setBannerForm({ ...bannerForm, link_url: e.target.value })}
                                    placeholder="/apps/promotions/..."
                                    className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">노출 위치</label>
                                <select
                                    value={bannerForm.position}
                                    onChange={(e) => setBannerForm({ ...bannerForm, position: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                                >
                                    {Object.entries(POSITION_CONFIG).map(([key, cfg]) => (
                                        <option key={key} value={key}>{cfg.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">노출 순서</label>
                                <input
                                    type="number"
                                    value={bannerForm.priority_order}
                                    onChange={(e) => setBannerForm({ ...bannerForm, priority_order: parseInt(e.target.value) || 1 })}
                                    min={1}
                                    className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">시작일</label>
                                <input
                                    type="date"
                                    value={bannerForm.start_date}
                                    onChange={(e) => setBannerForm({ ...bannerForm, start_date: e.target.value })}
                                    className="admin-search-input w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">종료일</label>
                                <input
                                    type="date"
                                    value={bannerForm.end_date}
                                    onChange={(e) => setBannerForm({ ...bannerForm, end_date: e.target.value })}
                                    className="admin-search-input w-full"
                                />
                            </div>
                        </div>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={bannerForm.is_active} onChange={(e) => setBannerForm({ ...bannerForm, is_active: e.target.checked })} className="w-4 h-4 rounded" />
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">즉시 활성화</span>
                        </label>
                    </div>
                    <div className="flex gap-3 mt-8">
                        <button onClick={() => setShowBannerModal(false)} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/[0.06] transition-all" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>취소</button>
                        <button onClick={saveBanner} disabled={!bannerForm.title} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all disabled:opacity-30" style={{ background: 'var(--primary)', boxShadow: '0 0 20px rgba(255,107,0,0.3)' }}>저장</button>
                    </div>
                </AdminModal>
            </div>
        </div>
    );
}
