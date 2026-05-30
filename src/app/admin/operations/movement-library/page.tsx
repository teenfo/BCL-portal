'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { query, rpc } from '@/lib/supabase/query';
import AdminPageHeader from '@/components/layout/AdminPageHeader';
import { useToast } from '@/components/ui/Toast';
import type {
    MovementCategory,
    MovementCategoryRow,
    MovementLibraryAdminRow,
} from '@/types/p1a';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const EQUIPMENT_OPTIONS = [
    'Barbell', 'Dumbbell', 'Kettlebell', 'Pull-up Bar',
    'Rings', 'Box', 'Med Ball', 'Rope', 'Machine', 'Bodyweight', 'Other',
];

const SOURCE_TAG_OPTIONS = [
    { value: '', label: '선택 안 함' },
    { value: 'crossfit', label: 'CrossFit' },
    { value: 'custom', label: 'Custom' },
    { value: 'strength', label: 'Strength & Conditioning' },
    { value: 'rehab', label: 'Rehab / Mobility' },
];

const CATEGORY_FALLBACK_COLORS: Record<string, string> = {
    weightlifting: '#f87171',
    gymnastics: '#4ade80',
    monostructural: '#22d3ee',
    dumbbell: '#c084fc',
    kettlebell: '#f472b6',
    medball: '#fbbf24',
    other_equipment: '#2dd4bf',
    accessory: '#818cf8',
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface FormState {
    id?: string;
    name_ko: string;
    name_en: string;
    slug: string;
    category: MovementCategory | '';
    difficulty_level: number;
    source_tag: string;
    is_active: boolean;
    thumbnail_url: string;
    video_url: string;
    equipment: string[];
    primary_muscles: string;
    coaching_points: string;
}

const emptyForm = (): FormState => ({
    name_ko: '',
    name_en: '',
    slug: '',
    category: '',
    difficulty_level: 3,
    source_tag: '',
    is_active: true,
    thumbnail_url: '',
    video_url: '',
    equipment: [],
    primary_muscles: '',
    coaching_points: '',
});

// slug 자동 생성 (영어명 → kebab-case)
const toSlug = (en: string) =>
    en.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminMovementLibraryPage() {
    // ── List state ───────────────────────────────────────────────────────────
    const [movements, setMovements] = useState<MovementLibraryAdminRow[]>([]);
    const [categories, setCategories] = useState<MovementCategoryRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [categoryFilter, setCategoryFilter] = useState<MovementCategory | ''>('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Panel state ──────────────────────────────────────────────────────────
    const [showPanel, setShowPanel] = useState(false);
    const [form, setForm] = useState<FormState>(emptyForm());
    const [saving, setSaving] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [slugError, setSlugError] = useState('');

    // ── Category modal state ─────────────────────────────────────────────────
    const [showCatModal, setShowCatModal] = useState(false);
    const [catForm, setCatForm] = useState({ name_ko: '', name_en: '', color: '#818cf8' });
    const [catSaving, setCatSaving] = useState(false);

    const { success, error: toastError } = useToast();

    // ── Data loaders ─────────────────────────────────────────────────────────

    const loadCategories = useCallback(async () => {
        const { data } = await query('movement_categories')
            .select('*')
            .eq('is_active', true)
            .order('sort_order');
        if (data) setCategories(data as MovementCategoryRow[]);
    }, []);

    const loadMovements = useCallback(async (q?: string) => {
        setLoading(true);
        try {
            const { data } = await rpc('fn_list_movement_library', {
                p_query: q ?? (searchQuery || null),
                p_category: categoryFilter || null,
                p_is_active: statusFilter === 'all' ? null : statusFilter === 'active',
                p_limit: 200,
                p_offset: 0,
            });
            if (data?.success) setMovements(data.data as MovementLibraryAdminRow[]);
            else setMovements([]);
        } catch {
            setMovements([]);
        }
        setLoading(false);
    }, [searchQuery, categoryFilter, statusFilter]);

    useEffect(() => { void loadCategories(); }, [loadCategories]);
    useEffect(() => { void loadMovements(); }, [loadMovements]);

    // ── Debounced search ─────────────────────────────────────────────────────
    const handleSearchChange = (val: string) => {
        setSearchQuery(val);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => { void loadMovements(val || undefined); }, 300);
    };

    // ── Panel helpers ────────────────────────────────────────────────────────
    const openCreate = () => {
        setForm(emptyForm());
        setSlugError('');
        setDeleteConfirmId(null);
        setShowPanel(true);
    };

    const openEdit = (m: MovementLibraryAdminRow) => {
        setForm({
            id: m.id,
            name_ko: m.name_ko,
            name_en: m.name_en,
            slug: m.slug,
            category: m.category,
            difficulty_level: m.difficulty_level,
            source_tag: m.source_tag ?? '',
            is_active: m.is_active,
            thumbnail_url: m.thumbnail_url ?? '',
            video_url: m.video_url ?? '',
            equipment: m.equipment ?? [],
            primary_muscles: (m.primary_muscles ?? []).join(', '),
            coaching_points: m.coaching_points ?? '',
        });
        setSlugError('');
        setDeleteConfirmId(null);
        setShowPanel(true);
    };

    const updateForm = (patch: Partial<FormState>) => setForm(prev => ({ ...prev, ...patch }));

    const handleNameEnChange = (en: string) => {
        const newSlug = toSlug(en);
        updateForm({ name_en: en, ...(!form.id ? { slug: newSlug } : {}) });
    };

    const toggleEquipment = (eq: string) => {
        updateForm({
            equipment: form.equipment.includes(eq)
                ? form.equipment.filter(e => e !== eq)
                : [...form.equipment, eq],
        });
    };

    // ── Slug 중복 검증 ────────────────────────────────────────────────────────
    const validateSlug = async (slug: string): Promise<boolean> => {
        if (!slug.trim()) { setSlugError('Slug를 입력해주세요.'); return false; }
        const { data } = await query('movement_library')
            .select('id')
            .eq('slug', slug)
            .limit(1);
        if (data && data.length > 0 && data[0].id !== form.id) {
            setSlugError('이미 사용 중인 slug입니다.');
            return false;
        }
        setSlugError('');
        return true;
    };

    // ── Save ─────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!form.name_ko.trim()) { toastError('한국어명을 입력하세요.'); return; }
        if (!form.name_en.trim()) { toastError('영어명을 입력하세요.'); return; }
        if (!form.category) { toastError('카테고리를 선택하세요.'); return; }
        const slugOk = await validateSlug(form.slug);
        if (!slugOk) return;

        setSaving(true);
        try {
            const payload = {
                name_ko: form.name_ko.trim(),
                name_en: form.name_en.trim(),
                slug: form.slug.trim(),
                category: form.category,
                difficulty_level: form.difficulty_level,
                source_tag: form.source_tag || null,
                is_active: form.is_active,
                thumbnail_url: form.thumbnail_url.trim() || null,
                video_url: form.video_url.trim() || null,
                equipment: form.equipment,
                primary_muscles: form.primary_muscles
                    ? form.primary_muscles.split(',').map(s => s.trim()).filter(Boolean)
                    : [],
                coaching_points: form.coaching_points.trim() || null,
                updated_at: new Date().toISOString(),
            };

            if (form.id) {
                const { error } = await query('movement_library')
                    .update(payload)
                    .eq('id', form.id);
                if (error) throw error;
                success('운동을 수정했습니다.');
            } else {
                const { error } = await query('movement_library')
                    .insert({ ...payload, created_at: new Date().toISOString() });
                if (error) throw error;
                success('운동을 추가했습니다.');
            }
            setShowPanel(false);
            await loadMovements();
        } catch (e: unknown) {
            toastError(e instanceof Error ? e.message : '저장 중 오류가 발생했습니다.');
        }
        setSaving(false);
    };

    // ── Toggle active ─────────────────────────────────────────────────────────
    const handleToggleActive = async () => {
        if (!form.id) return;
        const newActive = !form.is_active;
        const { error } = await query('movement_library')
            .update({ is_active: newActive, updated_at: new Date().toISOString() })
            .eq('id', form.id);
        if (error) { toastError('상태 변경 실패'); return; }
        success(newActive ? '활성화했습니다.' : '비활성화했습니다.');
        updateForm({ is_active: newActive });
        await loadMovements();
    };

    // ── Delete ────────────────────────────────────────────────────────────────
    const handleDelete = async (id: string) => {
        const { error } = await query('movement_library').delete().eq('id', id);
        if (error) { toastError('삭제 실패: ' + error.message); return; }
        success('운동을 삭제했습니다.');
        setShowPanel(false);
        setDeleteConfirmId(null);
        await loadMovements();
    };

    // ── Add category ──────────────────────────────────────────────────────────
    const handleAddCategory = async () => {
        if (!catForm.name_ko.trim() || !catForm.name_en.trim()) {
            toastError('카테고리명(KO/EN)을 모두 입력하세요.'); return;
        }
        setCatSaving(true);
        const slug = toSlug(catForm.name_en);
        const { error } = await query('movement_categories').insert({
            slug,
            name_ko: catForm.name_ko.trim(),
            name_en: catForm.name_en.trim(),
            color: catForm.color,
            sort_order: categories.length + 1,
        });
        if (error) { toastError('카테고리 추가 실패: ' + error.message); }
        else {
            success('카테고리를 추가했습니다.');
            setShowCatModal(false);
            setCatForm({ name_ko: '', name_en: '', color: '#818cf8' });
            await loadCategories();
        }
        setCatSaving(false);
    };

    // ── Computed ──────────────────────────────────────────────────────────────
    const totalCount = movements.length;
    const activeCount = movements.filter(m => m.is_active).length;
    const inactiveCount = movements.filter(m => !m.is_active).length;

    const getCategoryColor = (slug: string, catColor?: string | null) =>
        catColor ?? CATEGORY_FALLBACK_COLORS[slug] ?? '#888';

    const selectedMovement = movements.find(m => m.id === form.id);
    const wodUsageCount = selectedMovement?.wod_usage_count ?? 0;

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            <AdminPageHeader
                category="OPERATIONS"
                title="Movement Library"
                subtitle="admin &amp; coach"
                actions={
                    <button onClick={openCreate} className="admin-action-btn">
                        + 운동 추가
                    </button>
                }
            />

            {/* 2단 메인 레이아웃 */}
            <div className="flex-1 flex gap-6 p-6 min-h-0 overflow-hidden bg-[#0a0a0c]">

                {/* ── 좌측: 목록 ───────────────────────────────────────────── */}
                <div className="flex-1 flex flex-col min-h-0 min-w-0">

                    {/* KPI 요약 */}
                    <div className="flex gap-3 mb-4 flex-shrink-0">
                        {[
                            { label: '전체', value: totalCount, color: 'rgba(255,255,255,0.7)' },
                            { label: '활성', value: activeCount, color: 'var(--primary)' },
                            { label: '비활성', value: inactiveCount, color: 'rgba(255,255,255,0.3)' },
                        ].map(stat => (
                            <div
                                key={stat.label}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl"
                                style={{
                                    background: 'rgba(255,255,255,0.02)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                }}
                            >
                                <span className="text-lg font-black" style={{ color: stat.color }}>
                                    {stat.value}
                                </span>
                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                                    {stat.label}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* 필터 + 검색 */}
                    <div className="flex flex-col gap-2 mb-4 flex-shrink-0">
                        {/* 카테고리 탭 */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                                onClick={() => setCategoryFilter('')}
                                className={`admin-filter-btn ${categoryFilter === '' ? 'active' : ''}`}
                            >
                                전체
                            </button>
                            {categories.map(cat => (
                                <button
                                    key={cat.slug}
                                    onClick={() => setCategoryFilter(cat.slug as MovementCategory)}
                                    className={`admin-filter-btn ${categoryFilter === cat.slug ? 'active' : ''}`}
                                >
                                    {cat.name_ko}
                                </button>
                            ))}
                        </div>

                        {/* 상태 필터 + 검색 */}
                        <div className="flex items-center gap-2">
                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
                                className="admin-search-input cursor-pointer"
                                style={{ width: 'auto', colorScheme: 'dark' }}
                            >
                                <option value="all">전체 상태</option>
                                <option value="active">활성</option>
                                <option value="inactive">비활성</option>
                            </select>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => handleSearchChange(e.target.value)}
                                placeholder="동작명 또는 slug 검색..."
                                className="admin-search-input flex-1"
                            />
                        </div>
                    </div>

                    {/* 운동 목록 테이블 */}
                    <div
                        className="flex-1 overflow-hidden rounded-2xl"
                        style={{
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.05)',
                        }}
                    >
                        {loading ? (
                            <div className="flex items-center justify-center h-full text-white/40 text-xs">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white/30 mr-2" />
                                <span>목록 로드 중...</span>
                            </div>
                        ) : movements.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-white/30 text-xs gap-3">
                                <span className="material-symbols-outlined text-5xl text-white/10">
                                    fitness_center
                                </span>
                                <span className="font-bold">등록된 운동이 없습니다</span>
                                <button
                                    onClick={openCreate}
                                    className="admin-action-btn"
                                    style={{ padding: '0.5rem 1.25rem', fontSize: '10px' }}
                                >
                                    + 운동 추가
                                </button>
                            </div>
                        ) : (
                            <div className="h-full overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr
                                            className="text-[9px] font-black uppercase tracking-[0.15em] text-white/30"
                                            style={{
                                                borderBottom: '1px solid rgba(255,255,255,0.04)',
                                                position: 'sticky',
                                                top: 0,
                                                background: '#0d0d10',
                                                zIndex: 1,
                                            }}
                                        >
                                            <th className="py-3 px-4 text-left w-8">#</th>
                                            <th className="py-3 px-4 text-left w-10">썸네일</th>
                                            <th className="py-3 px-4 text-left">한국어명</th>
                                            <th className="py-3 px-4 text-left hidden lg:table-cell">영어명</th>
                                            <th className="py-3 px-4 text-left hidden xl:table-cell">카테고리</th>
                                            <th className="py-3 px-4 text-center">난이도</th>
                                            <th className="py-3 px-4 text-center hidden lg:table-cell">WOD</th>
                                            <th className="py-3 px-4 text-center">상태</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {movements.map((m, idx) => {
                                            const isSelected = form.id === m.id && showPanel;
                                            const catColor = getCategoryColor(m.category, m.category_color);
                                            return (
                                                <tr
                                                    key={m.id}
                                                    onClick={() => openEdit(m)}
                                                    className="cursor-pointer transition-colors duration-100"
                                                    style={{
                                                        opacity: m.is_active ? 1 : 0.45,
                                                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                                                        background: isSelected
                                                            ? 'rgba(255,107,0,0.06)'
                                                            : undefined,
                                                        borderLeft: isSelected
                                                            ? '2px solid var(--primary)'
                                                            : '2px solid transparent',
                                                    }}
                                                    onMouseEnter={e => {
                                                        if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.02)';
                                                    }}
                                                    onMouseLeave={e => {
                                                        if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = '';
                                                    }}
                                                >
                                                    <td className="py-2.5 px-4 text-white/25 font-mono text-[10px]">
                                                        {idx + 1}
                                                    </td>
                                                    <td className="py-2.5 px-4">
                                                        {m.thumbnail_url ? (
                                                            <img
                                                                src={m.thumbnail_url}
                                                                alt={m.name_ko}
                                                                className="w-8 h-8 rounded-lg object-cover"
                                                                style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                                                            />
                                                        ) : (
                                                            <div
                                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black"
                                                                style={{
                                                                    background: `${catColor}22`,
                                                                    color: catColor,
                                                                    border: `1px solid ${catColor}33`,
                                                                }}
                                                            >
                                                                {m.category.slice(0, 2).toUpperCase()}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="py-2.5 px-4">
                                                        <div className="font-bold text-white tracking-tight truncate max-w-[160px]">
                                                            {m.name_ko}
                                                        </div>
                                                        <div className="text-[9px] text-white/30 font-mono truncate max-w-[160px]">
                                                            {m.slug}
                                                        </div>
                                                    </td>
                                                    <td className="py-2.5 px-4 text-white/50 hidden lg:table-cell truncate max-w-[140px]">
                                                        {m.name_en}
                                                    </td>
                                                    <td className="py-2.5 px-4 hidden xl:table-cell">
                                                        <span
                                                            className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider"
                                                            style={{
                                                                background: `${catColor}22`,
                                                                color: catColor,
                                                                border: `1px solid ${catColor}33`,
                                                            }}
                                                        >
                                                            {m.category_name_ko ?? m.category}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-4 text-center">
                                                        <span className="text-[10px] tracking-tight">
                                                            {Array.from({ length: 5 }).map((_, i) => (
                                                                <span
                                                                    key={i}
                                                                    style={{ color: i < m.difficulty_level ? 'var(--primary)' : 'rgba(255,255,255,0.12)' }}
                                                                >
                                                                    ★
                                                                </span>
                                                            ))}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-4 text-center hidden lg:table-cell">
                                                        {m.wod_usage_count > 0 ? (
                                                            <span
                                                                className="text-[9px] font-black px-1.5 py-0.5 rounded"
                                                                style={{
                                                                    background: 'rgba(255,107,0,0.1)',
                                                                    color: 'var(--primary)',
                                                                }}
                                                            >
                                                                {m.wod_usage_count}
                                                            </span>
                                                        ) : (
                                                            <span className="text-white/20 text-[9px]">—</span>
                                                        )}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-center">
                                                        <span
                                                            className="inline-block w-1.5 h-1.5 rounded-full"
                                                            style={{
                                                                background: m.is_active
                                                                    ? '#4ade80'
                                                                    : 'rgba(255,255,255,0.15)',
                                                            }}
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── 우측: 편집 패널 ────────────────────────────────────── */}
                <div
                    className="w-[480px] flex-shrink-0 flex flex-col min-h-0 rounded-3xl overflow-hidden glass-card shadow-2xl transition-all duration-300"
                    style={{ border: '1px solid rgba(255,255,255,0.07)' }}
                >
                    {showPanel ? (
                        <>
                            {/* 패널 헤더 */}
                            <div
                                className="px-6 py-4 flex items-center justify-between flex-shrink-0"
                                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}
                            >
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-sm font-black text-white tracking-wide uppercase">
                                        {form.id ? '운동 에디터' : '새 운동 추가'}
                                    </h3>
                                    <p className="text-[9px] text-white/35 tracking-wider font-bold uppercase">
                                        {form.id ? 'Edit exercise' : 'Create new exercise'}
                                    </p>
                                </div>

                                {/* 삭제 2단계 */}
                                <div className="flex gap-1 flex-shrink-0">
                                    {form.id && (
                                        deleteConfirmId === form.id ? (
                                            <>
                                                <button
                                                    onClick={() => setDeleteConfirmId(null)}
                                                    className="px-2 py-1 rounded-lg text-[10px] font-bold text-white/50 hover:bg-white/5 transition-all"
                                                >
                                                    취소
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(form.id!)}
                                                    className="px-3 py-1 rounded-lg text-[10px] font-black text-white transition-all active:scale-95"
                                                    style={{ background: 'rgba(239,68,68,0.85)' }}
                                                >
                                                    확인 삭제
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => setDeleteConfirmId(form.id!)}
                                                className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400/60 hover:text-red-400 transition-all active:scale-95"
                                                title="운동 삭제"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                            </button>
                                        )
                                    )}
                                    <button
                                        onClick={() => { setShowPanel(false); setDeleteConfirmId(null); }}
                                        className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-all active:scale-95"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">close</span>
                                    </button>
                                </div>
                            </div>

                            {/* WOD 사용 경고 배너 */}
                            {form.id && wodUsageCount > 0 && deleteConfirmId === form.id && (
                                <div
                                    className="mx-4 mt-3 px-4 py-3 rounded-xl text-xs"
                                    style={{
                                        background: 'rgba(239,68,68,0.08)',
                                        border: '1px solid rgba(239,68,68,0.2)',
                                        color: '#fca5a5',
                                    }}
                                >
                                    ⚠️ 이 운동은 <strong>{wodUsageCount}개</strong> WOD 템플릿에서 사용 중입니다.
                                    삭제 시 Movement Line의 라이브러리 연결이 해제됩니다.
                                    삭제 대신 <strong>비활성화</strong>를 권장합니다.
                                </div>
                            )}

                            {/* 패널 바디 */}
                            <div
                                className="flex-1 overflow-y-auto p-5 flex flex-col gap-5"
                                style={{ scrollbarWidth: 'thin' }}
                            >
                                {/* ① 기본 정보 */}
                                <section>
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-3">
                                        ① 기본 정보
                                    </p>
                                    <div className="flex flex-col gap-3">
                                        <label className="text-[10px] font-black text-white/55">
                                            한국어명 *
                                            <input
                                                value={form.name_ko}
                                                onChange={e => updateForm({ name_ko: e.target.value })}
                                                className="admin-search-input w-full mt-1.5"
                                                style={{ background: '#161619', color: '#fff' }}
                                                placeholder="예: 데드리프트"
                                            />
                                        </label>
                                        <label className="text-[10px] font-black text-white/55">
                                            영어명 *
                                            <input
                                                value={form.name_en}
                                                onChange={e => handleNameEnChange(e.target.value)}
                                                className="admin-search-input w-full mt-1.5"
                                                style={{ background: '#161619', color: '#fff' }}
                                                placeholder="예: Deadlift"
                                            />
                                        </label>
                                        <label className="text-[10px] font-black text-white/55">
                                            Slug * <span className="text-white/25 font-normal">(자동 생성, 직접 수정 가능)</span>
                                            <input
                                                value={form.slug}
                                                onChange={e => { updateForm({ slug: e.target.value }); setSlugError(''); }}
                                                onBlur={() => form.slug && validateSlug(form.slug)}
                                                className="admin-search-input w-full mt-1.5 font-mono"
                                                style={{ background: '#161619', color: '#fff' }}
                                                placeholder="예: deadlift"
                                            />
                                            {slugError && (
                                                <span className="text-red-400 text-[9px] mt-1 block">{slugError}</span>
                                            )}
                                        </label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <label className="text-[10px] font-black text-white/55">
                                                카테고리 *
                                                <select
                                                    value={form.category}
                                                    onChange={e => updateForm({ category: e.target.value as MovementCategory | '' })}
                                                    className="admin-search-input w-full mt-1.5 cursor-pointer"
                                                    style={{ background: '#161619', color: '#fff', colorScheme: 'dark' }}
                                                >
                                                    <option value="">카테고리 선택</option>
                                                    {categories.map(cat => (
                                                        <option key={cat.slug} value={cat.slug}>
                                                            {cat.name_ko} ({cat.name_en})
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowCatModal(true)}
                                                    className="text-[9px] text-white/30 hover:text-white/60 mt-1 transition-colors"
                                                >
                                                    + 카테고리 추가
                                                </button>
                                            </label>
                                            <label className="text-[10px] font-black text-white/55">
                                                Source Tag
                                                <select
                                                    value={form.source_tag}
                                                    onChange={e => updateForm({ source_tag: e.target.value })}
                                                    className="admin-search-input w-full mt-1.5 cursor-pointer"
                                                    style={{ background: '#161619', color: '#fff', colorScheme: 'dark' }}
                                                >
                                                    {SOURCE_TAG_OPTIONS.map(o => (
                                                        <option key={o.value} value={o.value}>{o.label}</option>
                                                    ))}
                                                </select>
                                            </label>
                                        </div>
                                        {/* 난이도 별 */}
                                        <div>
                                            <p className="text-[10px] font-black text-white/55 mb-1.5">난이도 *</p>
                                            <div className="flex gap-1">
                                                {[1, 2, 3, 4, 5].map(star => (
                                                    <button
                                                        key={star}
                                                        type="button"
                                                        onClick={() => updateForm({ difficulty_level: star })}
                                                        className="text-xl transition-transform active:scale-110"
                                                        style={{
                                                            color: star <= form.difficulty_level
                                                                ? 'var(--primary)'
                                                                : 'rgba(255,255,255,0.12)',
                                                        }}
                                                    >
                                                        ★
                                                    </button>
                                                ))}
                                                <span className="text-[10px] text-white/30 ml-2 self-center">
                                                    {form.difficulty_level}/5
                                                </span>
                                            </div>
                                        </div>
                                        {/* 활성 여부 */}
                                        <div className="flex items-center gap-3">
                                            <p className="text-[10px] font-black text-white/55">활성 여부</p>
                                            <button
                                                type="button"
                                                onClick={() => updateForm({ is_active: !form.is_active })}
                                                className="relative w-10 h-5 rounded-full transition-colors duration-200"
                                                style={{
                                                    background: form.is_active
                                                        ? 'var(--primary)'
                                                        : 'rgba(255,255,255,0.12)',
                                                }}
                                            >
                                                <span
                                                    className="absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200"
                                                    style={{
                                                        transform: form.is_active ? 'translateX(22px)' : 'translateX(2px)',
                                                    }}
                                                />
                                            </button>
                                            <span className="text-[10px] text-white/40">
                                                {form.is_active ? '활성' : '비활성'}
                                            </span>
                                        </div>
                                    </div>
                                </section>

                                {/* ② 미디어 */}
                                <section>
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-3">
                                        ② 미디어
                                    </p>
                                    <div className="flex flex-col gap-3">
                                        <label className="text-[10px] font-black text-white/55">
                                            썸네일 URL
                                            <input
                                                value={form.thumbnail_url}
                                                onChange={e => updateForm({ thumbnail_url: e.target.value })}
                                                className="admin-search-input w-full mt-1.5"
                                                style={{ background: '#161619', color: '#fff' }}
                                                placeholder="https://..."
                                            />
                                        </label>
                                        {form.thumbnail_url && (
                                            <div
                                                className="rounded-xl overflow-hidden"
                                                style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                                            >
                                                <img
                                                    src={form.thumbnail_url}
                                                    alt="썸네일 미리보기"
                                                    className="w-full h-28 object-cover"
                                                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                />
                                            </div>
                                        )}
                                        <label className="text-[10px] font-black text-white/55">
                                            시범 영상 URL
                                            <div className="flex gap-2 mt-1.5">
                                                <input
                                                    value={form.video_url}
                                                    onChange={e => updateForm({ video_url: e.target.value })}
                                                    className="admin-search-input flex-1"
                                                    style={{ background: '#161619', color: '#fff' }}
                                                    placeholder="YouTube URL 또는 Storage URL"
                                                />
                                                {form.video_url && (
                                                    <a
                                                        href={form.video_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="px-3 rounded-lg text-[10px] font-bold text-white/50 hover:text-white/80 flex items-center gap-1 transition-colors"
                                                        style={{
                                                            background: 'rgba(255,255,255,0.04)',
                                                            border: '1px solid rgba(255,255,255,0.08)',
                                                        }}
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                                                    </a>
                                                )}
                                            </div>
                                        </label>
                                    </div>
                                </section>

                                {/* ③ 상세 정보 */}
                                <section>
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-3">
                                        ③ 상세 정보
                                    </p>
                                    <div className="flex flex-col gap-4">
                                        {/* Equipment 다중 체크박스 */}
                                        <div>
                                            <p className="text-[10px] font-black text-white/55 mb-2">기구 (Equipment)</p>
                                            <div className="grid grid-cols-3 gap-1.5">
                                                {EQUIPMENT_OPTIONS.map(eq => (
                                                    <button
                                                        key={eq}
                                                        type="button"
                                                        onClick={() => toggleEquipment(eq)}
                                                        className="text-[9px] font-bold py-1.5 px-2 rounded-lg text-left transition-all duration-150"
                                                        style={{
                                                            background: form.equipment.includes(eq)
                                                                ? 'rgba(255,107,0,0.12)'
                                                                : 'rgba(255,255,255,0.03)',
                                                            border: form.equipment.includes(eq)
                                                                ? '1px solid rgba(255,107,0,0.3)'
                                                                : '1px solid rgba(255,255,255,0.06)',
                                                            color: form.equipment.includes(eq)
                                                                ? 'var(--primary)'
                                                                : 'rgba(255,255,255,0.45)',
                                                        }}
                                                    >
                                                        {form.equipment.includes(eq) ? '✓ ' : ''}{eq}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <label className="text-[10px] font-black text-white/55">
                                            주요 근육 <span className="text-white/25 font-normal">(쉼표로 구분)</span>
                                            <input
                                                value={form.primary_muscles}
                                                onChange={e => updateForm({ primary_muscles: e.target.value })}
                                                className="admin-search-input w-full mt-1.5"
                                                style={{ background: '#161619', color: '#fff' }}
                                                placeholder="예: 허벅지, 엉덩이, 코어"
                                            />
                                        </label>

                                        <label className="text-[10px] font-black text-white/55">
                                            코치 포인트
                                            <textarea
                                                value={form.coaching_points}
                                                onChange={e => updateForm({ coaching_points: e.target.value })}
                                                className="admin-search-input w-full mt-1.5"
                                                style={{
                                                    background: '#161619',
                                                    color: '#fff',
                                                    minHeight: '80px',
                                                    resize: 'vertical',
                                                }}
                                                placeholder="코치 지도 포인트를 입력하세요..."
                                            />
                                        </label>
                                    </div>
                                </section>

                                {/* ④ 메타 (읽기 전용) */}
                                {form.id && (
                                    <section>
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-3">
                                            ④ 메타
                                        </p>
                                        <div
                                            className="rounded-xl p-3 flex flex-col gap-2"
                                            style={{
                                                background: 'rgba(255,255,255,0.01)',
                                                border: '1px solid rgba(255,255,255,0.04)',
                                            }}
                                        >
                                            <div className="flex items-center justify-between text-[10px]">
                                                <span className="text-white/35">WOD 사용 현황</span>
                                                <span className="font-bold" style={{ color: wodUsageCount > 0 ? 'var(--primary)' : 'rgba(255,255,255,0.35)' }}>
                                                    {wodUsageCount > 0
                                                        ? `${wodUsageCount}개 WOD 템플릿에서 사용 중`
                                                        : '미사용'}
                                                </span>
                                            </div>
                                        </div>
                                    </section>
                                )}
                            </div>

                            {/* 패널 푸터 */}
                            <div
                                className="px-5 py-4 flex gap-2 flex-shrink-0"
                                style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}
                            >
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="admin-action-btn flex-1"
                                    style={{ opacity: saving ? 0.6 : 1 }}
                                >
                                    {saving ? '저장 중...' : '저장'}
                                </button>
                                {form.id && (
                                    <button
                                        onClick={handleToggleActive}
                                        className="px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                                        style={{
                                            background: 'rgba(255,255,255,0.04)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            color: 'rgba(255,255,255,0.6)',
                                        }}
                                    >
                                        {form.is_active ? '비활성화' : '활성화'}
                                    </button>
                                )}
                            </div>
                        </>
                    ) : (
                        /* 패널 비어있음 */
                        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-white/20">
                            <span className="material-symbols-outlined text-6xl text-white/08">
                                fitness_center
                            </span>
                            <div className="text-center">
                                <p className="text-sm font-bold mb-1">운동을 선택하세요</p>
                                <p className="text-[10px] text-white/25">목록에서 운동을 클릭하면 편집 패널이 열립니다</p>
                            </div>
                            <button onClick={openCreate} className="admin-action-btn">
                                + 새 운동 추가
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* 카테고리 추가 모달 */}
            {showCatModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
                    onClick={e => { if (e.target === e.currentTarget) setShowCatModal(false); }}
                >
                    <div
                        className="w-80 rounded-3xl p-6 flex flex-col gap-4"
                        style={{
                            background: 'rgba(18,18,22,0.95)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            backdropFilter: 'blur(20px)',
                        }}
                    >
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-black text-white">카테고리 추가</h4>
                            <button
                                onClick={() => setShowCatModal(false)}
                                className="p-1 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-all"
                            >
                                <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                        </div>
                        <label className="text-[10px] font-black text-white/55">
                            한국어명 *
                            <input
                                value={catForm.name_ko}
                                onChange={e => setCatForm(p => ({ ...p, name_ko: e.target.value }))}
                                className="admin-search-input w-full mt-1.5"
                                style={{ background: '#161619', color: '#fff' }}
                                placeholder="예: 플라이오메트릭"
                            />
                        </label>
                        <label className="text-[10px] font-black text-white/55">
                            영어명 * <span className="text-white/25 font-normal">(slug 자동 생성)</span>
                            <input
                                value={catForm.name_en}
                                onChange={e => setCatForm(p => ({ ...p, name_en: e.target.value }))}
                                className="admin-search-input w-full mt-1.5"
                                style={{ background: '#161619', color: '#fff' }}
                                placeholder="예: Plyometrics"
                            />
                        </label>
                        <label className="text-[10px] font-black text-white/55">
                            카드 색상
                            <div className="flex items-center gap-2 mt-1.5">
                                <input
                                    type="color"
                                    value={catForm.color}
                                    onChange={e => setCatForm(p => ({ ...p, color: e.target.value }))}
                                    className="w-10 h-8 rounded cursor-pointer"
                                    style={{ background: 'transparent', border: 'none' }}
                                />
                                <input
                                    value={catForm.color}
                                    onChange={e => setCatForm(p => ({ ...p, color: e.target.value }))}
                                    className="admin-search-input flex-1 font-mono"
                                    style={{ background: '#161619', color: '#fff' }}
                                    placeholder="#818cf8"
                                />
                            </div>
                        </label>
                        <button
                            onClick={handleAddCategory}
                            disabled={catSaving}
                            className="admin-action-btn w-full"
                            style={{ opacity: catSaving ? 0.6 : 1 }}
                        >
                            {catSaving ? '추가 중...' : '카테고리 추가'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
