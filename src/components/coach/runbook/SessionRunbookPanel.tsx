'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { rpc } from '@/lib/supabase/query';
import type {
    ClassRunbookTemplateRow,
    SessionRunbookRow,
    UpsertSessionRunbookPayload,
} from '@/types/p1a';

interface SessionRunbookPanelProps {
    sessionId: string;
    facilityId: string | null;
}

type RunbookFieldKey =
    | 'warmup'
    | 'movement_prep'
    | 'scaling'
    | 'cue'
    | 'safety'
    | 'finish_note';

const TABS: Array<{ key: RunbookFieldKey; label: string; emoji: string; templateField: keyof ClassRunbookTemplateRow }> = [
    { key: 'warmup', label: 'Warm-up', emoji: '🔥', templateField: 'warmup' },
    { key: 'movement_prep', label: 'Movement Prep', emoji: '🤸', templateField: 'movement_prep' },
    { key: 'scaling', label: 'Scaling', emoji: '📐', templateField: 'scaling_options' },
    { key: 'cue', label: 'Coach Cue', emoji: '🗣', templateField: 'coach_cues' },
    { key: 'safety', label: 'Safety', emoji: '🛡', templateField: 'safety_notes' },
    { key: 'finish_note', label: 'Finish', emoji: '🏁', templateField: 'finish_notes' },
];

const overrideFieldMap: Record<RunbookFieldKey, keyof Pick<SessionRunbookRow,
    'warmup_override' | 'movement_prep_override' | 'scaling_override' | 'cue_override' | 'safety_override' | 'finish_note_override'>> = {
    warmup: 'warmup_override',
    movement_prep: 'movement_prep_override',
    scaling: 'scaling_override',
    cue: 'cue_override',
    safety: 'safety_override',
    finish_note: 'finish_note_override',
};

export default function SessionRunbookPanel({ sessionId, facilityId }: SessionRunbookPanelProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState<RunbookFieldKey>('warmup');
    const [runbookId, setRunbookId] = useState<string | null>(null);
    const [templateId, setTemplateId] = useState<string | null>(null);
    const [overrides, setOverrides] = useState<Record<RunbookFieldKey, string>>({
        warmup: '', movement_prep: '', scaling: '', cue: '', safety: '', finish_note: '',
    });
    const [templates, setTemplates] = useState<ClassRunbookTemplateRow[]>([]);
    const [dirty, setDirty] = useState(false);

    const activeTemplate = useMemo(() => templates.find(t => t.id === templateId) ?? null, [templates, templateId]);

    const loadAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [rbRes, tplRes] = await Promise.all([
                rpc('fn_get_session_runbook', { p_session_id: sessionId }),
                facilityId
                    ? rpc('fn_list_runbook_templates', { p_facility_id: facilityId, p_class_type: null })
                    : Promise.resolve({ data: { success: true, data: [] } } as any),
            ]);

            if (rbRes.data?.success && rbRes.data.data) {
                const rb = rbRes.data.data as SessionRunbookRow;
                setRunbookId(rb.id);
                setTemplateId(rb.template_id);
                setOverrides({
                    warmup: rb.warmup_override ?? '',
                    movement_prep: rb.movement_prep_override ?? '',
                    scaling: rb.scaling_override ?? '',
                    cue: rb.cue_override ?? '',
                    safety: rb.safety_override ?? '',
                    finish_note: rb.finish_note_override ?? '',
                });
            } else {
                setRunbookId(null);
                setTemplateId(null);
                setOverrides({ warmup: '', movement_prep: '', scaling: '', cue: '', safety: '', finish_note: '' });
            }

            if (tplRes.data?.success) {
                setTemplates(tplRes.data.data as ClassRunbookTemplateRow[]);
            } else {
                setTemplates([]);
            }
            setDirty(false);
        } catch (e) {
            if (process.env.NODE_ENV === 'development') console.error(e);
            setError('런북을 불러오지 못했습니다.');
        }
        setLoading(false);
    }, [sessionId, facilityId]);

    useEffect(() => { void loadAll(); }, [loadAll]);

    const handleSelectTemplate = (id: string | null) => {
        setTemplateId(id);
        setDirty(true);
    };

    const handleOverrideChange = (key: RunbookFieldKey, value: string) => {
        setOverrides(prev => ({ ...prev, [key]: value }));
        setDirty(true);
    };

    const handleCopyTemplateToOverride = (key: RunbookFieldKey) => {
        if (!activeTemplate) return;
        const tab = TABS.find(t => t.key === key);
        if (!tab) return;
        const tplValue = (activeTemplate[tab.templateField] as string | null) ?? '';
        if (!tplValue) return;
        handleOverrideChange(key, tplValue);
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            const payload: UpsertSessionRunbookPayload = {
                template_id: templateId,
                warmup_override: overrides.warmup.trim() || null,
                movement_prep_override: overrides.movement_prep.trim() || null,
                scaling_override: overrides.scaling.trim() || null,
                cue_override: overrides.cue.trim() || null,
                safety_override: overrides.safety.trim() || null,
                finish_note_override: overrides.finish_note.trim() || null,
            };
            const { data, error: rpcErr } = await rpc('fn_upsert_session_runbook', {
                p_session_id: sessionId,
                p_payload: payload,
            });
            if (rpcErr || !data?.success) {
                setError(data?.error || rpcErr?.message || '런북 저장에 실패했습니다.');
            } else {
                setDirty(false);
                await loadAll();
            }
        } catch (e) {
            if (process.env.NODE_ENV === 'development') console.error(e);
            setError('런북 저장 중 오류가 발생했습니다.');
        }
        setSaving(false);
    };

    if (loading) {
        return (
            <section style={{ marginBottom: '1.25rem' }}>
                <div style={{ padding: '1rem', background: 'var(--app-surface)', borderRadius: 12, color: 'var(--app-text-muted)', fontSize: '0.8125rem' }}>
                    런북 정보를 불러오는 중...
                </div>
            </section>
        );
    }

    const activeOverride = overrides[activeTab];
    const activeTplValue = activeTemplate ? ((activeTemplate[TABS.find(t => t.key === activeTab)!.templateField] as string | null) ?? '') : '';

    return (
        <section style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', gap: 8 }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--app-text-primary)' }}>
                    런시트 (Runbook)
                </h4>
                {dirty && (
                    <span style={{ fontSize: '0.6875rem', color: '#F59E0B' }}>저장되지 않음</span>
                )}
            </div>

            {error && (
                <div style={{ padding: '0.5rem 0.625rem', borderRadius: 8, marginBottom: '0.625rem', background: 'rgba(239,68,68,0.1)', color: '#EF4444', fontSize: '0.75rem' }}>
                    {error}
                </div>
            )}

            {/* Template picker */}
            {templates.length > 0 && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--app-text-muted)' }}>기본 템플릿:</span>
                    <select
                        value={templateId ?? ''}
                        onChange={e => handleSelectTemplate(e.target.value || null)}
                        style={{ padding: '0.25rem 0.5rem', borderRadius: 6, background: 'var(--app-surface)', border: '1px solid var(--app-border)', color: 'var(--app-text-primary)', fontSize: '0.75rem' }}
                    >
                        <option value="">선택 안 함</option>
                        {templates.map(t => (<option key={t.id} value={t.id}>{t.name}{t.is_default ? ' (기본)' : ''}</option>))}
                    </select>
                </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, overflowX: 'auto', marginBottom: 8, paddingBottom: 4 }}>
                {TABS.map(t => {
                    const filled = !!overrides[t.key].trim();
                    const isActive = activeTab === t.key;
                    return (
                        <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
                            padding: '0.375rem 0.625rem', borderRadius: 8, whiteSpace: 'nowrap',
                            border: '1px solid ' + (isActive ? 'var(--app-accent)' : 'var(--app-border)'),
                            background: isActive ? 'var(--app-accent-bg)' : 'transparent',
                            color: isActive ? 'var(--app-accent)' : 'var(--app-text-secondary)',
                            fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                        }}>
                            {t.emoji} {t.label}
                            {filled && <span style={{ marginLeft: 4, color: '#22C55E' }}>●</span>}
                        </button>
                    );
                })}
            </div>

            {/* Template default (read-only) */}
            {activeTemplate && activeTplValue && (
                <div style={{ marginBottom: 6, padding: '0.5rem 0.625rem', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px dashed var(--app-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--app-text-muted)' }}>템플릿 기본값</span>
                        <button onClick={() => handleCopyTemplateToOverride(activeTab)} style={{
                            background: 'none', border: 'none', color: 'var(--app-accent)', fontSize: '0.6875rem', cursor: 'pointer',
                        }}>↳ 오버라이드로 복사</button>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--app-text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                        {activeTplValue}
                    </div>
                </div>
            )}

            {/* Override editor */}
            <textarea
                value={activeOverride}
                onChange={e => handleOverrideChange(activeTab, e.target.value)}
                placeholder={`${TABS.find(t => t.key === activeTab)?.label} 세션 오버라이드 내용 (비우면 템플릿 기본값 사용)`}
                rows={5}
                style={{
                    width: '100%', minHeight: 110, padding: '0.625rem 0.75rem', borderRadius: 12,
                    background: 'var(--app-surface)', border: '1px solid var(--app-border)',
                    color: 'var(--app-text-primary)', fontSize: '0.8125rem', resize: 'vertical', outline: 'none',
                }}
            />

            {/* Save button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button onClick={handleSave} disabled={saving || !dirty} style={{
                    padding: '0.5rem 0.875rem', borderRadius: 8, border: 'none',
                    background: 'var(--app-accent)', color: '#fff', fontWeight: 600,
                    fontSize: '0.8125rem', cursor: (saving || !dirty) ? 'default' : 'pointer',
                    opacity: (saving || !dirty) ? 0.6 : 1,
                }}>
                    {saving ? '저장 중...' : runbookId ? '런북 갱신' : '런북 저장'}
                </button>
            </div>
        </section>
    );
}
