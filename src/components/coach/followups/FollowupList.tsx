'use client';

import { useState } from 'react';

import { rpc } from '@/lib/supabase/query';
import { FOLLOWUP_TYPE_META, type CoachFollowup } from '@/types/p2';

interface FollowupListProps {
    followups: CoachFollowup[];
    onChanged: () => Promise<void> | void;
    emptyText?: string;
    compact?: boolean;
}

const PRIORITY_META: Record<string, { label: string; color: string }> = {
    high: { label: '높음', color: '#EF4444' },
    normal: { label: '보통', color: 'var(--app-text-secondary)' },
    low: { label: '낮음', color: 'var(--app-text-muted)' },
};

export default function FollowupList({ followups, onChanged, emptyText, compact }: FollowupListProps) {
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleStatus = async (id: string, status: 'completed' | 'dismissed' | 'open') => {
        setBusy(`${id}:${status}`);
        setError(null);
        try {
            const { data, error: rpcError } = await rpc('fn_complete_followup', {
                p_followup_id: id,
                p_status: status,
            });
            if (rpcError || !data?.success) {
                setError(data?.error || rpcError?.message || '처리에 실패했습니다.');
            } else {
                await onChanged();
            }
        } catch (e) {
            if (process.env.NODE_ENV === 'development') console.error(e);
            setError('오류가 발생했습니다.');
        }
        setBusy(null);
    };

    if (followups.length === 0) {
        return (
            <div style={{
                background: 'var(--app-surface)', padding: '1rem', borderRadius: 12,
                border: '1px solid var(--app-border)', textAlign: 'center',
            }}>
                <p style={{ color: 'var(--app-text-muted)', fontSize: '0.8125rem' }}>
                    {emptyText || '후속 조치가 없습니다.'}
                </p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {error && (
                <div style={{
                    padding: '0.5rem 0.75rem', borderRadius: 8,
                    background: 'rgba(239,68,68,0.1)', color: '#EF4444', fontSize: '0.8125rem',
                }}>
                    {error}
                </div>
            )}
            {followups.map(f => {
                const meta = FOLLOWUP_TYPE_META[f.followup_type];
                const isOpen = f.status === 'open';
                return (
                    <div key={f.id} style={{
                        padding: compact ? '0.625rem 0.75rem' : '0.75rem',
                        background: 'var(--app-surface)',
                        border: '1px solid ' + (f.is_overdue ? 'rgba(239,68,68,0.35)' : 'var(--app-border)'),
                        borderRadius: 'var(--app-radius-md)',
                        opacity: isOpen ? 1 : 0.6,
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                                <span style={{
                                    padding: '0.125rem 0.5rem', borderRadius: 999, flexShrink: 0,
                                    background: meta.color + '1f', color: meta.color,
                                    fontSize: '0.6875rem', fontWeight: 700,
                                }}>
                                    {meta.emoji} {meta.label}
                                </span>
                                {f.member_name && (
                                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--app-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {f.member_name}
                                    </span>
                                )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                {f.priority !== 'normal' && (
                                    <span style={{ fontSize: '0.625rem', fontWeight: 700, color: PRIORITY_META[f.priority].color }}>
                                        {PRIORITY_META[f.priority].label}
                                    </span>
                                )}
                                {f.due_date && (
                                    <span style={{
                                        fontSize: '0.6875rem', fontWeight: 600,
                                        color: f.is_overdue ? '#EF4444' : 'var(--app-text-muted)',
                                    }}>
                                        {f.is_overdue ? '⚠️ ' : ''}~{f.due_date.slice(5)}
                                    </span>
                                )}
                            </div>
                        </div>
                        {f.note && (
                            <p style={{ fontSize: '0.8125rem', color: 'var(--app-text-secondary)', marginTop: 6, lineHeight: 1.5 }}>
                                {f.note}
                            </p>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.375rem', marginTop: 8 }}>
                            {isOpen ? (
                                <>
                                    <button
                                        disabled={busy === `${f.id}:dismissed`}
                                        onClick={() => handleStatus(f.id, 'dismissed')}
                                        style={{
                                            padding: '0.3125rem 0.625rem', borderRadius: 8,
                                            border: '1px solid var(--app-border)', background: 'transparent',
                                            color: 'var(--app-text-muted)', fontSize: '0.6875rem', fontWeight: 600,
                                            cursor: 'pointer', opacity: busy === `${f.id}:dismissed` ? 0.6 : 1,
                                        }}
                                    >
                                        해제
                                    </button>
                                    <button
                                        disabled={busy === `${f.id}:completed`}
                                        onClick={() => handleStatus(f.id, 'completed')}
                                        style={{
                                            padding: '0.3125rem 0.625rem', borderRadius: 8,
                                            border: 'none', background: 'rgba(34,197,94,0.12)',
                                            color: '#22C55E', fontSize: '0.6875rem', fontWeight: 700,
                                            cursor: 'pointer', opacity: busy === `${f.id}:completed` ? 0.6 : 1,
                                        }}
                                    >
                                        ✅ 완료
                                    </button>
                                </>
                            ) : (
                                <>
                                    <span style={{ fontSize: '0.6875rem', color: 'var(--app-text-muted)', alignSelf: 'center' }}>
                                        {f.status === 'completed' ? '완료됨' : '해제됨'}
                                        {f.completed_at ? ` · ${new Date(f.completed_at).toLocaleDateString('ko-KR')}` : ''}
                                    </span>
                                    <button
                                        disabled={busy === `${f.id}:open`}
                                        onClick={() => handleStatus(f.id, 'open')}
                                        style={{
                                            padding: '0.3125rem 0.625rem', borderRadius: 8,
                                            border: '1px solid var(--app-border)', background: 'transparent',
                                            color: 'var(--app-text-secondary)', fontSize: '0.6875rem', fontWeight: 600,
                                            cursor: 'pointer', opacity: busy === `${f.id}:open` ? 0.6 : 1,
                                        }}
                                    >
                                        다시 열기
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
