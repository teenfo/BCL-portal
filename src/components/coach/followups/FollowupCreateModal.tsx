'use client';

import { useState } from 'react';

import { rpc } from '@/lib/supabase/query';
import { FOLLOWUP_TYPE_META, type FollowupPriority, type FollowupType } from '@/types/p2';

interface MemberChoice {
    member_id: string;
    member_name: string;
}

interface FollowupCreateModalProps {
    /** 선택 가능 회원 목록 (세션 참석자 등). 1명이면 자동 선택. */
    members: MemberChoice[];
    sessionId?: string | null;
    onClose: () => void;
    onCreated: () => Promise<void> | void;
}

const FOLLOWUP_TYPES = Object.entries(FOLLOWUP_TYPE_META) as Array<[
    FollowupType, { label: string; emoji: string; color: string }
]>;

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.625rem', borderRadius: 8,
    background: 'var(--app-surface)', border: '1px solid var(--app-border)',
    color: 'var(--app-text-primary)', fontSize: '0.875rem', outline: 'none',
};

export default function FollowupCreateModal({ members, sessionId, onClose, onCreated }: FollowupCreateModalProps) {
    const [memberId, setMemberId] = useState(members.length === 1 ? members[0].member_id : '');
    const [type, setType] = useState<FollowupType | ''>('');
    const [priority, setPriority] = useState<FollowupPriority>('normal');
    const [dueDate, setDueDate] = useState('');
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!memberId || !type) {
            setError('회원과 유형을 선택해주세요.');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const { data, error: rpcError } = await rpc('fn_create_followup', {
                p_payload: {
                    member_id: memberId,
                    followup_type: type,
                    session_id: sessionId || null,
                    priority,
                    due_date: dueDate || null,
                    note: note.trim() || null,
                },
            });
            if (rpcError || !data?.success) {
                setError(data?.error || rpcError?.message || '후속 조치 생성에 실패했습니다.');
            } else {
                await onCreated();
                onClose();
            }
        } catch (e) {
            if (process.env.NODE_ENV === 'development') console.error(e);
            setError('오류가 발생했습니다.');
        }
        setSaving(false);
    };

    return (
        <div
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.55)', zIndex: 1100,
                display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                backdropFilter: 'blur(4px)',
            }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div style={{
                background: 'var(--app-bg)',
                borderTopLeftRadius: 24, borderTopRightRadius: 24,
                padding: '1.25rem 1.25rem 2rem', maxHeight: '85vh', overflowY: 'auto',
                boxShadow: '0 -10px 40px rgba(0,0,0,0.2)',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--app-text-primary)' }}>
                        📝 후속 조치 생성
                    </h3>
                    <button onClick={onClose} aria-label="닫기" style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--app-text-secondary)', padding: 4,
                    }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    {/* 회원 선택 */}
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--app-text-secondary)', display: 'block', marginBottom: 6 }}>
                            대상 회원
                        </label>
                        <select value={memberId} onChange={e => setMemberId(e.target.value)} style={inputStyle}>
                            <option value="">회원 선택...</option>
                            {members.map(m => (
                                <option key={m.member_id} value={m.member_id}>{m.member_name}</option>
                            ))}
                        </select>
                    </div>

                    {/* 유형 */}
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--app-text-secondary)', display: 'block', marginBottom: 6 }}>
                            유형
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                            {FOLLOWUP_TYPES.map(([value, meta]) => (
                                <button
                                    key={value}
                                    onClick={() => setType(value)}
                                    style={{
                                        padding: '0.4375rem 0.75rem', borderRadius: 999,
                                        border: '1px solid ' + (type === value ? meta.color : 'var(--app-border)'),
                                        background: type === value ? meta.color + '20' : 'transparent',
                                        color: type === value ? meta.color : 'var(--app-text-secondary)',
                                        fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                                    }}
                                >
                                    {meta.emoji} {meta.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 우선순위 + 기한 */}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--app-text-secondary)', display: 'block', marginBottom: 6 }}>
                                우선순위
                            </label>
                            <select value={priority} onChange={e => setPriority(e.target.value as FollowupPriority)} style={inputStyle}>
                                <option value="high">높음</option>
                                <option value="normal">보통</option>
                                <option value="low">낮음</option>
                            </select>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--app-text-secondary)', display: 'block', marginBottom: 6 }}>
                                기한 (선택)
                            </label>
                            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' }} />
                        </div>
                    </div>

                    {/* 메모 */}
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--app-text-secondary)', display: 'block', marginBottom: 6 }}>
                            메모 (선택)
                        </label>
                        <textarea
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            rows={3}
                            placeholder="예: 어깨 통증 호소 — 다음 수업 전 상태 확인 필요"
                            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
                        />
                    </div>

                    {error && (
                        <div style={{
                            padding: '0.5rem 0.75rem', borderRadius: 8,
                            background: 'rgba(239,68,68,0.1)', color: '#EF4444', fontSize: '0.8125rem',
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        style={{
                            padding: '0.75rem', borderRadius: 12, border: 'none',
                            background: 'var(--app-accent)', color: '#fff',
                            fontWeight: 700, fontSize: '0.9375rem', cursor: 'pointer',
                            opacity: saving ? 0.7 : 1,
                        }}
                    >
                        {saving ? '생성 중...' : '후속 조치 생성'}
                    </button>
                </div>
            </div>
        </div>
    );
}
