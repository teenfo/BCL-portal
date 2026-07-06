'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { rpc } from '@/lib/supabase/query';
import type {
    MemberAlertFlagRow,
    MemberAlertFlagType,
    MemberAlertSeverity,
    MemberContextPanel as MemberContextData,
    UpsertMemberAlertFlagPayload,
} from '@/types/p1a';

interface MemberAlertFlagsPanelProps {
    memberId: string;
}

const FLAG_TYPE_LABEL: Record<MemberAlertFlagType, { label: string; emoji: string }> = {
    trial: { label: '체험', emoji: '🎟' },
    injury: { label: '부상', emoji: '🩹' },
    renewal_due: { label: '만기 예정', emoji: '⏳' },
    returning_after_absence: { label: '복귀', emoji: '🔄' },
    vip_attention: { label: 'VIP 주의', emoji: '⭐' },
};

const SEVERITY_STYLE: Record<MemberAlertSeverity, { color: string; bg: string; border: string }> = {
    info: { color: '#60A5FA', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.3)' },
    warning: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
    critical: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' },
};

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.5rem', borderRadius: 8,
    background: 'var(--app-surface)', border: '1px solid var(--app-border)',
    color: 'var(--app-text-primary)', fontSize: '0.8125rem', outline: 'none',
};

/**
 * 코치 Members 상세 — 회원 컨텍스트 플래그 패널 (P1-A 후속 통합)
 * MemberContextPanel(admin 다크 테마 전용)과 동일한 RPC 계약을 사용하되
 * 코치 앱(.app-page 라이트 테마) 토큰으로 스타일링한 변형.
 */
export default function MemberAlertFlagsPanel({ memberId }: MemberAlertFlagsPanelProps) {
    const [data, setData] = useState<MemberContextData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<{
        flag_type: MemberAlertFlagType;
        severity: MemberAlertSeverity;
        ends_at: string;
        note: string;
    }>({ flag_type: 'trial', severity: 'info', ends_at: '', note: '' });

    const load = useCallback(async () => {
        try {
            const { data: rsp } = await rpc('fn_get_member_context_panel', { p_member_id: memberId });
            setData(rsp?.success && rsp.data ? (rsp.data as MemberContextData) : null);
        } catch (e) {
            if (process.env.NODE_ENV === 'development') console.error(e);
            setData(null);
        }
        setLoading(false);
    }, [memberId]);

    useEffect(() => {
        setLoading(true);
        void load();
    }, [load]);

    const handleAddFlag = async () => {
        setSaving(true);
        setError(null);
        try {
            const payload: UpsertMemberAlertFlagPayload = {
                flag_type: form.flag_type,
                severity: form.severity,
                note: form.note.trim() || null,
                ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
            };
            const { data: rsp, error: rpcErr } = await rpc('fn_upsert_member_alert_flag', {
                p_member_id: memberId,
                p_payload: payload,
            });
            if (rpcErr || !rsp?.success) {
                setError(rsp?.error || rpcErr?.message || '플래그 저장에 실패했습니다.');
            } else {
                setShowForm(false);
                setForm({ flag_type: 'trial', severity: 'info', ends_at: '', note: '' });
                await load();
            }
        } catch (e) {
            if (process.env.NODE_ENV === 'development') console.error(e);
            setError('플래그 저장 중 오류가 발생했습니다.');
        }
        setSaving(false);
    };

    const handleResolveFlag = async (flag: MemberAlertFlagRow) => {
        if (!confirm(`'${FLAG_TYPE_LABEL[flag.flag_type].label}' 플래그를 해소합니다. 계속할까요?`)) return;
        try {
            const { data: rsp, error: rpcErr } = await rpc('fn_upsert_member_alert_flag', {
                p_member_id: memberId,
                p_payload: { id: flag.id, resolved: true },
            });
            if (rpcErr || !rsp?.success) {
                setError(rsp?.error || rpcErr?.message || '플래그 해소에 실패했습니다.');
            } else {
                await load();
            }
        } catch (e) {
            if (process.env.NODE_ENV === 'development') console.error(e);
            setError('플래그 해소 중 오류가 발생했습니다.');
        }
    };

    const membershipBadge = useMemo(() => {
        if (!data?.active_membership) return null;
        const days = data.active_membership.days_until_expiry;
        if (days <= 7) return { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', label: `만기 ${days}일 전` };
        if (days <= 30) return { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', label: `만기 ${days}일 전` };
        return { color: '#22C55E', bg: 'rgba(34,197,94,0.1)', label: `${days}일 남음` };
    }, [data]);

    if (loading) {
        return <div className="app-skeleton" style={{ height: 56, borderRadius: 'var(--app-radius-md)', marginTop: '1rem' }} />;
    }

    if (!data) return null;

    const flags = data.active_flags || [];

    return (
        <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--app-text-primary)' }}>
                        컨텍스트 플래그 ({flags.length})
                    </div>
                    {membershipBadge && (
                        <span style={{
                            padding: '0.125rem 0.5rem', borderRadius: 999,
                            background: membershipBadge.bg, color: membershipBadge.color,
                            fontSize: '0.625rem', fontWeight: 700,
                        }}>
                            {membershipBadge.label}
                        </span>
                    )}
                </div>
                <button onClick={() => setShowForm(v => !v)} style={{
                    padding: '0.25rem 0.625rem', borderRadius: 6, border: 'none', cursor: 'pointer',
                    fontSize: '0.6875rem', fontWeight: 700,
                    background: showForm ? 'var(--app-surface)' : 'var(--app-accent)',
                    color: showForm ? 'var(--app-text-secondary)' : '#fff',
                }}>
                    {showForm ? '닫기' : '+ 플래그'}
                </button>
            </div>

            {error && (
                <div style={{
                    padding: '0.5rem 0.75rem', borderRadius: 8, marginBottom: 8,
                    background: 'rgba(239,68,68,0.1)', color: '#EF4444', fontSize: '0.75rem',
                }}>
                    {error}
                </div>
            )}

            {showForm && (
                <div style={{
                    padding: '0.75rem', marginBottom: '0.75rem',
                    background: 'var(--app-surface)', border: '1px solid var(--app-border)',
                    borderRadius: 'var(--app-radius-md)',
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem',
                }}>
                    <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--app-text-secondary)' }}>
                        유형
                        <select
                            value={form.flag_type}
                            onChange={e => setForm(f => ({ ...f, flag_type: e.target.value as MemberAlertFlagType }))}
                            style={{ ...inputStyle, marginTop: 4 }}
                        >
                            {(Object.keys(FLAG_TYPE_LABEL) as MemberAlertFlagType[]).map(t => (
                                <option key={t} value={t}>{FLAG_TYPE_LABEL[t].emoji} {FLAG_TYPE_LABEL[t].label}</option>
                            ))}
                        </select>
                    </label>
                    <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--app-text-secondary)' }}>
                        심각도
                        <select
                            value={form.severity}
                            onChange={e => setForm(f => ({ ...f, severity: e.target.value as MemberAlertSeverity }))}
                            style={{ ...inputStyle, marginTop: 4 }}
                        >
                            <option value="info">Info</option>
                            <option value="warning">Warning</option>
                            <option value="critical">Critical</option>
                        </select>
                    </label>
                    <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--app-text-secondary)' }}>
                        만료일 (선택)
                        <input
                            type="date" value={form.ends_at}
                            onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))}
                            style={{ ...inputStyle, marginTop: 4 }}
                        />
                    </label>
                    <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--app-text-secondary)', gridColumn: '1 / -1' }}>
                        메모
                        <textarea
                            value={form.note} rows={2}
                            onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                            style={{ ...inputStyle, marginTop: 4, resize: 'vertical' }}
                        />
                    </label>
                    <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={handleAddFlag} disabled={saving} style={{
                            padding: '0.375rem 0.875rem', borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: 'var(--app-accent)', color: '#fff',
                            fontSize: '0.75rem', fontWeight: 700, opacity: saving ? 0.7 : 1,
                        }}>
                            {saving ? '저장 중...' : '플래그 추가'}
                        </button>
                    </div>
                </div>
            )}

            {flags.length === 0 ? (
                !showForm && (
                    <div style={{
                        background: 'var(--app-surface)', padding: '0.75rem', borderRadius: 12,
                        border: '1px solid var(--app-border)', textAlign: 'center',
                    }}>
                        <p style={{ color: 'var(--app-text-muted)', fontSize: '0.75rem' }}>활성 플래그가 없습니다.</p>
                    </div>
                )
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    {flags.map(flag => {
                        const meta = FLAG_TYPE_LABEL[flag.flag_type];
                        const sv = SEVERITY_STYLE[flag.severity];
                        return (
                            <div key={flag.id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                                padding: '0.5rem 0.75rem',
                                background: sv.bg, border: '1px solid ' + sv.border,
                                borderRadius: 'var(--app-radius-md)',
                            }}>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: sv.color }}>
                                        {meta.emoji} {meta.label}
                                        {flag.ends_at && (
                                            <span style={{ marginLeft: 6, fontSize: '0.625rem', fontWeight: 600, color: 'var(--app-text-muted)' }}>
                                                ~{flag.ends_at.slice(0, 10)}
                                            </span>
                                        )}
                                    </div>
                                    {flag.note && (
                                        <div style={{ fontSize: '0.75rem', color: 'var(--app-text-secondary)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {flag.note}
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => handleResolveFlag(flag)} style={{
                                    padding: '0.25rem 0.5rem', borderRadius: 6, flexShrink: 0,
                                    border: '1px solid var(--app-border)', background: 'transparent',
                                    color: 'var(--app-text-secondary)', fontSize: '0.625rem', fontWeight: 600, cursor: 'pointer',
                                }}>
                                    해소
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
