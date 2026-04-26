'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { rpc } from '@/lib/supabase/query';
import type {
    ClassDisplayWod,
    MovementCategory,
    MovementLibraryRow,
    SessionWodDetail,
    SessionWodPublishState,
    UpsertSessionWodPayload,
    UpsertWodTemplateMovementPayload,
    WodFormatType,
    WodTemplateWithMovements,
} from '@/types/p1a';

interface SessionWodPanelProps {
    sessionId: string;
    facilityId: string | null;
    sessionDate: string;
    fallbackDescription: string | null;
}

const FORMAT_OPTIONS: Array<{ value: WodFormatType; label: string }> = [
    { value: 'for_time', label: 'For Time' },
    { value: 'amrap', label: 'AMRAP' },
    { value: 'emom', label: 'EMOM' },
    { value: 'tabata', label: 'Tabata' },
    { value: 'chipper', label: 'Chipper' },
    { value: 'strength', label: 'Strength' },
    { value: 'custom', label: 'Custom' },
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

interface MovementLine extends UpsertWodTemplateMovementPayload {
    _key: string;
    _name?: string;
}

function emptyLine(sortOrder: number): MovementLine {
    return {
        _key: `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        sort_order: sortOrder,
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
    };
}

function snapshotToLines(snapshot: SessionWodDetail['movements_snapshot']): MovementLine[] {
    if (!Array.isArray(snapshot)) return [];
    return snapshot.map((m, idx) => ({
        _key: `s-${idx}-${m.movement_id ?? 'custom'}`,
        _name: m.name,
        sort_order: m.sort_order ?? idx,
        movement_id: m.movement_id ?? null,
        custom_label: m.custom_label ?? null,
        target_value: m.target_value,
        target_unit: m.target_unit,
        distance_meters: m.distance_meters,
        duration_seconds: m.duration_seconds,
        load_male_rx: m.load_male_rx,
        load_female_rx: m.load_female_rx,
        rx_notes: m.rx_notes,
        scaling_notes: m.scaling_notes,
    }));
}

function templateToLines(template: WodTemplateWithMovements): MovementLine[] {
    return (template.movements || []).map((m, idx) => ({
        _key: `t-${m.id}-${idx}`,
        _name: undefined,
        sort_order: m.sort_order ?? idx,
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
    }));
}

export default function SessionWodPanel({ sessionId, facilityId, sessionDate, fallbackDescription }: SessionWodPanelProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [editing, setEditing] = useState(false);
    const [publishState, setPublishState] = useState<SessionWodPublishState>('draft');
    const [sourceVersion, setSourceVersion] = useState(1);
    const [publishedAt, setPublishedAt] = useState<string | null>(null);

    const [titleOverride, setTitleOverride] = useState('');
    const [formatOverride, setFormatOverride] = useState<WodFormatType | ''>('');
    const [timeCapOverride, setTimeCapOverride] = useState<string>('');
    const [descriptionOverride, setDescriptionOverride] = useState('');
    const [coachNotes, setCoachNotes] = useState('');
    const [classDisplayNotes, setClassDisplayNotes] = useState('');
    const [templateId, setTemplateId] = useState<string | null>(null);
    const [lines, setLines] = useState<MovementLine[]>([]);

    const [templates, setTemplates] = useState<WodTemplateWithMovements[]>([]);
    const [templateScope, setTemplateScope] = useState<'benchmark' | 'facility' | 'shared'>('benchmark');

    const [movementSearch, setMovementSearch] = useState('');
    const [movementCategory, setMovementCategory] = useState<'' | MovementCategory>('');
    const [movementResults, setMovementResults] = useState<MovementLibraryRow[]>([]);
    const [searchingMovements, setSearchingMovements] = useState(false);

    const [classDisplay, setClassDisplay] = useState<ClassDisplayWod | null>(null);

    const loadSessionWod = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: rpcErr } = await rpc('fn_get_session_wod', { p_session_id: sessionId });
            if (rpcErr) throw new Error(rpcErr.message);
            if (data && data.success && data.data) {
                const wod = data.data as SessionWodDetail;
                setPublishState(wod.publish_state);
                setSourceVersion(wod.source_version);
                setPublishedAt(wod.published_at);
                setTitleOverride(wod.title_override ?? '');
                setFormatOverride((wod.format_override ?? '') as WodFormatType | '');
                setTimeCapOverride(wod.time_cap_override?.toString() ?? '');
                setDescriptionOverride(wod.description_override ?? '');
                setCoachNotes(wod.coach_notes ?? '');
                setClassDisplayNotes(wod.class_display_notes ?? '');
                setTemplateId(wod.template_id);
                setLines(snapshotToLines(wod.movements_snapshot));
            } else {
                // No session_wod yet — start from blank or fallback
                setPublishState('draft');
                setSourceVersion(1);
                setPublishedAt(null);
                setTitleOverride('');
                setFormatOverride('');
                setTimeCapOverride('');
                setDescriptionOverride(fallbackDescription ?? '');
                setCoachNotes('');
                setClassDisplayNotes('');
                setTemplateId(null);
                setLines([]);
            }

            // Also load class display preview (only fills when published)
            const displayRes = await rpc('fn_get_class_display_wod', {
                p_session_id: sessionId,
                p_session_date: sessionDate,
                p_facility_id: facilityId,
            });
            if (displayRes.data?.success) setClassDisplay(displayRes.data.data as ClassDisplayWod | null);
        } catch (e) {
            if (process.env.NODE_ENV === 'development') console.error(e);
            setError('WOD 데이터를 불러오지 못했습니다.');
        }
        setLoading(false);
    }, [sessionId, facilityId, sessionDate, fallbackDescription]);

    useEffect(() => { void loadSessionWod(); }, [loadSessionWod]);

    const loadTemplates = useCallback(async (scope: 'benchmark' | 'facility' | 'shared') => {
        try {
            const { data } = await rpc('fn_list_wod_templates', {
                p_scope: scope,
                p_facility_id: scope === 'facility' ? facilityId : null,
                p_template_kind: null,
            });
            if (data?.success) setTemplates(data.data as WodTemplateWithMovements[]);
            else setTemplates([]);
        } catch {
            setTemplates([]);
        }
    }, [facilityId]);

    useEffect(() => {
        if (editing) void loadTemplates(templateScope);
    }, [editing, templateScope, loadTemplates]);

    const searchMovements = useCallback(async () => {
        setSearchingMovements(true);
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
        setSearchingMovements(false);
    }, [movementSearch, movementCategory]);

    const handleApplyTemplate = (template: WodTemplateWithMovements) => {
        setTemplateId(template.id);
        setTitleOverride(template.title);
        setFormatOverride((template.format_type ?? '') as WodFormatType | '');
        setTimeCapOverride(template.time_cap_minutes?.toString() ?? '');
        setDescriptionOverride(template.description ?? '');
        setLines(templateToLines(template));
    };

    const handleAddCustomLine = () => {
        setLines(prev => [...prev, emptyLine(prev.length)]);
    };

    const handleAddMovementLine = (m: MovementLibraryRow) => {
        setLines(prev => [...prev, {
            ...emptyLine(prev.length),
            movement_id: m.id,
            custom_label: null,
            _name: m.name_ko,
        }]);
    };

    const handleRemoveLine = (key: string) => {
        setLines(prev => prev.filter(l => l._key !== key).map((l, idx) => ({ ...l, sort_order: idx })));
    };

    const handleMoveLine = (key: string, dir: -1 | 1) => {
        setLines(prev => {
            const idx = prev.findIndex(l => l._key === key);
            if (idx < 0) return prev;
            const next = [...prev];
            const swap = idx + dir;
            if (swap < 0 || swap >= next.length) return prev;
            [next[idx], next[swap]] = [next[swap], next[idx]];
            return next.map((l, i) => ({ ...l, sort_order: i }));
        });
    };

    const handleUpdateLine = (key: string, patch: Partial<MovementLine>) => {
        setLines(prev => prev.map(l => l._key === key ? { ...l, ...patch } : l));
    };

    const buildPayload = (): UpsertSessionWodPayload => ({
        template_id: templateId,
        title_override: titleOverride.trim() || null,
        format_override: (formatOverride || null) as WodFormatType | null,
        time_cap_override: timeCapOverride ? Number.parseInt(timeCapOverride, 10) : null,
        description_override: descriptionOverride.trim() || null,
        coach_notes: coachNotes.trim() || null,
        class_display_notes: classDisplayNotes.trim() || null,
        movements: lines.map((l, i) => ({
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
    });

    const handleSaveDraft = async () => {
        setSaving(true);
        setError(null);
        try {
            const { data, error: rpcErr } = await rpc('fn_upsert_session_wod', {
                p_session_id: sessionId,
                p_payload: buildPayload(),
            });
            if (rpcErr || !data?.success) {
                setError(data?.error || rpcErr?.message || 'WOD 저장에 실패했습니다.');
            } else {
                setEditing(false);
                await loadSessionWod();
            }
        } catch (e) {
            if (process.env.NODE_ENV === 'development') console.error(e);
            setError('WOD 저장 중 오류가 발생했습니다.');
        }
        setSaving(false);
    };

    const handlePublish = async () => {
        if (!confirm('현재 WOD를 클래스 화면에 게시합니다. 계속할까요?')) return;
        setPublishing(true);
        setError(null);
        try {
            // Save first to ensure latest edits are persisted
            const { data: saveData, error: saveErr } = await rpc('fn_upsert_session_wod', {
                p_session_id: sessionId,
                p_payload: buildPayload(),
            });
            if (saveErr || !saveData?.success) {
                throw new Error(saveData?.error || saveErr?.message || '저장 실패');
            }

            const { data: pubData, error: pubErr } = await rpc('fn_publish_session_wod', { p_session_id: sessionId });
            if (pubErr || !pubData?.success) {
                throw new Error(pubData?.error || pubErr?.message || '게시 실패');
            }
            setEditing(false);
            await loadSessionWod();
        } catch (e: any) {
            setError(e?.message || '게시 처리 중 오류가 발생했습니다.');
        }
        setPublishing(false);
    };

    const stateBadge = useMemo(() => {
        switch (publishState) {
            case 'published':
                return { label: '게시됨', color: '#22C55E', bg: 'rgba(34,197,94,0.12)' };
            case 'archived':
                return { label: '보관됨', color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' };
            case 'draft':
            default:
                return { label: '초안', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' };
        }
    }, [publishState]);

    if (loading) {
        return (
            <section style={{ marginBottom: '1.25rem' }}>
                <div style={{ padding: '1rem', background: 'var(--app-surface)', borderRadius: 12, color: 'var(--app-text-muted)', fontSize: '0.8125rem' }}>
                    WOD 정보를 불러오는 중...
                </div>
            </section>
        );
    }

    return (
        <section style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--app-text-primary)' }}>WOD</h4>
                    <span style={{ padding: '0.125rem 0.5rem', borderRadius: 999, background: stateBadge.bg, color: stateBadge.color, fontSize: '0.6875rem', fontWeight: 700 }}>
                        {stateBadge.label} · v{sourceVersion}
                    </span>
                    {publishedAt && publishState === 'published' && (
                        <span style={{ fontSize: '0.6875rem', color: 'var(--app-text-muted)' }}>
                            {new Date(publishedAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} 게시
                        </span>
                    )}
                </div>
                {!editing && (
                    <button onClick={() => setEditing(true)} style={{
                        background: 'none', border: 'none', color: 'var(--app-accent)',
                        fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
                    }}>
                        편집
                    </button>
                )}
            </div>

            {error && (
                <div style={{ padding: '0.5rem 0.625rem', borderRadius: 8, marginBottom: '0.625rem', background: 'rgba(239,68,68,0.1)', color: '#EF4444', fontSize: '0.75rem' }}>
                    {error}
                </div>
            )}

            {!editing ? (
                <div style={{ background: 'var(--app-surface)', padding: '0.875rem', borderRadius: 12, border: '1px solid var(--app-border)' }}>
                    {(titleOverride || lines.length > 0 || descriptionOverride) ? (
                        <>
                            {titleOverride && (
                                <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--app-text-primary)', marginBottom: 4 }}>
                                    {titleOverride}
                                </div>
                            )}
                            {(formatOverride || timeCapOverride) && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--app-text-muted)', marginBottom: 8, display: 'flex', gap: 8 }}>
                                    {formatOverride && <span>{FORMAT_OPTIONS.find(f => f.value === formatOverride)?.label}</span>}
                                    {timeCapOverride && <span>· Time Cap {timeCapOverride}분</span>}
                                </div>
                            )}
                            {descriptionOverride && (
                                <p style={{ whiteSpace: 'pre-wrap', color: 'var(--app-text-secondary)', fontSize: '0.8125rem', margin: '0 0 0.625rem', lineHeight: 1.5 }}>
                                    {descriptionOverride}
                                </p>
                            )}
                            {lines.length > 0 && (
                                <ol style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--app-text-secondary)', fontSize: '0.8125rem', lineHeight: 1.7 }}>
                                    {lines.map((l) => (
                                        <li key={l._key}>
                                            <strong>{l._name || l.custom_label || '(이름 미정)'}</strong>
                                            {l.target_value !== null && l.target_value !== undefined && ` — ${l.target_value} ${l.target_unit ?? ''}`}
                                            {l.distance_meters ? ` · ${l.distance_meters}m` : ''}
                                            {l.load_male_rx ? ` · ♂ ${l.load_male_rx}` : ''}
                                            {l.load_female_rx ? ` · ♀ ${l.load_female_rx}` : ''}
                                        </li>
                                    ))}
                                </ol>
                            )}
                            {coachNotes && (
                                <div style={{ marginTop: 8, padding: '0.5rem 0.625rem', borderRadius: 8, background: 'rgba(255,255,255,0.04)', fontSize: '0.75rem', color: 'var(--app-text-muted)' }}>
                                    🎯 {coachNotes}
                                </div>
                            )}
                            {classDisplayNotes && (
                                <div style={{ marginTop: 6, padding: '0.5rem 0.625rem', borderRadius: 8, background: 'rgba(34,197,94,0.06)', fontSize: '0.75rem', color: '#22C55E' }}>
                                    📺 {classDisplayNotes}
                                </div>
                            )}
                        </>
                    ) : (
                        <p style={{ color: 'var(--app-text-muted)', fontSize: '0.8125rem', margin: 0 }}>
                            등록된 WOD가 없습니다. 편집을 눌러 시작하세요.
                        </p>
                    )}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {/* Template picker */}
                    <div style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)', borderRadius: 12, padding: '0.625rem 0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--app-text-secondary)' }}>템플릿에서 시작</span>
                            <div style={{ display: 'flex', gap: 4 }}>
                                {(['benchmark', 'facility', 'shared'] as const).map(s => (
                                    <button key={s} onClick={() => setTemplateScope(s)} style={{
                                        padding: '0.125rem 0.5rem', borderRadius: 6,
                                        border: 'none', cursor: 'pointer', fontSize: '0.6875rem', fontWeight: 600,
                                        background: templateScope === s ? 'var(--app-accent)' : 'transparent',
                                        color: templateScope === s ? '#fff' : 'var(--app-text-muted)',
                                    }}>
                                        {s === 'benchmark' ? '벤치마크' : s === 'facility' ? '시설' : '공유'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {templates.length === 0 ? (
                            <p style={{ fontSize: '0.75rem', color: 'var(--app-text-muted)', margin: 0 }}>해당 범위의 템플릿이 없습니다.</p>
                        ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxHeight: 120, overflowY: 'auto' }}>
                                {templates.map(t => (
                                    <button key={t.id} onClick={() => handleApplyTemplate(t)} style={{
                                        padding: '0.25rem 0.5rem', borderRadius: 6,
                                        border: '1px solid var(--app-border)', background: 'transparent',
                                        color: 'var(--app-text-secondary)', fontSize: '0.6875rem', cursor: 'pointer',
                                    }}>
                                        {t.title}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Title / format / time cap */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8 }}>
                        <input value={titleOverride} onChange={e => setTitleOverride(e.target.value)} placeholder="WOD 이름" style={inputStyle} />
                        <select value={formatOverride} onChange={e => setFormatOverride(e.target.value as WodFormatType | '')} style={inputStyle}>
                            <option value="">포맷 선택</option>
                            {FORMAT_OPTIONS.map(f => (<option key={f.value} value={f.value}>{f.label}</option>))}
                        </select>
                        <input value={timeCapOverride} onChange={e => setTimeCapOverride(e.target.value.replace(/\D/g, ''))} placeholder="Time Cap (분)" style={inputStyle} />
                    </div>

                    <textarea value={descriptionOverride} onChange={e => setDescriptionOverride(e.target.value)} placeholder="WOD 설명 (자유 텍스트, 보조용)" rows={3} style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} />

                    {/* Movement lines */}
                    <div style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)', borderRadius: 12, padding: '0.625rem 0.75rem' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--app-text-secondary)', marginBottom: 6 }}>
                            Movement Lines ({lines.length})
                        </div>
                        {lines.length === 0 ? (
                            <p style={{ fontSize: '0.75rem', color: 'var(--app-text-muted)', margin: 0 }}>아래 검색 또는 직접 추가로 시작하세요.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {lines.map((l, idx) => (
                                    <div key={l._key} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 8, display: 'grid', gridTemplateColumns: '24px 1fr auto', gap: 6, alignItems: 'center' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                            <button onClick={() => handleMoveLine(l._key, -1)} disabled={idx === 0} style={iconBtnStyle}>↑</button>
                                            <button onClick={() => handleMoveLine(l._key, 1)} disabled={idx === lines.length - 1} style={iconBtnStyle}>↓</button>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 4 }}>
                                            <input
                                                value={l._name || l.custom_label || ''}
                                                onChange={e => handleUpdateLine(l._key, l.movement_id ? { _name: e.target.value } : { custom_label: e.target.value })}
                                                placeholder={l.movement_id ? '운동' : '운동 이름'}
                                                disabled={!!l.movement_id}
                                                style={miniInput}
                                            />
                                            <input
                                                value={l.target_value ?? ''}
                                                onChange={e => handleUpdateLine(l._key, { target_value: e.target.value ? Number(e.target.value) : null })}
                                                placeholder="값"
                                                style={miniInput}
                                            />
                                            <select value={l.target_unit ?? 'reps'} onChange={e => handleUpdateLine(l._key, { target_unit: e.target.value })} style={miniInput}>
                                                <option value="reps">reps</option>
                                                <option value="meters">m</option>
                                                <option value="seconds">초</option>
                                                <option value="calories">cal</option>
                                            </select>
                                            <input value={l.load_male_rx ?? ''} onChange={e => handleUpdateLine(l._key, { load_male_rx: e.target.value || null })} placeholder="♂RX" style={miniInput} />
                                            <input value={l.load_female_rx ?? ''} onChange={e => handleUpdateLine(l._key, { load_female_rx: e.target.value || null })} placeholder="♀RX" style={miniInput} />
                                        </div>
                                        <button onClick={() => handleRemoveLine(l._key)} style={{ ...iconBtnStyle, color: '#EF4444' }}>×</button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button onClick={handleAddCustomLine} style={{ marginTop: 6, fontSize: '0.6875rem', color: 'var(--app-accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
                            + 직접 추가
                        </button>
                    </div>

                    {/* Movement search */}
                    <div style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)', borderRadius: 12, padding: '0.625rem 0.75rem' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--app-text-secondary)', marginBottom: 6 }}>운동 검색</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 6, marginBottom: 6 }}>
                            <input value={movementSearch} onChange={e => setMovementSearch(e.target.value)} placeholder="이름/슬러그 검색" style={inputStyle} />
                            <select value={movementCategory} onChange={e => setMovementCategory(e.target.value as MovementCategory | '')} style={inputStyle}>
                                {CATEGORY_OPTIONS.map(o => (<option key={o.value || 'all'} value={o.value}>{o.label}</option>))}
                            </select>
                            <button onClick={searchMovements} disabled={searchingMovements} style={{
                                padding: '0 0.75rem', borderRadius: 8, border: 'none',
                                background: 'var(--app-accent)', color: '#fff', fontWeight: 600,
                                fontSize: '0.75rem', cursor: searchingMovements ? 'default' : 'pointer',
                            }}>
                                {searchingMovements ? '검색 중' : '검색'}
                            </button>
                        </div>
                        {movementResults.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxHeight: 130, overflowY: 'auto' }}>
                                {movementResults.map(m => (
                                    <button key={m.id} onClick={() => handleAddMovementLine(m)} style={{
                                        padding: '0.25rem 0.5rem', borderRadius: 6,
                                        border: '1px solid var(--app-border)', background: 'transparent',
                                        color: 'var(--app-text-secondary)', fontSize: '0.6875rem', cursor: 'pointer',
                                    }}>
                                        + {m.name_ko}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Notes */}
                    <textarea value={coachNotes} onChange={e => setCoachNotes(e.target.value)} placeholder="🎯 Coach Note (코치 전용 메모)" rows={2} style={{ ...inputStyle, minHeight: 56, resize: 'vertical' }} />
                    <textarea value={classDisplayNotes} onChange={e => setClassDisplayNotes(e.target.value)} placeholder="📺 Class Display Note (클래스 화면용)" rows={2} style={{ ...inputStyle, minHeight: 56, resize: 'vertical' }} />

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                        <button onClick={() => { setEditing(false); void loadSessionWod(); }} style={{
                            padding: '0.5rem 0.875rem', borderRadius: 8, border: 'none',
                            background: 'var(--app-surface)', color: 'var(--app-text-primary)', cursor: 'pointer',
                        }}>
                            취소
                        </button>
                        <button onClick={handleSaveDraft} disabled={saving || publishing} style={{
                            padding: '0.5rem 0.875rem', borderRadius: 8, border: '1px solid var(--app-border)',
                            background: 'transparent', color: 'var(--app-text-primary)', fontWeight: 600,
                            cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1,
                        }}>
                            {saving ? '저장 중...' : '초안 저장'}
                        </button>
                        <button onClick={handlePublish} disabled={saving || publishing} style={{
                            padding: '0.5rem 0.875rem', borderRadius: 8, border: 'none',
                            background: '#22C55E', color: '#fff', fontWeight: 600,
                            cursor: publishing ? 'default' : 'pointer', opacity: publishing ? 0.7 : 1,
                        }}>
                            {publishing ? '게시 중...' : '게시'}
                        </button>
                    </div>
                </div>
            )}

            {/* Class display preview when published */}
            {classDisplay && publishState === 'published' && !editing && (
                <div style={{ marginTop: 8, padding: '0.5rem 0.625rem', borderRadius: 8, background: 'rgba(34,197,94,0.06)', border: '1px dashed rgba(34,197,94,0.3)', fontSize: '0.6875rem', color: '#22C55E' }}>
                    📺 클래스 화면(/class/wod)에 위 내용이 표시됩니다.
                </div>
            )}
        </section>
    );
}

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.5rem 0.625rem', borderRadius: 8,
    background: 'var(--app-surface)', border: '1px solid var(--app-border)',
    color: 'var(--app-text-primary)', fontSize: '0.8125rem', outline: 'none',
};

const miniInput: React.CSSProperties = {
    padding: '0.25rem 0.375rem', borderRadius: 6,
    background: 'rgba(255,255,255,0.04)', border: '1px solid var(--app-border)',
    color: 'var(--app-text-primary)', fontSize: '0.6875rem', outline: 'none',
};

const iconBtnStyle: React.CSSProperties = {
    padding: 0, width: 20, height: 18, fontSize: '0.6875rem',
    background: 'transparent', border: '1px solid var(--app-border)',
    color: 'var(--app-text-secondary)', borderRadius: 4, cursor: 'pointer',
};
