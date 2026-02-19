'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import AdminPageHeader from '@/components/layout/AdminPageHeader';
import AdminModal from '@/components/layout/AdminModal';
import { useToast } from '@/components/ui/Toast';

// ─── Types ──────────────────────────────────────────────
interface BadgeDefinition {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: 'attendance' | 'performance' | 'community' | 'milestone';
    metric_type: string;
    threshold: number;
    is_active: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
    award_count?: number;
}

type FilterCategory = 'all' | 'attendance' | 'performance' | 'community' | 'milestone';

// ─── Constants ──────────────────────────────────────────
const categoryConfig: Record<string, { label: string; color: string; bg: string }> = {
    attendance: { label: '출석', color: '#4ADE80', bg: 'rgba(74,222,128,0.12)' },
    performance: { label: '성과', color: '#818CF8', bg: 'rgba(129,140,248,0.12)' },
    community: { label: '커뮤니티', color: '#F472B6', bg: 'rgba(244,114,182,0.12)' },
    milestone: { label: '마일스톤', color: '#FBBF24', bg: 'rgba(251,191,36,0.12)' },
};

const metricTypeOptions: { value: string; label: string; group: string }[] = [
    { value: 'total_checkins', label: '전체 체크인 횟수', group: '출석' },
    { value: 'week_checkins', label: '주간 체크인 횟수', group: '출석' },
    { value: 'month_checkins', label: '월간 체크인 횟수', group: '출석' },
    { value: 'streak_days', label: '연속 출석 일수', group: '출석' },
    { value: 'total_feedbacks', label: '피드백 작성 횟수', group: '성과' },
    { value: 'total_race_participations', label: '레이스 참가 횟수', group: '성과' },
    { value: 'total_prs', label: 'PR 달성 횟수', group: '성과' },
    { value: 'total_bookings', label: '수업 예약 횟수', group: '활동' },
    { value: 'total_purchases', label: '결제 횟수', group: '활동' },
    { value: 'member_days', label: '가입 경과일', group: '시간' },
];

const categoryOptions: { value: string; label: string }[] = [
    { value: 'attendance', label: '출석' },
    { value: 'performance', label: '성과' },
    { value: 'community', label: '커뮤니티' },
    { value: 'milestone', label: '마일스톤' },
];

// ─── Component ──────────────────────────────────────────
export default function BadgesPage() {
    const [badges, setBadges] = useState<BadgeDefinition[]>([]);
    const [loading, setLoading] = useState(true);
    const toast = useToast();
    const [filter, setFilter] = useState<FilterCategory>('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingBadge, setEditingBadge] = useState<BadgeDefinition | null>(null);

    // Form state
    const [form, setForm] = useState({
        name: '',
        description: '',
        icon: '🏅',
        category: 'attendance',
        metric_type: 'total_checkins',
        threshold: '1',
        sort_order: '0',
        is_active: true,
    });

    // ─── Data Loading ───────────────────────────────────
    const loadBadges = useCallback(async () => {
        const supabase = createClient();
        setLoading(true);

        // badge_definitions with award count
        const { data, error } = await (supabase as any)
            .from('badge_definitions')
            .select('*, badge_awards(count)')
            .order('category')
            .order('sort_order');

        if (data) {
            const mapped: BadgeDefinition[] = data.map((d: Record<string, unknown>) => {
                const awards = d.badge_awards as { count: number }[] | undefined;
                const { badge_awards: _, ...rest } = d;
                return {
                    ...rest,
                    award_count: awards?.[0]?.count || 0,
                } as unknown as BadgeDefinition;
            });
            setBadges(mapped);
        }
        if (error) console.error('Error loading badges:', error);
        setLoading(false);
    }, []);

    useEffect(() => { loadBadges(); }, [loadBadges]);

    // ─── Filtering ──────────────────────────────────────
    const filteredBadges = badges.filter((b) => {
        if (filter !== 'all' && b.category !== filter) return false;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            return b.name.toLowerCase().includes(term) || b.description.toLowerCase().includes(term);
        }
        return true;
    });

    // ─── KPI ────────────────────────────────────────────
    const totalBadges = badges.length;
    const activeBadges = badges.filter(b => b.is_active).length;
    const totalAwards = badges.reduce((sum, b) => sum + (b.award_count || 0), 0);
    const categoryStats = Object.entries(categoryConfig).map(([key, cfg]) => ({
        key,
        ...cfg,
        count: badges.filter(b => b.category === key).length,
    }));

    // ─── CRUD ───────────────────────────────────────────
    function openModal(badge?: BadgeDefinition) {
        if (badge) {
            setEditingBadge(badge);
            setForm({
                name: badge.name,
                description: badge.description,
                icon: badge.icon,
                category: badge.category,
                metric_type: badge.metric_type,
                threshold: String(badge.threshold),
                sort_order: String(badge.sort_order),
                is_active: badge.is_active,
            });
        } else {
            setEditingBadge(null);
            setForm({
                name: '', description: '', icon: '🏅',
                category: 'attendance', metric_type: 'total_checkins',
                threshold: '1', sort_order: '0', is_active: true,
            });
        }
        setShowModal(true);
    }

    async function saveBadge() {
        if (!form.name.trim() || !form.description.trim()) {
            toast.warning('이름과 설명을 입력해주세요.');
            return;
        }
        const supabase = createClient();
        const payload = {
            name: form.name.trim(),
            description: form.description.trim(),
            icon: form.icon || '🏅',
            category: form.category,
            metric_type: form.metric_type,
            threshold: Number(form.threshold) || 1,
            sort_order: Number(form.sort_order) || 0,
            is_active: form.is_active,
        };

        if (editingBadge) {
            const { error } = await (supabase as any).from('badge_definitions').update(payload).eq('id', editingBadge.id);
            if (error) { toast.error('수정 실패: ' + error.message); return; }
            toast.success('배지가 수정되었습니다.');
        } else {
            const { error } = await (supabase as any).from('badge_definitions').insert(payload);
            if (error) { toast.error('등록 실패: ' + error.message); return; }
            toast.success('새 배지가 등록되었습니다.');
        }
        setShowModal(false);
        loadBadges();
    }

    async function deleteBadge(id: string, name: string) {
        if (!confirm(`"${name}" 배지를 삭제하시겠습니까?\n\n⚠️ 이미 수여된 기록도 함께 삭제됩니다.`)) return;
        const supabase = createClient();
        const { error } = await (supabase as any).from('badge_definitions').delete().eq('id', id);
        if (error) { toast.error('삭제 실패: ' + error.message); return; }
        toast.success('배지가 삭제되었습니다.');
        loadBadges();
    }

    async function toggleActive(badge: BadgeDefinition) {
        const supabase = createClient();
        await (supabase as any).from('badge_definitions')
            .update({ is_active: !badge.is_active })
            .eq('id', badge.id);
        loadBadges();
    }

    // ─── Render ─────────────────────────────────────────
    return (
        <div className="transition-all duration-500">
            <AdminPageHeader
                category="Operations"
                title="Badges"
                subtitle="management"
                actions={
                    <button onClick={() => openModal()} className="admin-action-btn">
                        + 배지 추가
                    </button>
                }
            />

            <div className="p-10 max-w-[1400px] mx-auto">
                {/* KPI Cards + Search */}
                <div className="flex items-center gap-3 mb-8 flex-wrap">
                    {/* Total */}
                    <div
                        onClick={() => setFilter('all')}
                        className="glass-card px-5 py-3 cursor-pointer transition-all hover:scale-[1.02] flex items-center gap-3"
                        style={filter === 'all' ? { borderColor: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.03)' } : {}}
                    >
                        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-white/40">TOTAL</span>
                        <span className="text-xl font-black text-white">{totalBadges}</span>
                    </div>
                    {/* Active */}
                    <div
                        className="glass-card px-5 py-3 flex items-center gap-3"
                    >
                        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-white/40">ACTIVE</span>
                        <span className="text-xl font-black text-[#4ADE80]">{activeBadges}</span>
                    </div>
                    {/* Awards */}
                    <div
                        className="glass-card px-5 py-3 flex items-center gap-3"
                    >
                        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-white/40">AWARDS</span>
                        <span className="text-xl font-black text-[#818CF8]">{totalAwards}</span>
                    </div>
                    {/* Category Filters */}
                    {categoryStats.map((cs) => (
                        <div
                            key={cs.key}
                            onClick={() => setFilter(cs.key as FilterCategory)}
                            className="glass-card px-4 py-3 cursor-pointer transition-all hover:scale-[1.02] flex items-center gap-2"
                            style={filter === cs.key ? { borderColor: cs.color + '50', background: cs.bg } : {}}
                        >
                            <span className="text-[9px] font-black uppercase tracking-[0.1em] text-white/40">{cs.label}</span>
                            <span className="text-lg font-black" style={{ color: cs.color }}>{cs.count}</span>
                        </div>
                    ))}
                    {/* Search */}
                    <div className="flex-1 min-w-[200px]">
                        <input
                            type="text"
                            placeholder="배지 이름, 설명 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="admin-search-input"
                        />
                    </div>
                    <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest whitespace-nowrap">
                        {filteredBadges.length}개
                    </span>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="flex justify-center py-40">
                        <div className="w-10 h-10 rounded-xl border-2 border-white/5 border-t-[var(--primary)] animate-spin"></div>
                    </div>
                ) : filteredBadges.length === 0 ? (
                    <div className="glass-card p-20 flex flex-col items-center justify-center text-center opacity-40">
                        <span className="text-4xl mb-4">🏅</span>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em]">
                            {badges.length === 0 ? 'No badges registered' : 'No badges found'}
                        </p>
                    </div>
                ) : (
                    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        {/* Table Header */}
                        <div className="grid grid-cols-12 gap-4 px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/30" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <span className="col-span-1">아이콘</span>
                            <span className="col-span-2">이름</span>
                            <span className="col-span-1">카테고리</span>
                            <span className="col-span-2">측정기준</span>
                            <span className="col-span-1">목표</span>
                            <span className="col-span-1">달성</span>
                            <span className="col-span-1">상태</span>
                            <span className="col-span-1">순서</span>
                            <span className="col-span-2 text-right">액션</span>
                        </div>

                        {/* Table Rows */}
                        {filteredBadges.map((badge) => {
                            const cc = categoryConfig[badge.category] || categoryConfig.milestone;
                            const mt = metricTypeOptions.find(m => m.value === badge.metric_type);
                            return (
                                <div
                                    key={badge.id}
                                    className="grid grid-cols-12 gap-4 items-center px-6 py-4 transition-all hover:bg-white/[0.02]"
                                    style={{
                                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                                        opacity: badge.is_active ? 1 : 0.5,
                                    }}
                                >
                                    {/* Icon */}
                                    <div className="col-span-1">
                                        <span className="text-2xl">{badge.icon}</span>
                                    </div>

                                    {/* Name + Description */}
                                    <div className="col-span-2 min-w-0">
                                        <p className="text-sm font-bold text-white truncate">{badge.name}</p>
                                        <p className="text-[10px] text-white/40 truncate">{badge.description}</p>
                                    </div>

                                    {/* Category */}
                                    <div className="col-span-1">
                                        <span
                                            className="px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-wider"
                                            style={{ background: cc.bg, color: cc.color }}
                                        >
                                            {cc.label}
                                        </span>
                                    </div>

                                    {/* Metric Type */}
                                    <div className="col-span-2">
                                        <p className="text-xs text-white/60">{mt?.label || badge.metric_type}</p>
                                        <p className="text-[9px] text-white/25">{mt?.group || ''}</p>
                                    </div>

                                    {/* Threshold */}
                                    <div className="col-span-1">
                                        <span className="text-sm font-bold text-white">{badge.threshold}</span>
                                        <span className="text-[10px] text-white/30 ml-1">
                                            {badge.metric_type === 'member_days' ? '일' : '회'}
                                        </span>
                                    </div>

                                    {/* Award Count */}
                                    <div className="col-span-1">
                                        <span
                                            className="px-2.5 py-1 rounded-lg text-xs font-black"
                                            style={{
                                                background: (badge.award_count || 0) > 0 ? 'rgba(129,140,248,0.12)' : 'rgba(255,255,255,0.03)',
                                                color: (badge.award_count || 0) > 0 ? '#818CF8' : 'rgba(255,255,255,0.3)',
                                            }}
                                        >
                                            {badge.award_count || 0}명
                                        </span>
                                    </div>

                                    {/* Status */}
                                    <div className="col-span-1">
                                        <button
                                            onClick={() => toggleActive(badge)}
                                            className="px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer"
                                            style={{
                                                background: badge.is_active ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                                                color: badge.is_active ? '#22C55E' : '#F87171',
                                            }}
                                        >
                                            {badge.is_active ? '활성' : '비활성'}
                                        </button>
                                    </div>

                                    {/* Sort Order */}
                                    <div className="col-span-1">
                                        <span className="text-xs text-white/30">{badge.sort_order}</span>
                                    </div>

                                    {/* Actions */}
                                    <div className="col-span-2 flex gap-2 justify-end">
                                        <button
                                            onClick={() => openModal(badge)}
                                            className="px-3 py-1.5 rounded-lg text-[8px] font-black transition-all"
                                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}
                                            title="수정"
                                        >
                                            ✏️ 수정
                                        </button>
                                        <button
                                            onClick={() => deleteBadge(badge.id, badge.name)}
                                            className="px-3 py-1.5 rounded-lg text-[8px] font-black transition-all"
                                            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}
                                            title="삭제"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ===== Badge Create/Edit Modal ===== */}
            <AdminModal
                show={showModal}
                onClose={() => setShowModal(false)}
                title={editingBadge ? '배지 수정' : '새 배지 등록'}
                subtitle={editingBadge ? `${editingBadge.icon} ${editingBadge.name}` : '새로운 배지를 추가합니다'}
            >
                <div className="space-y-5">
                    {/* Row 1: Name + Icon */}
                    <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-3">
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">배지 이름 *</label>
                            <input
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="예: 주간 전사"
                                className="bcl-input w-full rounded-xl"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">아이콘</label>
                            <input
                                value={form.icon}
                                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                                placeholder="🏅"
                                className="bcl-input w-full rounded-xl text-center text-xl"
                                maxLength={4}
                            />
                        </div>
                    </div>

                    {/* Row 2: Description */}
                    <div>
                        <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">설명 *</label>
                        <input
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            placeholder="배지 달성 조건 설명"
                            className="bcl-input w-full rounded-xl"
                        />
                    </div>

                    {/* Row 3: Category + Metric Type */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">카테고리</label>
                            <select
                                value={form.category}
                                onChange={(e) => setForm({ ...form, category: e.target.value })}
                                className="bcl-input w-full rounded-xl"
                                style={{ colorScheme: 'dark' }}
                            >
                                {categoryOptions.map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">측정 기준</label>
                            <select
                                value={form.metric_type}
                                onChange={(e) => setForm({ ...form, metric_type: e.target.value })}
                                className="bcl-input w-full rounded-xl"
                                style={{ colorScheme: 'dark' }}
                            >
                                {metricTypeOptions.map(o => (
                                    <option key={o.value} value={o.value}>[{o.group}] {o.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Row 4: Threshold + Sort Order + Active */}
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">달성 목표</label>
                            <input
                                type="number"
                                value={form.threshold}
                                onChange={(e) => setForm({ ...form, threshold: e.target.value })}
                                placeholder="1"
                                min="1"
                                className="bcl-input w-full rounded-xl"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">정렬 순서</label>
                            <input
                                type="number"
                                value={form.sort_order}
                                onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                                placeholder="0"
                                className="bcl-input w-full rounded-xl"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">상태</label>
                            <button
                                onClick={() => setForm({ ...form, is_active: !form.is_active })}
                                className="w-full py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                style={{
                                    background: form.is_active ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                                    border: `1px solid ${form.is_active ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                                    color: form.is_active ? '#22C55E' : '#F87171',
                                }}
                            >
                                {form.is_active ? '✅ 활성' : '❌ 비활성'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 mt-8">
                    <button
                        onClick={() => setShowModal(false)}
                        className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/[0.06] transition-all"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                    >
                        취소
                    </button>
                    <button
                        onClick={saveBadge}
                        className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all"
                        style={{ background: 'var(--primary)', boxShadow: '0 0 20px rgba(255,107,0,0.3)' }}
                    >
                        {editingBadge ? '수정' : '등록'}
                    </button>
                </div>
            </AdminModal>
        </div>
    );
}
