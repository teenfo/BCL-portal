'use client';

import { useCallback, useEffect, useState } from 'react';

import { query, rpc } from '@/lib/supabase/query';
import AdminPageHeader from '@/components/layout/AdminPageHeader';
import { useToast } from '@/components/ui/Toast';
import type {
    MovementCategory,
    MovementLibraryRow,
    UpsertWodTemplatePayload,
    UpsertWodTemplateMovementPayload,
    WodFormatType,
    WodTemplateKind,
    WodTemplateScope,
    WodTemplateWithMovements,
} from '@/types/p1a';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const FORMAT_OPTIONS: Array<{ value: WodFormatType; label: string }> = [
    { value: 'for_time', label: 'For Time' },
    { value: 'amrap', label: 'AMRAP' },
    { value: 'emom', label: 'EMOM' },
    { value: 'tabata', label: 'Tabata' },
    { value: 'chipper', label: 'Chipper' },
    { value: 'strength', label: 'Strength' },
    { value: 'custom', label: 'Custom' },
    { value: 'station_circuit', label: 'Station Circuit' },
];

const KIND_OPTIONS: Array<{ value: WodTemplateKind; label: string }> = [
    { value: 'daily', label: 'Daily' },
    { value: 'benchmark', label: 'Benchmark' },
    { value: 'skill', label: 'Skill' },
    { value: 'strength', label: 'Strength' },
    { value: 'conditioning', label: 'Conditioning' },
];

const CATEGORY_OPTIONS: Array<{ value: '' | MovementCategory; label: string }> = [
    { value: '', label: '전체 카테고리' },
    { value: 'weightlifting', label: '바벨 (Weightlifting)' },
    { value: 'gymnastics', label: '체조 (Gymnastics)' },
    { value: 'monostructural', label: '카디오 (Cardio)' },
    { value: 'dumbbell', label: '덤벨 (Dumbbell)' },
    { value: 'kettlebell', label: '케틀벨 (Kettlebell)' },
    { value: 'medball', label: '메드볼 (Medball)' },
    { value: 'other_equipment', label: '기타 기구' },
    { value: 'accessory', label: '보조 운동' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface FormState {
    id?: string;
    facility_id: string | null;
    template_kind: WodTemplateKind;
    title: string;
    format_type: WodFormatType | '';
    time_cap_minutes: string;
    rounds: string;
    description: string;
    public_notes: string;
    coach_notes: string;
    is_shared: boolean;
    is_benchmark: boolean;
    movements: MovementLine[];
}

interface MovementLine extends UpsertWodTemplateMovementPayload {
    _key: string;
    _name?: string;
    _category?: MovementCategory | 'custom';
}

interface FacilityRow { id: string; name: string }

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const emptyForm = (): FormState => ({
    facility_id: null,
    template_kind: 'daily',
    title: '',
    format_type: '',
    time_cap_minutes: '',
    rounds: '',
    description: '',
    public_notes: '',
    coach_notes: '',
    is_shared: false,
    is_benchmark: false,
    movements: [],
});

const newLine = (idx: number): MovementLine => ({
    _key: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    sort_order: idx,
    movement_id: null,
    custom_label: null,
    target_value: null,
    target_unit: 'reps',
    distance_meters: null,
    duration_seconds: null,
    load_male_rx: null,
    load_female_rx: null,
    rx_notes: null,
    scaling_notes: null,
    _category: 'custom',
});

const CATEGORY_CONFIG: Record<string, {
    border: string; bg: string; textBg: string; textColor: string; label: string;
}> = {
    weightlifting: { border: 'rgba(239,68,68,0.25)',    bg: 'rgba(239,68,68,0.04)',    textColor: '#f87171', textBg: 'rgba(239,68,68,0.14)',    label: '바벨' },
    gymnastics:    { border: 'rgba(34,197,94,0.25)',    bg: 'rgba(34,197,94,0.04)',    textColor: '#4ade80', textBg: 'rgba(34,197,94,0.14)',    label: '체조' },
    monostructural:{ border: 'rgba(6,182,212,0.25)',    bg: 'rgba(6,182,212,0.04)',    textColor: '#22d3ee', textBg: 'rgba(6,182,212,0.14)',    label: '카디오' },
    dumbbell:      { border: 'rgba(168,85,247,0.25)',   bg: 'rgba(168,85,247,0.04)',   textColor: '#c084fc', textBg: 'rgba(168,85,247,0.14)',   label: '덤벨' },
    kettlebell:    { border: 'rgba(236,72,153,0.25)',   bg: 'rgba(236,72,153,0.04)',   textColor: '#f472b6', textBg: 'rgba(236,72,153,0.14)',   label: '케틀벨' },
    medball:       { border: 'rgba(245,158,11,0.25)',   bg: 'rgba(245,158,11,0.04)',   textColor: '#fbbf24', textBg: 'rgba(245,158,11,0.14)',   label: '메드볼' },
    other_equipment:{ border:'rgba(20,184,166,0.25)',   bg: 'rgba(20,184,166,0.04)',   textColor: '#2dd4bf', textBg: 'rgba(20,184,166,0.14)',   label: '기타기구' },
    accessory:     { border: 'rgba(99,102,241,0.25)',   bg: 'rgba(99,102,241,0.04)',   textColor: '#818cf8', textBg: 'rgba(99,102,241,0.14)',   label: '보조' },
};

const getCategoryStyle = (cat: string) =>
    CATEGORY_CONFIG[cat] ?? {
        border: 'rgba(255,255,255,0.10)',
        bg: 'rgba(255,255,255,0.03)',
        textColor: 'rgba(255,255,255,0.5)',
        textBg: 'rgba(255,255,255,0.07)',
        label: '커스텀',
    };

const FORMAT_LABEL: Record<WodFormatType, string> = {
    for_time: 'For Time', amrap: 'AMRAP', emom: 'EMOM', tabata: 'Tabata',
    chipper: 'Chipper', strength: 'Strength', custom: 'Custom', station_circuit: 'Station',
};

const KIND_LABEL: Record<WodTemplateKind, string> = {
    daily: 'Daily', benchmark: 'Benchmark', skill: 'Skill',
    strength: 'Strength', conditioning: 'Conditioning',
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminWodTemplatesPage() {
    const [scope, setScope] = useState<WodTemplateScope>('benchmark');
    const [facilityFilter, setFacilityFilter] = useState<string>('');
    const [facilities, setFacilities] = useState<FacilityRow[]>([]);
    const [templates, setTemplates] = useState<WodTemplateWithMovements[]>([]);
    const [loading, setLoading] = useState(true);
    const [showPanel, setShowPanel] = useState(false);
    const [form, setForm] = useState<FormState>(emptyForm());
    const [saving, setSaving] = useState(false);

    // Movement search
    const [movementSearch, setMovementSearch] = useState('');
    const [movementCategory, setMovementCategory] = useState<'' | MovementCategory>('');
    const [movementResults, setMovementResults] = useState<MovementLibraryRow[]>([]);
    const [searching, setSearching] = useState(false);

    // UI states
    const [activeNotesKeys, setActiveNotesKeys] = useState<string[]>([]);
    const [pulsingKeys, setPulsingKeys] = useState<string[]>([]);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const { success, error: toastError } = useToast();

    // ── Data loaders ────────────────────────────────────────────────────────

    const loadFacilities = useCallback(async () => {
        const { data } = await query('facilities').select('id, name').order('name');
        if (data) setFacilities(data as FacilityRow[]);
    }, []);

    const loadTemplates = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await rpc('fn_list_wod_templates', {
                p_scope: scope,
                p_facility_id: scope === 'facility' ? (facilityFilter || null) : null,
                p_template_kind: null,
            });
            if (data?.success) setTemplates(data.data as WodTemplateWithMovements[]);
            else setTemplates([]);
        } catch {
            setTemplates([]);
        }
        setLoading(false);
    }, [scope, facilityFilter]);

    useEffect(() => { void loadFacilities(); }, [loadFacilities]);
    useEffect(() => { void loadTemplates(); }, [loadTemplates]);

    // ── Panel open/close ─────────────────────────────────────────────────────

    const openCreate = () => {
        setForm(emptyForm());
        setMovementResults([]);
        setMovementSearch('');
        setActiveNotesKeys([]);
        setPulsingKeys([]);
        setDeleteConfirmId(null);
        setShowPanel(true);
    };

    const openEdit = (t: WodTemplateWithMovements) => {
        const loadedMovements = (t.movements || []).map((m, idx) => ({
            _key: `e-${m.id}-${idx}`,
            sort_order: idx,
            movement_id: m.movement_id,
            custom_label: m.custom_label,
            target_value: m.target_value,
            target_unit: m.target_unit,
            distance_meters: m.distance_meters,
            duration_seconds: m.duration_seconds,
            load_male_rx: m.load_male_rx,
            load_female_rx: m.load_female_rx,
            rx_notes: m.rx_notes,
            scaling_notes: m.scaling_notes,
            _category: 'custom' as const,
        }));

        setForm({
            id: t.id,
            facility_id: t.facility_id,
            template_kind: t.template_kind,
            title: t.title,
            format_type: (t.format_type ?? '') as WodFormatType | '',
            time_cap_minutes: t.time_cap_minutes?.toString() ?? '',
            rounds: t.rounds?.toString() ?? '',
            description: t.description ?? '',
            public_notes: t.public_notes ?? '',
            coach_notes: t.coach_notes ?? '',
            is_shared: t.is_shared,
            is_benchmark: t.is_benchmark,
            movements: loadedMovements,
        });

        const keysWithNotes = loadedMovements
            .filter(m => !!m.rx_notes || !!m.scaling_notes)
            .map(m => m._key);
        setActiveNotesKeys(keysWithNotes);
        setPulsingKeys([]);
        setMovementResults([]);
        setDeleteConfirmId(null);
        setShowPanel(true);
    };

    // ── Form helpers ─────────────────────────────────────────────────────────

    const updateForm = (patch: Partial<FormState>) =>
        setForm(prev => ({ ...prev, ...patch }));

    const updateLine = (key: string, patch: Partial<MovementLine>) =>
        setForm(prev => ({
            ...prev,
            movements: prev.movements.map(l => l._key === key ? { ...l, ...patch } : l),
        }));

    const removeLine = (key: string) => {
        setForm(prev => ({
            ...prev,
            movements: prev.movements
                .filter(l => l._key !== key)
                .map((l, i) => ({ ...l, sort_order: i })),
        }));
        setActiveNotesKeys(prev => prev.filter(k => k !== key));
        setPulsingKeys(prev => prev.filter(k => k !== key));
    };

    const toggleNotes = (key: string) =>
        setActiveNotesKeys(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );

    const triggerPulseAndScroll = (key: string) => {
        setPulsingKeys(prev => [...prev, key]);
        setTimeout(() => setPulsingKeys(prev => prev.filter(k => k !== key)), 1200);
        setTimeout(() => {
            document.getElementById(`wod-mov-line-${key}`)?.scrollIntoView({
                behavior: 'smooth', block: 'nearest',
            });
        }, 80);
    };

    const handleAddCustomLine = () => {
        const key = `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        setForm(prev => ({
            ...prev,
            movements: [...prev.movements, { ...newLine(prev.movements.length), _key: key }],
        }));
        triggerPulseAndScroll(key);
    };

    const handleAddMovementLine = (m: MovementLibraryRow) => {
        const key = `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        setForm(prev => ({
            ...prev,
            movements: [...prev.movements, {
                ...newLine(prev.movements.length),
                _key: key,
                movement_id: m.id,
                _name: m.name_ko,
                _category: m.category,
            }],
        }));
        setMovementSearch('');
        setMovementResults([]);
        triggerPulseAndScroll(key);
    };

    const moveLine = (key: string, dir: -1 | 1) =>
        setForm(prev => {
            const idx = prev.movements.findIndex(l => l._key === key);
            if (idx < 0) return prev;
            const swap = idx + dir;
            if (swap < 0 || swap >= prev.movements.length) return prev;
            const next = [...prev.movements];
            [next[idx], next[swap]] = [next[swap], next[idx]];
            return { ...prev, movements: next.map((l, i) => ({ ...l, sort_order: i })) };
        });

    // ── Search ───────────────────────────────────────────────────────────────

    const handleSearchMovements = async () => {
        setSearching(true);
        try {
            const { data } = await rpc('fn_search_wod_movements', {
                p_query: movementSearch || null,
                p_category: movementCategory || null,
                p_equipment: null,
                p_limit: 30,
            });
            if (data?.success) setMovementResults(data.data as MovementLibraryRow[]);
            else setMovementResults([]);
        } catch {
            setMovementResults([]);
        }
        setSearching(false);
    };

    // ── Save / Delete ─────────────────────────────────────────────────────────

    const handleSave = async (publish: boolean) => {
        if (!form.title.trim()) {
            toastError('제목을 입력하세요.');
            return;
        }
        setSaving(true);
        const payload: UpsertWodTemplatePayload = {
            id: form.id,
            facility_id: form.facility_id,
            template_kind: form.template_kind,
            title: form.title.trim(),
            format_type: (form.format_type || null) as WodFormatType | null,
            time_cap_minutes: form.time_cap_minutes ? Number.parseInt(form.time_cap_minutes, 10) : null,
            rounds: form.rounds ? Number.parseInt(form.rounds, 10) : null,
            description: form.description.trim() || null,
            public_notes: form.public_notes.trim() || null,
            coach_notes: form.coach_notes.trim() || null,
            is_shared: form.is_shared,
            is_benchmark: form.is_benchmark,
            publish,
            movements: form.movements.map((l, i) => ({
                sort_order: i,
                movement_id: l.movement_id || null,
                custom_label: l.custom_label || null,
                target_value: l.target_value,
                target_unit: l.target_unit,
                distance_meters: l.distance_meters,
                duration_seconds: l.duration_seconds,
                load_male_rx: l.load_male_rx,
                load_female_rx: l.load_female_rx,
                rx_notes: l.rx_notes,
                scaling_notes: l.scaling_notes,
            })),
        };
        try {
            const { data, error } = await rpc('fn_upsert_wod_template', { p_payload: payload });
            if (error || !data?.success) {
                toastError(data?.error || error?.message || '저장 실패');
            } else {
                success(form.id ? '템플릿을 수정했습니다.' : '템플릿을 생성했습니다.');
                setShowPanel(false);
                await loadTemplates();
            }
        } catch (e: unknown) {
            toastError(e instanceof Error ? e.message : '저장 중 오류');
        }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        try {
            const { error } = await query('wod_templates').delete().eq('id', id);
            if (error) {
                toastError('삭제 실패: ' + error.message);
            } else {
                success('WOD 템플릿을 삭제했습니다.');
                setShowPanel(false);
                setDeleteConfirmId(null);
                await loadTemplates();
            }
        } catch (e: unknown) {
            toastError(e instanceof Error ? e.message : '삭제 중 오류가 발생했습니다.');
        }
    };

    // ── Computed ─────────────────────────────────────────────────────────────

    const kpiStats = {
        total: templates.length,
        benchmark: templates.filter(t => t.is_benchmark).length,
        shared: templates.filter(t => t.is_shared).length,
    };

    const isStationCircuit = form.format_type === 'station_circuit';

    const getMovementLabel = (idx: number) =>
        isStationCircuit ? `Station ${idx + 1}` : `Movement ${idx + 1}`;

    const scopeEmptyMsg: Record<WodTemplateScope, string> = {
        benchmark: '등록된 벤치마크 WOD가 없습니다',
        facility: '이 지점에 등록된 WOD가 없습니다',
        shared: '공유된 WOD 템플릿이 없습니다',
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            <AdminPageHeader
                category="OPERATIONS"
                title="WOD Templates"
                subtitle="shared & benchmark"
                actions={
                    <button onClick={openCreate} className="admin-action-btn">
                        + 새 WOD 템플릿
                    </button>
                }
            />

            {/* 2단 메인 레이아웃 */}
            <div className="flex-1 flex gap-6 p-6 min-h-0 overflow-hidden bg-[#0a0a0c]">

                {/* ── 좌측: 목록 ───────────────────────────────────────────── */}
                <div className="flex-1 flex flex-col min-h-0 min-w-0">

                    {/* KPI 요약 바 */}
                    <div className="flex gap-3 mb-4 flex-shrink-0">
                        {[
                            { label: '전체', value: kpiStats.total, color: 'rgba(255,255,255,0.6)' },
                            { label: 'Benchmark', value: kpiStats.benchmark, color: 'var(--primary)' },
                            { label: 'Shared', value: kpiStats.shared, color: '#4ade80' },
                        ].map(stat => (
                            <div
                                key={stat.label}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl"
                                style={{
                                    background: 'rgba(255,255,255,0.02)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                }}
                            >
                                <span
                                    className="text-lg font-black"
                                    style={{ color: stat.color }}
                                >
                                    {stat.value}
                                </span>
                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                                    {stat.label}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* 필터 행 */}
                    <div className="flex items-center gap-2 mb-4 flex-wrap flex-shrink-0">
                        {(['benchmark', 'facility', 'shared'] as const).map(s => (
                            <button
                                key={s}
                                onClick={() => {
                                    setScope(s);
                                    setShowPanel(false);
                                }}
                                className={`admin-filter-btn ${scope === s ? 'active' : ''}`}
                            >
                                {s === 'benchmark' ? 'Benchmark (글로벌)' : s === 'facility' ? 'Facility' : 'Shared'}
                            </button>
                        ))}
                        {scope === 'facility' && (
                            <select
                                value={facilityFilter}
                                onChange={e => setFacilityFilter(e.target.value)}
                                className="admin-search-input cursor-pointer"
                                style={{ colorScheme: 'dark', width: 'auto' }}
                            >
                                <option value="">지점 전체</option>
                                {facilities.map(f => (
                                    <option key={f.id} value={f.id}>{f.name}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* 카드 그리드 */}
                    <div className="flex-1 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                        {loading ? (
                            <div className="flex items-center justify-center h-48 text-white/40 text-xs">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white/30 mr-2" />
                                <span>템플릿 목록 로드 중...</span>
                            </div>
                        ) : templates.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 rounded-2xl text-white/30 text-xs"
                                style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)' }}>
                                <span className="material-symbols-outlined text-4xl mb-3 text-white/10">
                                    fitness_center
                                </span>
                                <span className="font-bold">{scopeEmptyMsg[scope]}</span>
                                <button
                                    onClick={openCreate}
                                    className="admin-action-btn mt-4"
                                    style={{ padding: '0.5rem 1.25rem', fontSize: '10px' }}
                                >
                                    + 새 템플릿 작성
                                </button>
                            </div>
                        ) : (
                            <div className={`grid gap-3 transition-all duration-300 ${
                                showPanel
                                    ? 'grid-cols-1 xl:grid-cols-2'
                                    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                            }`}>
                                {templates.map(t => {
                                    const isSelected = form.id === t.id && showPanel;
                                    // collect unique categories from movements (use movement info if available)
                                    const movCategories = Array.from(
                                        new Set(
                                            (t.movements || []).map(m =>
                                                m.movement_id ? 'library' : 'custom'
                                            )
                                        )
                                    );
                                    // Use categories from template movements
                                    const displayCategories = (t.movements || [])
                                        .slice(0, 4)
                                        .map(m => ({ label: m.custom_label || '동작', isCustom: !m.movement_id }));

                                    return (
                                        <div
                                            key={t.id}
                                            onClick={() => openEdit(t)}
                                            className={`wod-template-card rounded-2xl p-4 cursor-pointer transition-all duration-200 flex flex-col justify-between min-w-0 backdrop-blur-md ${
                                                isSelected ? 'selected-card shadow-lg' : ''
                                            }`}
                                            style={{
                                                background: isSelected
                                                    ? 'rgba(255,107,0,0.04)'
                                                    : 'rgba(255,255,255,0.02)',
                                                border: isSelected
                                                    ? '1px solid var(--primary)'
                                                    : '1px solid rgba(255,255,255,0.05)',
                                                boxShadow: isSelected
                                                    ? '0 0 0 1px var(--primary), 0 8px 24px rgba(255,107,0,0.08)'
                                                    : undefined,
                                            }}
                                        >
                                            {/* 카드 헤더 */}
                                            <div>
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="text-sm font-extrabold text-white tracking-tight truncate">
                                                            {t.title}
                                                        </h3>
                                                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                            {t.template_kind && (
                                                                <span className="text-[9px] font-black uppercase tracking-widest text-white/35">
                                                                    {KIND_LABEL[t.template_kind]}
                                                                </span>
                                                            )}
                                                            {t.format_type && (
                                                                <>
                                                                    <span className="text-white/15 text-[9px]">·</span>
                                                                    <span
                                                                        className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
                                                                        style={{
                                                                            background: 'rgba(255,107,0,0.1)',
                                                                            color: 'var(--primary)',
                                                                        }}
                                                                    >
                                                                        {FORMAT_LABEL[t.format_type]}
                                                                    </span>
                                                                </>
                                                            )}
                                                            {t.time_cap_minutes && (
                                                                <>
                                                                    <span className="text-white/15 text-[9px]">·</span>
                                                                    <span className="text-[9px] font-bold text-white/40">
                                                                        {t.time_cap_minutes}{t.format_type === 'station_circuit' ? 's' : 'm'}
                                                                    </span>
                                                                </>
                                                            )}
                                                            {t.rounds && (
                                                                <>
                                                                    <span className="text-white/15 text-[9px]">·</span>
                                                                    <span className="text-[9px] font-bold text-white/40">{t.rounds}R</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {/* 뱃지 */}
                                                    <div className="flex flex-col gap-1 items-end flex-shrink-0">
                                                        {t.is_benchmark && (
                                                            <span className="text-[8px] px-1.5 py-0.5 rounded font-black tracking-widest"
                                                                style={{ background: 'rgba(255,107,0,0.12)', color: 'var(--primary)', border: '1px solid rgba(255,107,0,0.25)' }}>
                                                                BENCHMARK
                                                            </span>
                                                        )}
                                                        {t.is_shared && (
                                                            <span className="text-[8px] px-1.5 py-0.5 rounded font-black tracking-widest bg-green-500/10 text-green-400 border border-green-500/25">
                                                                SHARED
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {t.description && (
                                                    <p className="text-xs text-white/45 mb-3 line-clamp-2 leading-relaxed">
                                                        {t.description}
                                                    </p>
                                                )}
                                            </div>

                                            {/* 카드 푸터 — Movement 수 */}
                                            {t.movements && t.movements.length > 0 && (
                                                <div
                                                    className="flex items-center justify-between pt-3 mt-2"
                                                    style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                                                >
                                                    {/* 동작 이름 미리보기 칩 */}
                                                    <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                                                        {t.movements.slice(0, 3).map((m, i) => {
                                                            const label = m.movement_name_ko || m.custom_label;
                                                            if (!label) return null;
                                                            return (
                                                                <span
                                                                    key={i}
                                                                    className="text-[8px] font-bold px-1.5 py-0.5 rounded truncate max-w-[70px]"
                                                                    style={{
                                                                        background: 'rgba(255,255,255,0.05)',
                                                                        color: 'rgba(255,255,255,0.5)',
                                                                        border: '1px solid rgba(255,255,255,0.07)',
                                                                    }}
                                                                    title={label}
                                                                >
                                                                    {label}
                                                                </span>
                                                            );
                                                        })}
                                                        {t.movements.length > 3 && (
                                                            <span className="text-[8px] font-black text-white/25 self-center">
                                                                +{t.movements.length - 3}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] text-white/30 font-bold flex-shrink-0 ml-2">
                                                        {t.movements.length} Movements
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── 우측: 편집 패널 ──────────────────────────────────────── */}
                <div
                    className="w-[480px] h-full flex-shrink-0 flex flex-col min-h-0 rounded-3xl overflow-hidden glass-card transition-all duration-300 shadow-2xl"
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
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <h3 className="text-sm font-black text-white tracking-wide uppercase">
                                            {form.id ? 'WOD Editor' : 'Create WOD'}
                                        </h3>
                                        {/* 종류 + 포맷 인라인 뱃지 */}
                                        {form.template_kind && (
                                            <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded text-white/50"
                                                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                                {KIND_LABEL[form.template_kind]}
                                            </span>
                                        )}
                                        {form.format_type && (
                                            <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
                                                style={{ background: 'rgba(255,107,0,0.1)', color: 'var(--primary)', border: '1px solid rgba(255,107,0,0.2)' }}>
                                                {FORMAT_LABEL[form.format_type as WodFormatType]}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[9px] text-white/35 tracking-wider font-bold uppercase">
                                        {form.id ? 'Edit selected template' : 'Create new shared template'}
                                    </p>
                                </div>

                                {/* 삭제 2단계 UI */}
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
                                                title="템플릿 삭제"
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

                            {/* 패널 바디 */}
                            <div
                                className="flex-1 overflow-y-auto p-5 flex flex-col gap-4"
                                style={{ scrollbarWidth: 'thin' }}
                            >
                                {/* ── 기본 정보 섹션 ────────────────────────── */}
                                <section>
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-3">
                                        ● 기본 정보
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* 제목 */}
                                        <label className="text-[10px] font-black text-white/55 col-span-2">
                                            WOD 템플릿 제목 *
                                            <input
                                                value={form.title}
                                                onChange={e => updateForm({ title: e.target.value })}
                                                className="admin-search-input w-full mt-1.5 font-bold"
                                                style={{ background: '#161619', color: '#fff' }}
                                                placeholder="예: 챌린지 서킷 WOD A"
                                            />
                                        </label>

                                        {/* 종류 */}
                                        <label className="text-[10px] font-black text-white/55">
                                            WOD 종류
                                            <select
                                                value={form.template_kind}
                                                onChange={e => updateForm({ template_kind: e.target.value as WodTemplateKind })}
                                                className="admin-search-input w-full mt-1.5 cursor-pointer"
                                                style={{ background: '#161619', color: '#fff', colorScheme: 'dark' }}
                                            >
                                                {KIND_OPTIONS.map(o => (
                                                    <option key={o.value} value={o.value} style={{ backgroundColor: '#161619' }}>
                                                        {o.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>

                                        {/* 포맷 */}
                                        <label className="text-[10px] font-black text-white/55">
                                            포맷 규격
                                            <select
                                                value={form.format_type}
                                                onChange={e => updateForm({ format_type: e.target.value as WodFormatType | '' })}
                                                className="admin-search-input w-full mt-1.5 cursor-pointer"
                                                style={{ background: '#161619', color: '#fff', colorScheme: 'dark' }}
                                            >
                                                <option value="" style={{ backgroundColor: '#161619' }}>선택 안함</option>
                                                {FORMAT_OPTIONS.map(o => (
                                                    <option key={o.value} value={o.value} style={{ backgroundColor: '#161619' }}>
                                                        {o.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>

                                        {/* Time Cap */}
                                        <label className="text-[10px] font-black text-white/55">
                                            {isStationCircuit ? '⏱ 스테이션당 시간 (초)' : '⏱ Time Cap (분)'}
                                            <input
                                                value={form.time_cap_minutes}
                                                onChange={e => updateForm({ time_cap_minutes: e.target.value.replace(/\D/g, '') })}
                                                className="admin-search-input w-full mt-1.5"
                                                style={{ background: '#161619', color: '#fff' }}
                                                placeholder={isStationCircuit ? '예: 300 (5분)' : '예: 15'}
                                            />
                                        </label>

                                        {/* Rounds */}
                                        <label className="text-[10px] font-black text-white/55">
                                            {isStationCircuit ? '🔄 스테이션 수' : '🔄 Rounds'}
                                            <input
                                                value={form.rounds}
                                                onChange={e => updateForm({ rounds: e.target.value.replace(/\D/g, '') })}
                                                className="admin-search-input w-full mt-1.5"
                                                style={{ background: '#161619', color: '#fff' }}
                                                placeholder={isStationCircuit ? '예: 6' : '예: 5'}
                                            />
                                        </label>

                                        {/* 배정 시설 */}
                                        <label className="text-[10px] font-black text-white/55 col-span-2">
                                            배정 시설
                                            <select
                                                value={form.facility_id ?? ''}
                                                onChange={e => updateForm({ facility_id: e.target.value || null })}
                                                className="admin-search-input w-full mt-1.5 cursor-pointer"
                                                style={{ background: '#161619', color: '#fff', colorScheme: 'dark' }}
                                            >
                                                <option value="" style={{ backgroundColor: '#161619' }}>글로벌 (전 지점 공유)</option>
                                                {facilities.map(f => (
                                                    <option key={f.id} value={f.id} style={{ backgroundColor: '#161619' }}>{f.name}</option>
                                                ))}
                                            </select>
                                        </label>

                                        {/* 토글 뱃지 */}
                                        <div className="flex items-center gap-2 col-span-2">
                                            {[
                                                {
                                                    field: 'is_shared' as const,
                                                    label: '타 지점 공유',
                                                    icon: form.is_shared ? 'share' : 'lock',
                                                    activeStyle: { background: 'rgba(34,197,94,0.08)', borderColor: '#4ade80', color: '#4ade80' },
                                                },
                                                {
                                                    field: 'is_benchmark' as const,
                                                    label: '공식 벤치마크',
                                                    icon: form.is_benchmark ? 'star' : 'star_border',
                                                    activeStyle: { background: 'rgba(255,107,0,0.08)', borderColor: 'var(--primary)', color: 'var(--primary)' },
                                                },
                                            ].map(tog => (
                                                <div
                                                    key={tog.field}
                                                    onClick={() => updateForm({ [tog.field]: !form[tog.field] })}
                                                    className="wod-toggle-badge flex-1 justify-center py-2 rounded-xl text-xs font-black cursor-pointer transition-all flex items-center gap-1.5"
                                                    style={
                                                        form[tog.field]
                                                            ? { ...tog.activeStyle, border: `1px solid ${tog.activeStyle.borderColor}`, boxShadow: '0 0 12px rgba(0,0,0,0.2)' }
                                                            : { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }
                                                    }
                                                >
                                                    <span className="material-symbols-outlined text-[14px]">{tog.icon}</span>
                                                    {tog.label}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </section>

                                {/* ── 노트 섹션 ─────────────────────────────── */}
                                <section>
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-3">
                                        ● 노트
                                    </p>
                                    <div className="flex flex-col gap-3">
                                        <label className="text-[10px] font-black text-white/55">
                                            Public Notes
                                            <span className="text-[9px] font-normal text-white/25 ml-1">(회원 공개)</span>
                                            <textarea
                                                value={form.public_notes}
                                                onChange={e => updateForm({ public_notes: e.target.value })}
                                                rows={2}
                                                className="w-full mt-1.5 px-3 py-2 rounded-xl text-xs text-white focus:outline-none transition-all resize-y min-h-[60px] placeholder:text-white/25 font-medium"
                                                style={{ background: '#161619', border: '1px solid rgba(255,255,255,0.08)' }}
                                                onFocus={e => (e.target.style.borderColor = 'rgba(255,107,0,0.45)')}
                                                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                                                placeholder="회원들이 WOD를 볼 때 참고할 가이드를 작성하세요."
                                            />
                                        </label>
                                        <label className="text-[10px] font-black text-white/55">
                                            Coach Notes
                                            <span className="text-[9px] font-normal text-white/25 ml-1">(코치 전용)</span>
                                            <textarea
                                                value={form.coach_notes}
                                                onChange={e => updateForm({ coach_notes: e.target.value })}
                                                rows={2}
                                                className="w-full mt-1.5 px-3 py-2 rounded-xl text-xs text-white focus:outline-none transition-all resize-y min-h-[60px] placeholder:text-white/25 font-medium"
                                                style={{ background: '#161619', border: '1px solid rgba(255,255,255,0.08)' }}
                                                onFocus={e => (e.target.style.borderColor = 'rgba(255,107,0,0.45)')}
                                                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                                                placeholder="수업을 지도할 코치들만 확인 가능한 세부 처방 지침을 기재하세요."
                                            />
                                        </label>
                                        <label className="text-[10px] font-black text-white/55">
                                            WOD 상세 설명
                                            <textarea
                                                value={form.description}
                                                onChange={e => updateForm({ description: e.target.value })}
                                                rows={2}
                                                className="w-full mt-1.5 px-3 py-2 rounded-xl text-xs text-white focus:outline-none transition-all resize-y min-h-[52px] placeholder:text-white/25 font-medium"
                                                style={{ background: '#161619', border: '1px solid rgba(255,255,255,0.08)' }}
                                                onFocus={e => (e.target.style.borderColor = 'rgba(255,107,0,0.45)')}
                                                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                                                placeholder="WOD 구성 요소 또는 진행 가이드를 기술하세요."
                                            />
                                        </label>
                                    </div>
                                </section>

                                {/* ── Movement Lines ────────────────────────── */}
                                <section>
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
                                            ● Movement Lines
                                            <span className="ml-1.5 text-white/20">({form.movements.length})</span>
                                        </p>
                                    </div>

                                    <div
                                        className="rounded-2xl p-3 flex flex-col gap-3"
                                        style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}
                                    >
                                        {form.movements.length === 0 ? (
                                            <p className="text-xs text-white/25 text-center py-5 border border-dashed rounded-xl"
                                                style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                                                아래 운동 검색기 또는 직접 추가 버튼으로 동작을 추가하세요
                                            </p>
                                        ) : (
                                            <div className="flex flex-col gap-2.5">
                                                {form.movements.map((l, idx) => {
                                                    const cat = l._category ?? 'custom';
                                                    const style = getCategoryStyle(cat);
                                                    const isPulsing = pulsingKeys.includes(l._key);
                                                    const isNotesOpen = activeNotesKeys.includes(l._key);

                                                    return (
                                                        <div
                                                            id={`wod-mov-line-${l._key}`}
                                                            key={l._key}
                                                            className={`flex flex-col gap-2.5 rounded-xl p-3 border transition-all ${isPulsing ? 'wod-card-pulse-active' : ''}`}
                                                            style={{
                                                                borderColor: style.border,
                                                                background: style.bg,
                                                            }}
                                                        >
                                                            {/* 상단: 인덱스 뱃지 + 카테고리 + 액션 버튼 */}
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    {/* 순서 뱃지 */}
                                                                    <span
                                                                        className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black flex-shrink-0"
                                                                        style={{ background: style.textBg, color: style.textColor }}
                                                                    >
                                                                        {idx + 1}
                                                                    </span>
                                                                    <span
                                                                        className="text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-widest"
                                                                        style={{ color: style.textColor, background: style.textBg }}
                                                                    >
                                                                        {style.label}
                                                                    </span>
                                                                    <span className="text-[9px] font-bold text-white/30">
                                                                        {getMovementLabel(idx)}
                                                                    </span>
                                                                </div>

                                                                <div className="wod-panel-action-group flex-shrink-0">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => toggleNotes(l._key)}
                                                                        className="wod-panel-btn"
                                                                        title="RX/스케일링 노트"
                                                                        style={{ color: isNotesOpen ? 'var(--primary)' : undefined }}
                                                                    >
                                                                        <span className="material-symbols-outlined text-[15px]">description</span>
                                                                    </button>
                                                                    <div className="wod-panel-divider" />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => moveLine(l._key, -1)}
                                                                        disabled={idx === 0}
                                                                        className="wod-panel-btn"
                                                                        title="위로"
                                                                    >
                                                                        <span className="material-symbols-outlined text-[15px]">keyboard_arrow_up</span>
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => moveLine(l._key, 1)}
                                                                        disabled={idx === form.movements.length - 1}
                                                                        className="wod-panel-btn"
                                                                        title="아래로"
                                                                    >
                                                                        <span className="material-symbols-outlined text-[15px]">keyboard_arrow_down</span>
                                                                    </button>
                                                                    <div className="wod-panel-divider" />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeLine(l._key)}
                                                                        className="wod-panel-btn danger"
                                                                        title="삭제"
                                                                    >
                                                                        <span className="material-symbols-outlined text-[15px]">close</span>
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* 동작명 */}
                                                            <input
                                                                value={l._name ?? (l.custom_label || '')}
                                                                disabled={!!l.movement_id}
                                                                onChange={e => updateLine(l._key, { custom_label: e.target.value })}
                                                                placeholder="동작명을 직접 입력하세요"
                                                                className="w-full px-2.5 py-1.5 rounded-lg text-xs font-bold focus:outline-none transition-all"
                                                                style={{
                                                                    background: '#161619',
                                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                                    color: l.movement_id ? 'rgba(255,255,255,0.4)' : '#fff',
                                                                    WebkitTextFillColor: l.movement_id ? 'rgba(255,255,255,0.4)' : '#fff',
                                                                    opacity: 1,
                                                                    cursor: l.movement_id ? 'not-allowed' : 'text',
                                                                }}
                                                            />

                                                            {/* Target + Rx Load */}
                                                            <div className="grid grid-cols-2 gap-2">
                                                                {/* Target */}
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="text-[8px] font-black text-white/35 uppercase tracking-wider">Target</span>
                                                                    <div
                                                                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                                                                        style={{ background: '#161619', border: '1px solid rgba(255,255,255,0.08)' }}
                                                                    >
                                                                        <input
                                                                            value={l.target_value ?? ''}
                                                                            onChange={e => updateLine(l._key, { target_value: e.target.value ? Number(e.target.value) : null })}
                                                                            placeholder="값"
                                                                            className="w-full text-xs text-white text-center p-0 border-none outline-none font-bold"
                                                                            style={{ background: 'transparent' }}
                                                                        />
                                                                        <div className="w-px h-3 bg-white/10 flex-shrink-0" />
                                                                        <select
                                                                            value={l.target_unit ?? 'reps'}
                                                                            onChange={e => updateLine(l._key, { target_unit: e.target.value })}
                                                                            className="text-[10px] text-white/55 py-0 pl-1 border-none outline-none font-bold cursor-pointer"
                                                                            style={{ background: 'transparent', colorScheme: 'dark' }}
                                                                        >
                                                                            <option value="reps" style={{ backgroundColor: '#161619' }}>reps</option>
                                                                            <option value="meters" style={{ backgroundColor: '#161619' }}>m</option>
                                                                            <option value="seconds" style={{ backgroundColor: '#161619' }}>초</option>
                                                                            <option value="calories" style={{ backgroundColor: '#161619' }}>cal</option>
                                                                        </select>
                                                                    </div>
                                                                </div>

                                                                {/* Rx Load */}
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="text-[8px] font-black text-white/35 uppercase tracking-wider">Rx Load</span>
                                                                    <div
                                                                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                                                                        style={{ background: '#161619', border: '1px solid rgba(255,255,255,0.08)' }}
                                                                    >
                                                                        <span className="text-[9px] font-black text-blue-400 select-none">♂</span>
                                                                        <input
                                                                            value={l.load_male_rx ?? ''}
                                                                            onChange={e => updateLine(l._key, { load_male_rx: e.target.value || null })}
                                                                            placeholder="남"
                                                                            className="w-full text-xs text-white text-center p-0 border-none outline-none font-bold"
                                                                            style={{ background: 'transparent' }}
                                                                        />
                                                                        <div className="w-px h-3 bg-white/10 flex-shrink-0" />
                                                                        <span className="text-[9px] font-black text-pink-400 select-none">♀</span>
                                                                        <input
                                                                            value={l.load_female_rx ?? ''}
                                                                            onChange={e => updateLine(l._key, { load_female_rx: e.target.value || null })}
                                                                            placeholder="여"
                                                                            className="w-full text-xs text-white text-center p-0 border-none outline-none font-bold"
                                                                            style={{ background: 'transparent' }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* RX/Scaling Notes 슬라이드 */}
                                                            <div className={`wod-notes-panel ${isNotesOpen ? 'open' : ''}`}>
                                                                <div
                                                                    className="flex flex-col gap-2 p-2.5 rounded-lg"
                                                                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}
                                                                >
                                                                    <div className="flex flex-col gap-1">
                                                                        <span className="text-[8px] text-white/35 font-black">Rx Notes</span>
                                                                        <input
                                                                            value={l.rx_notes ?? ''}
                                                                            onChange={e => updateLine(l._key, { rx_notes: e.target.value || null })}
                                                                            placeholder="예: Unbroken으로 수행 가능한 무게"
                                                                            className="w-full px-2.5 py-1.5 rounded-lg text-xs text-white focus:outline-none transition-all font-bold"
                                                                            style={{ background: '#161619', border: '1px solid rgba(255,255,255,0.08)', fontSize: '11px' }}
                                                                        />
                                                                    </div>
                                                                    <div className="flex flex-col gap-1">
                                                                        <span className="text-[8px] text-white/35 font-black">Scaling Notes</span>
                                                                        <input
                                                                            value={l.scaling_notes ?? ''}
                                                                            onChange={e => updateLine(l._key, { scaling_notes: e.target.value || null })}
                                                                            placeholder="초보자용 대체 가이드"
                                                                            className="w-full px-2.5 py-1.5 rounded-lg text-xs text-white focus:outline-none transition-all font-bold"
                                                                            style={{ background: '#161619', border: '1px solid rgba(255,255,255,0.08)', fontSize: '11px' }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* 커스텀 추가 버튼 */}
                                        <button
                                            type="button"
                                            onClick={handleAddCustomLine}
                                            className="mt-1 w-full py-2 rounded-xl text-xs font-black transition-all text-white/40 hover:text-white/70"
                                            style={{
                                                background: 'rgba(255,255,255,0.01)',
                                                border: '1px dashed rgba(255,255,255,0.12)',
                                            }}
                                            onMouseEnter={e => {
                                                (e.currentTarget.style.background = 'rgba(255,255,255,0.04)');
                                                (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)');
                                            }}
                                            onMouseLeave={e => {
                                                (e.currentTarget.style.background = 'rgba(255,255,255,0.01)');
                                                (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)');
                                            }}
                                        >
                                            + 직접 커스텀 동작 추가
                                        </button>
                                    </div>
                                </section>

                                {/* ── 운동 라이브러리 검색 ─────────────────── */}
                                <section>
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-3">
                                        ● 운동 라이브러리 검색
                                    </p>
                                    <div
                                        className="rounded-2xl p-3 flex flex-col gap-3"
                                        style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}
                                    >
                                        <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-stretch">
                                            <input
                                                value={movementSearch}
                                                onChange={e => setMovementSearch(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleSearchMovements()}
                                                placeholder="검색어..."
                                                className="admin-search-input font-bold text-xs"
                                                style={{ background: '#161619' }}
                                            />
                                            <select
                                                value={movementCategory}
                                                onChange={e => setMovementCategory(e.target.value as MovementCategory | '')}
                                                className="admin-search-input cursor-pointer font-bold text-xs"
                                                style={{ background: '#161619', color: '#fff', colorScheme: 'dark', width: 'auto', minWidth: '90px' }}
                                            >
                                                {CATEGORY_OPTIONS.map(o => (
                                                    <option key={o.value || 'all'} value={o.value} style={{ backgroundColor: '#161619', color: '#fff' }}>
                                                        {o.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={handleSearchMovements}
                                                disabled={searching}
                                                className="admin-action-btn"
                                                style={{ padding: '0.5rem 0.75rem', fontSize: '10px', height: 'auto' }}
                                            >
                                                {searching ? (
                                                    <span className="animate-spin material-symbols-outlined text-[14px]">progress_activity</span>
                                                ) : '검색'}
                                            </button>
                                        </div>

                                        {movementResults.length > 0 && (
                                            <div
                                                className="flex flex-col gap-1 max-h-44 overflow-y-auto rounded-xl p-1.5"
                                                style={{
                                                    scrollbarWidth: 'thin',
                                                    background: 'rgba(0,0,0,0.35)',
                                                    border: '1px solid rgba(255,255,255,0.05)',
                                                }}
                                            >
                                                {movementResults.map(m => {
                                                    const mStyle = getCategoryStyle(m.category);
                                                    const isAdded = form.movements.some(ml => ml.movement_id === m.id);

                                                    return (
                                                        <button
                                                            key={m.id}
                                                            type="button"
                                                            disabled={isAdded}
                                                            onClick={() => handleAddMovementLine(m)}
                                                            className="w-full flex items-center justify-between text-left px-3 py-2 rounded-lg text-xs font-bold transition-all"
                                                            style={{
                                                                opacity: isAdded ? 0.35 : 1,
                                                                cursor: isAdded ? 'default' : 'pointer',
                                                                background: 'rgba(255,255,255,0.01)',
                                                                border: '1px solid rgba(255,255,255,0.04)',
                                                                color: '#fff',
                                                            }}
                                                            onMouseEnter={e => {
                                                                if (!isAdded) (e.currentTarget.style.background = 'rgba(255,255,255,0.05)');
                                                            }}
                                                            onMouseLeave={e => {
                                                                (e.currentTarget.style.background = 'rgba(255,255,255,0.01)');
                                                            }}
                                                        >
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <span
                                                                    className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded tracking-widest flex-shrink-0"
                                                                    style={{ color: mStyle.textColor, background: mStyle.textBg }}
                                                                >
                                                                    {mStyle.label}
                                                                </span>
                                                                <span className="truncate">{m.name_ko}</span>
                                                                <span className="text-[9px] text-white/25 flex-shrink-0">{m.name_en}</span>
                                                            </div>
                                                            {isAdded ? (
                                                                <span className="text-[9px] flex-shrink-0 ml-2 font-black text-green-400">✓ 추가됨</span>
                                                            ) : (
                                                                <span className="material-symbols-outlined text-[14px] text-white/25 flex-shrink-0 ml-2">add</span>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {movementResults.length === 0 && movementSearch && !searching && (
                                            <p className="text-[10px] text-white/25 text-center py-2">검색 결과가 없습니다</p>
                                        )}
                                    </div>
                                </section>
                            </div>

                            {/* 패널 푸터 */}
                            <div
                                className="px-5 py-3.5 flex items-center justify-end gap-2 flex-shrink-0"
                                style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}
                            >
                                <button
                                    onClick={() => { setShowPanel(false); setDeleteConfirmId(null); }}
                                    className="px-4 py-2 rounded-xl text-xs font-bold transition-all text-white/50 hover:text-white/80"
                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                                >
                                    닫기
                                </button>
                                <button
                                    onClick={() => handleSave(false)}
                                    disabled={saving}
                                    className="px-4 py-2 rounded-xl text-xs font-bold transition-all text-white/70 hover:text-white"
                                    style={{
                                        background: 'rgba(255,255,255,0.07)',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                                >
                                    {saving ? '저장 중...' : '임시 저장'}
                                </button>
                                <button
                                    onClick={() => handleSave(true)}
                                    disabled={saving}
                                    className="admin-action-btn"
                                    style={{ padding: '0.5rem 1.25rem', fontSize: '10px' }}
                                >
                                    {saving ? '게시 중...' : '🔴 WOD 게시'}
                                </button>
                            </div>
                        </>
                    ) : (
                        /* 편집 패널 비활성 Empty State */
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                            <div
                                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                            >
                                <span className="material-symbols-outlined text-3xl animate-pulse" style={{ color: 'var(--primary)' }}>
                                    fitness_center
                                </span>
                            </div>
                            <h4 className="text-sm font-black text-white/70 tracking-wide uppercase">WOD TEMPLATE PANEL</h4>
                            <p className="text-xs text-white/30 mt-2 max-w-[260px] leading-relaxed">
                                왼쪽 WOD 템플릿 카드를 클릭해 편집하거나, 새 템플릿을 작성하세요.
                            </p>
                            <button
                                onClick={openCreate}
                                className="admin-action-btn mt-5"
                                style={{ padding: '0.5rem 1.25rem', fontSize: '10px' }}
                            >
                                + 새 WOD 템플릿 작성
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
