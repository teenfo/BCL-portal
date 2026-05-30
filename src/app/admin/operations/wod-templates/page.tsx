'use client';

import { useCallback, useEffect, useState } from 'react';

import { query, rpc } from '@/lib/supabase/query';
import AdminPageHeader from '@/components/layout/AdminPageHeader';
import AdminModal from '@/components/layout/AdminModal';
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

const FORMAT_OPTIONS: Array<{ value: WodFormatType; label: string }> = [
    { value: 'for_time', label: 'For Time' },
    { value: 'amrap', label: 'AMRAP' },
    { value: 'emom', label: 'EMOM' },
    { value: 'tabata', label: 'Tabata' },
    { value: 'chipper', label: 'Chipper' },
    { value: 'strength', label: 'Strength' },
    { value: 'custom', label: 'Custom' },
];

const KIND_OPTIONS: Array<{ value: WodTemplateKind; label: string }> = [
    { value: 'daily', label: 'Daily' },
    { value: 'benchmark', label: 'Benchmark' },
    { value: 'skill', label: 'Skill' },
    { value: 'strength', label: 'Strength' },
    { value: 'conditioning', label: 'Conditioning' },
];

const CATEGORY_OPTIONS: Array<{ value: '' | MovementCategory; label: string }> = [
    { value: '', label: '전체' },
    { value: 'weightlifting', label: '바벨' },
    { value: 'gymnastics', label: '체조' },
    { value: 'monostructural', label: '카디오' },
    { value: 'dumbbell', label: '덤벨' },
    { value: 'kettlebell', label: '케틀벨' },
    { value: 'medball', label: '메드볼' },
    { value: 'other_equipment', label: '기타기구' },
    { value: 'accessory', label: '보조' },
];

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
}

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
});

const getCategoryStyle = (category: string) => {
    const config: Record<string, { border: string; bg: string; textBg: string; textColor: string; label: string }> = {
        weightlifting: {
            border: 'rgba(239, 68, 68, 0.25)',
            bg: 'rgba(239, 68, 68, 0.03)',
            textColor: '#f87171',
            textBg: 'rgba(239, 68, 68, 0.12)',
            label: '바벨',
        },
        gymnastics: {
            border: 'rgba(34, 197, 94, 0.25)',
            bg: 'rgba(34, 197, 94, 0.03)',
            textColor: '#4ade80',
            textBg: 'rgba(34, 197, 94, 0.12)',
            label: '체조',
        },
        monostructural: {
            border: 'rgba(6, 182, 212, 0.25)',
            bg: 'rgba(6, 182, 212, 0.03)',
            textColor: '#22d3ee',
            textBg: 'rgba(6, 182, 212, 0.12)',
            label: '카디오',
        },
        dumbbell: {
            border: 'rgba(168, 85, 247, 0.25)',
            bg: 'rgba(168, 85, 247, 0.03)',
            textColor: '#c084fc',
            textBg: 'rgba(168, 85, 247, 0.12)',
            label: '덤벨',
        },
        kettlebell: {
            border: 'rgba(236, 72, 153, 0.25)',
            bg: 'rgba(236, 72, 153, 0.03)',
            textColor: '#f472b6',
            textBg: 'rgba(236, 72, 153, 0.12)',
            label: '케틀벨',
        },
        medball: {
            border: 'rgba(245, 158, 11, 0.25)',
            bg: 'rgba(245, 158, 11, 0.03)',
            textColor: '#fbbf24',
            textBg: 'rgba(245, 158, 11, 0.12)',
            label: '메드볼',
        },
        other_equipment: {
            border: 'rgba(20, 184, 166, 0.25)',
            bg: 'rgba(20, 184, 166, 0.03)',
            textColor: '#2dd4bf',
            textBg: 'rgba(20, 184, 166, 0.12)',
            label: '기타기구',
        },
        accessory: {
            border: 'rgba(99, 102, 241, 0.25)',
            bg: 'rgba(99, 102, 241, 0.03)',
            textColor: '#818cf8',
            textBg: 'rgba(99, 102, 241, 0.12)',
            label: '보조',
        },
    };
    return config[category] || {
        border: 'rgba(255, 255, 255, 0.1)',
        bg: 'rgba(255, 255, 255, 0.04)',
        textColor: 'rgba(255, 255, 255, 0.6)',
        textBg: 'rgba(255, 255, 255, 0.06)',
        label: '직접 입력',
    };
};

interface FacilityRow { id: string; name: string }

export default function AdminWodTemplatesPage() {
    const [scope, setScope] = useState<WodTemplateScope>('benchmark');
    const [facilityFilter, setFacilityFilter] = useState<string>('');
    const [facilities, setFacilities] = useState<FacilityRow[]>([]);
    const [templates, setTemplates] = useState<WodTemplateWithMovements[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState<FormState>(emptyForm());
    const [saving, setSaving] = useState(false);
    const [movementsLibrary, setMovementsLibrary] = useState<MovementLibraryRow[]>([]);

    const [movementSearch, setMovementSearch] = useState('');
    const [movementCategory, setMovementCategory] = useState<'' | MovementCategory>('');
    const [movementResults, setMovementResults] = useState<MovementLibraryRow[]>([]);
    const [searching, setSearching] = useState(false);

    const { success, error: toastError } = useToast();

    const loadFacilities = useCallback(async () => {
        const { data } = await query('facilities').select('id, name').order('name');
        if (data) setFacilities(data as FacilityRow[]);
    }, []);

    const loadMovementsLibrary = useCallback(async () => {
        const { data } = await query('movement_library').select('*');
        if (data) setMovementsLibrary(data as MovementLibraryRow[]);
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
    useEffect(() => { void loadMovementsLibrary(); }, [loadMovementsLibrary]);

    const openCreate = () => {
        setForm(emptyForm());
        setMovementResults([]);
        setMovementSearch('');
        setShowModal(true);
    };

    const openEdit = (t: WodTemplateWithMovements) => {
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
            movements: (t.movements || []).map((m, idx) => ({
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
            })),
        });
        setMovementResults([]);
        setShowModal(true);
    };

    const updateForm = (patch: Partial<FormState>) => setForm(prev => ({ ...prev, ...patch }));

    const updateLine = (key: string, patch: Partial<MovementLine>) =>
        setForm(prev => ({ ...prev, movements: prev.movements.map(l => l._key === key ? { ...l, ...patch } : l) }));

    const removeLine = (key: string) =>
        setForm(prev => ({ ...prev, movements: prev.movements.filter(l => l._key !== key).map((l, i) => ({ ...l, sort_order: i })) }));

    const addCustomLine = () =>
        setForm(prev => ({ ...prev, movements: [...prev.movements, newLine(prev.movements.length)] }));

    const addMovementLine = (m: MovementLibraryRow) =>
        setForm(prev => ({
            ...prev,
            movements: [...prev.movements, {
                ...newLine(prev.movements.length),
                movement_id: m.id,
                _name: m.name_ko,
            }],
        }));

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
                setShowModal(false);
                await loadTemplates();
            }
        } catch (e: any) {
            toastError(e?.message || '저장 중 오류');
        }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('정말로 이 WOD 템플릿을 삭제하시겠습니까?')) return;
        try {
            const { error } = await query('wod_templates').delete().eq('id', id);
            if (error) {
                toastError('삭제 실패: ' + error.message);
            } else {
                success('WOD 템플릿을 삭제했습니다.');
                await loadTemplates();
            }
        } catch (e: any) {
            toastError(e?.message || '삭제 중 오류가 발생했습니다.');
        }
    };

    return (
        <div>
            <AdminPageHeader
                category="OPERATIONS"
                title="WOD Templates"
                subtitle="shared & benchmark"
                actions={
                    <button onClick={openCreate} className="px-4 py-2 rounded-lg font-bold text-sm" style={{ background: 'var(--primary)', color: '#000' }}>
                        + 새 템플릿
                    </button>
                }
            />

            <div className="p-6">
                {/* Scope filter */}
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                    {(['benchmark', 'facility', 'shared'] as const).map(s => (
                        <button key={s} onClick={() => setScope(s)} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{
                            background: scope === s ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                            color: scope === s ? '#000' : 'rgba(255,255,255,0.7)',
                            border: '1px solid ' + (scope === s ? 'transparent' : 'rgba(255,255,255,0.1)'),
                        }}>
                            {s === 'benchmark' ? 'Benchmark (글로벌)' : s === 'facility' ? 'Facility' : 'Shared'}
                        </button>
                    ))}
                    {scope === 'facility' && (
                        <select value={facilityFilter} onChange={e => setFacilityFilter(e.target.value)} className="px-3 py-1.5 rounded-lg text-xs" style={{
                            background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)',
                        }}>
                            <option value="">시설 선택</option>
                            {facilities.map(f => (<option key={f.id} value={f.id}>{f.name}</option>))}
                        </select>
                    )}
                </div>

                {/* Template list */}
                {loading ? (
                    <p className="text-white/50 text-sm">불러오는 중...</p>
                ) : templates.length === 0 ? (
                    <p className="text-white/50 text-sm">해당 범위의 템플릿이 없습니다.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {templates.map(t => (
                            <div key={t.id} className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex-1">
                                        <div className="text-base font-bold text-white">{t.title}</div>
                                        <div className="text-[10px] uppercase tracking-wider text-white/40 mt-0.5">
                                            {t.template_kind} {t.format_type ? `· ${t.format_type}` : ''}
                                            {t.time_cap_minutes ? ` · ${t.time_cap_minutes}min` : ''}
                                            {t.rounds ? ` · ${t.rounds}R` : ''}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1 items-end">
                                        {t.is_benchmark && (<span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: 'rgba(255,170,0,0.15)', color: '#FFAA00' }}>Benchmark</span>)}
                                        {t.is_shared && (<span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}>Shared</span>)}
                                    </div>
                                </div>
                                {t.description && (<p className="text-xs text-white/60 mb-2 line-clamp-2">{t.description}</p>)}
                                {t.movements && t.movements.length > 0 && (
                                    <div className="text-xs text-white/50">
                                        Movement {t.movements.length}개
                                    </div>
                                )}
                                <div className="flex gap-2 mt-3">
                                    <button onClick={() => openEdit(t)} className="text-xs font-bold px-3 py-1.5 rounded bg-white/[0.06] border border-white/5 text-white hover:border-white/20 transition-all">
                                        편집
                                    </button>
                                    <button onClick={() => handleDelete(t.id)} className="text-xs font-bold px-3 py-1.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all">
                                        삭제
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <AdminModal
                show={showModal}
                onClose={() => setShowModal(false)}
                title={form.id ? 'WOD 템플릿 편집' : '새 WOD 템플릿'}
                size="lg"
                footer={
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-sm" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}>
                            취소
                        </button>
                        <button onClick={() => handleSave(false)} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-bold" style={{ background: 'rgba(255,255,255,0.08)', color: '#fff' }}>
                            {saving ? '저장 중...' : '초안 저장'}
                        </button>
                        <button onClick={() => handleSave(true)} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-bold" style={{ background: 'var(--primary)', color: '#000' }}>
                            {saving ? '게시 중...' : '게시'}
                        </button>
                    </div>
                }
            >
                <div className="flex flex-col gap-3">
                    {/* Basic */}
                    <div className="grid grid-cols-2 gap-2">
                        <label className="text-[11px] text-white/60 col-span-2">
                            템플릿 이름
                            <input value={form.title} onChange={e => updateForm({ title: e.target.value })} className="w-full mt-1 px-2 py-1.5 rounded text-sm bg-white/5 border border-white/10 text-white" />
                        </label>
                        <label className="text-[11px] text-white/60">
                            종류
                            <select value={form.template_kind} onChange={e => updateForm({ template_kind: e.target.value as WodTemplateKind })} className="w-full mt-1 px-2 py-1.5 rounded text-sm bg-white/5 border border-white/10 text-white">
                                {KIND_OPTIONS.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
                            </select>
                        </label>
                        <label className="text-[11px] text-white/60">
                            포맷
                            <select value={form.format_type} onChange={e => updateForm({ format_type: e.target.value as WodFormatType | '' })} className="w-full mt-1 px-2 py-1.5 rounded text-sm bg-white/5 border border-white/10 text-white">
                                <option value="">선택</option>
                                {FORMAT_OPTIONS.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
                            </select>
                        </label>
                        <label className="text-[11px] text-white/60">
                            Time Cap (분)
                            <input value={form.time_cap_minutes} onChange={e => updateForm({ time_cap_minutes: e.target.value.replace(/\D/g, '') })} className="w-full mt-1 px-2 py-1.5 rounded text-sm bg-white/5 border border-white/10 text-white" />
                        </label>
                        <label className="text-[11px] text-white/60">
                            Rounds
                            <input value={form.rounds} onChange={e => updateForm({ rounds: e.target.value.replace(/\D/g, '') })} className="w-full mt-1 px-2 py-1.5 rounded text-sm bg-white/5 border border-white/10 text-white" />
                        </label>
                        <label className="text-[11px] text-white/60">
                            시설 (없으면 글로벌)
                            <select value={form.facility_id ?? ''} onChange={e => updateForm({ facility_id: e.target.value || null })} className="w-full mt-1 px-2 py-1.5 rounded text-sm bg-white/5 border border-white/10 text-white">
                                <option value="">글로벌</option>
                                {facilities.map(f => (<option key={f.id} value={f.id}>{f.name}</option>))}
                            </select>
                        </label>
                        <div className="flex items-center gap-3 col-span-2">
                            <label className="flex items-center gap-2 text-xs text-white/70">
                                <input type="checkbox" checked={form.is_shared} onChange={e => updateForm({ is_shared: e.target.checked })} /> 공유
                            </label>
                            <label className="flex items-center gap-2 text-xs text-white/70">
                                <input type="checkbox" checked={form.is_benchmark} onChange={e => updateForm({ is_benchmark: e.target.checked })} /> 벤치마크
                            </label>
                        </div>
                        <label className="text-[11px] text-white/60 col-span-2">
                            설명
                            <textarea value={form.description} onChange={e => updateForm({ description: e.target.value })} rows={2} className="w-full mt-1 px-2 py-1.5 rounded text-sm bg-white/5 border border-white/10 text-white resize-y" />
                        </label>
                    </div>

                    {/* Movement lines */}
                    <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div className="text-[11px] text-white/60 mb-2 font-bold">Movement Lines ({form.movements.length})</div>
                        {form.movements.length === 0 ? (
                            <p className="text-xs text-white/40">아래 검색 또는 직접 추가로 시작하세요.</p>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {form.movements.map((l, idx) => {
                                    const movement = movementsLibrary.find(mov => mov.id === l.movement_id);
                                    const category = movement ? movement.category : 'custom';
                                    const style = getCategoryStyle(category);
                                    return (
                                        <div
                                            key={l._key}
                                            className="grid grid-cols-[24px_1fr_auto] gap-3 items-center rounded-xl p-3 border transition-all"
                                            style={{
                                                borderColor: style.border,
                                                backgroundColor: style.bg
                                            }}
                                        >
                                            <div className="flex flex-col gap-0.5">
                                                <button onClick={() => moveLine(l._key, -1)} disabled={idx === 0} className="text-[10px] w-5 h-4 rounded bg-white/10 disabled:opacity-30 flex items-center justify-center font-bold">↑</button>
                                                <button onClick={() => moveLine(l._key, 1)} disabled={idx === form.movements.length - 1} className="text-[10px] w-5 h-4 rounded bg-white/10 disabled:opacity-30 flex items-center justify-center font-bold">↓</button>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-widest"
                                                        style={{
                                                            color: style.textColor,
                                                            backgroundColor: style.textBg
                                                        }}
                                                    >
                                                        {style.label}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-white/35">#{idx + 1}</span>
                                                </div>
                                                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-1">
                                                    <input
                                                        value={movement ? movement.name_ko : (l.custom_label || '')}
                                                        disabled={!!l.movement_id}
                                                        onChange={e => updateLine(l._key, l.movement_id ? { _name: e.target.value } : { custom_label: e.target.value })}
                                                        placeholder="이름"
                                                        className="px-1.5 py-1 rounded text-[11px] bg-white/5 border border-white/10 text-white disabled:opacity-70 font-bold"
                                                    />
                                                    <input value={l.target_value ?? ''} onChange={e => updateLine(l._key, { target_value: e.target.value ? Number(e.target.value) : null })} placeholder="값" className="px-1.5 py-1 rounded text-[11px] bg-white/5 border border-white/10 text-white text-center" />
                                                    <select value={l.target_unit ?? 'reps'} onChange={e => updateLine(l._key, { target_unit: e.target.value })} className="px-1.5 py-1 rounded text-[11px] bg-white/5 border border-white/10 text-white text-center">
                                                        <option value="reps">reps</option>
                                                        <option value="meters">m</option>
                                                        <option value="seconds">초</option>
                                                        <option value="calories">cal</option>
                                                    </select>
                                                    <input value={l.load_male_rx ?? ''} onChange={e => updateLine(l._key, { load_male_rx: e.target.value || null })} placeholder="♂RX" className="px-1.5 py-1 rounded text-[11px] bg-white/5 border border-white/10 text-white text-center" />
                                                    <input value={l.load_female_rx ?? ''} onChange={e => updateLine(l._key, { load_female_rx: e.target.value || null })} placeholder="♀RX" className="px-1.5 py-1 rounded text-[11px] bg-white/5 border border-white/10 text-white text-center" />
                                                </div>
                                            </div>
                                            <button onClick={() => removeLine(l._key)} className="text-red-400 text-sm w-6 h-6 rounded bg-white/5 hover:bg-red-500/20 flex items-center justify-center">×</button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        <button onClick={addCustomLine} className="mt-2 text-[11px] font-bold text-[var(--primary)]">+ 직접 추가</button>
                    </div>

                    {/* Movement search */}
                    <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div className="text-[11px] text-white/60 mb-2 font-bold">운동 검색</div>
                        <div className="grid grid-cols-[2fr_1fr_auto] gap-2 mb-2">
                            <input value={movementSearch} onChange={e => setMovementSearch(e.target.value)} placeholder="이름/슬러그" className="px-2 py-1 rounded text-xs bg-white/5 border border-white/10 text-white" />
                            <select
                                value={movementCategory}
                                onChange={e => setMovementCategory(e.target.value as MovementCategory | '')}
                                className="px-2 py-1 rounded text-xs border"
                                style={{
                                    colorScheme: 'dark',
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    borderColor: 'rgba(255, 255, 255, 0.1)',
                                    color: '#ffffff'
                                }}
                            >
                                {CATEGORY_OPTIONS.map(o => (
                                    <option
                                        key={o.value || 'all'}
                                        value={o.value}
                                        style={{ backgroundColor: '#161619', color: '#ffffff' }}
                                    >
                                        {o.label}
                                    </option>
                                ))}
                            </select>
                            <button onClick={handleSearchMovements} disabled={searching} className="px-3 py-1 rounded text-xs font-bold" style={{ background: 'var(--primary)', color: '#000' }}>
                                {searching ? '...' : '검색'}
                            </button>
                        </div>
                        {movementResults.length > 0 && (
                            <div
                                className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 rounded-xl border"
                                style={{
                                    scrollbarWidth: 'thin',
                                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                    borderColor: 'rgba(255, 255, 255, 0.05)'
                                }}
                            >
                                {movementResults.map(m => (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => addMovementLine(m)}
                                        className="text-[10px] font-bold px-2.5 py-1 rounded-lg wod-search-result-chip"
                                    >
                                        + {m.name_ko}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Notes */}
                    <label className="text-[11px] text-white/60">
                        Public Notes (회원 공개)
                        <textarea value={form.public_notes} onChange={e => updateForm({ public_notes: e.target.value })} rows={2} className="w-full mt-1 px-2 py-1.5 rounded text-sm bg-white/5 border border-white/10 text-white resize-y" />
                    </label>
                    <label className="text-[11px] text-white/60">
                        Coach Notes (코치 전용)
                        <textarea value={form.coach_notes} onChange={e => updateForm({ coach_notes: e.target.value })} rows={2} className="w-full mt-1 px-2 py-1.5 rounded text-sm bg-white/5 border border-white/10 text-white resize-y" />
                    </label>
                </div>
            </AdminModal>
        </div>
    );
}
