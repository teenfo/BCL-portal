'use client';

import { useState, useMemo } from 'react';

import { rpc } from '@/lib/supabase/query';
import AttendanceOutcomeChip from './AttendanceOutcomeChip';
import SessionWodPanel from './wod/SessionWodPanel';
import CoachLiveWodView from './wod/CoachLiveWodView';
import SessionRunbookPanel from './runbook/SessionRunbookPanel';
import type {
    AttendanceOutcome,
    SessionBoardData,
    SessionBoardAttendee,
} from './types';

interface SessionOperationsBoardProps {
    board: SessionBoardData;
    onClose: () => void;
    onRefresh: () => Promise<void> | void;
}

const ATTENDANCE_ACTIONS: Array<{ value: AttendanceOutcome; label: string; emoji: string; color: string }> = [
    { value: 'checked_in', label: '체크인', emoji: '✅', color: '#22C55E' },
    { value: 'no_show', label: '노쇼', emoji: '🚫', color: '#EF4444' },
    { value: 'late_cancel', label: '지각취소', emoji: '⏰', color: '#F59E0B' },
    { value: 'coach_excused', label: '예외처리', emoji: '🛡', color: '#A78BFA' },
];

export default function SessionOperationsBoard({ board, onClose, onRefresh }: SessionOperationsBoardProps) {
    const { session, coaches, attendees, summary } = board;

    const [busy, setBusy] = useState<string | null>(null);
    const [bulkBusy, setBulkBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const confirmedAttendees = useMemo(
        () => attendees.filter(a => a.booking_status === 'confirmed'),
        [attendees],
    );
    const waitlistedAttendees = useMemo(
        () => attendees.filter(a => a.booking_status === 'waitlist' || a.booking_status === 'waitlisted'),
        [attendees],
    );

    const sessionStartIso = useMemo(() => {
        try {
            return new Date(`${session.session_date}T${session.start_time}`).toISOString();
        } catch {
            return null;
        }
    }, [session.session_date, session.start_time]);

    const minutesUntilStart = useMemo(() => {
        if (!sessionStartIso) return null;
        return Math.round((new Date(sessionStartIso).getTime() - Date.now()) / 60000);
    }, [sessionStartIso]);

    const handleAction = async (memberId: string, action: AttendanceOutcome) => {
        setBusy(`${memberId}:${action}`);
        setError(null);
        try {
            const { data, error: rpcError } = await rpc('fn_mark_session_attendance', {
                p_session_id: session.id,
                p_member_id: memberId,
                p_action: action,
            });
            if (rpcError || !data?.success) {
                setError(data?.error || rpcError?.message || '출결 처리에 실패했습니다.');
            } else {
                await onRefresh();
            }
        } catch (e) {
            if (process.env.NODE_ENV === 'development') console.error(e);
            setError('오류가 발생했습니다.');
        }
        setBusy(null);
    };

    const handleBulk = async (action: AttendanceOutcome, scope: 'all_pending' | 'unchecked_after_start') => {
        const targets = confirmedAttendees.filter(a => {
            if (a.attendance_outcome !== 'pending') return false;
            if (scope === 'unchecked_after_start') {
                if (!sessionStartIso) return false;
                return new Date(sessionStartIso).getTime() <= Date.now();
            }
            return true;
        });

        if (targets.length === 0) {
            setError('대상자가 없습니다.');
            return;
        }
        if (!confirm(`${targets.length}명에게 "${action}" 처리를 적용하시겠습니까?`)) return;

        setBulkBusy(true);
        setError(null);
        try {
            const payload = targets.map(t => ({ member_id: t.member_id, action }));
            const { data, error: rpcError } = await rpc('fn_bulk_mark_session_attendance', {
                p_session_id: session.id,
                p_payload: payload,
            });
            if (rpcError) {
                setError(rpcError.message);
            } else if (data && data.status === 'partial') {
                const failureCount = data.data?.failure_count ?? 0;
                setError(`일부 처리에 실패했습니다 (${failureCount}건). 새로고침 후 다시 확인해 주세요.`);
            }
            await onRefresh();
        } catch (e) {
            if (process.env.NODE_ENV === 'development') console.error(e);
            setError('일괄 처리 중 오류가 발생했습니다.');
        }
        setBulkBusy(false);
    };

    const renderAttendeeRow = (attendee: SessionBoardAttendee) => {
        const baseKey = attendee.member_id;
        return (
            <div key={attendee.booking_id} style={{
                padding: '0.75rem',
                background: 'var(--app-surface)',
                border: '1px solid var(--app-border)',
                borderRadius: 'var(--app-radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: 'var(--app-accent-bg)',
                            color: 'var(--app-accent)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: '0.8125rem',
                        }}>
                            {attendee.member_name.charAt(0)}
                        </div>
                        <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--app-text-primary)' }}>
                                {attendee.member_name}
                            </div>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--app-text-muted)', display: 'flex', gap: 6 }}>
                                {attendee.booking_type && attendee.booking_type !== 'regular' && (
                                    <span style={{
                                        padding: '0 4px', borderRadius: 4,
                                        background: 'rgba(59,130,246,0.12)', color: '#3B82F6', fontWeight: 700,
                                    }}>
                                        {attendee.booking_type}
                                    </span>
                                )}
                                {attendee.checkin_time && (
                                    <span>
                                        {new Date(attendee.checkin_time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <AttendanceOutcomeChip outcome={attendee.attendance_outcome} />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                    {ATTENDANCE_ACTIONS.map(action => {
                        const isCurrent = attendee.attendance_outcome === action.value;
                        const key = `${baseKey}:${action.value}`;
                        return (
                            <button
                                key={action.value}
                                disabled={busy === key || isCurrent}
                                onClick={() => handleAction(attendee.member_id, action.value)}
                                style={{
                                    padding: '0.375rem 0.625rem',
                                    borderRadius: 8,
                                    border: '1px solid ' + (isCurrent ? action.color : 'var(--app-border)'),
                                    background: isCurrent ? action.color + '20' : 'transparent',
                                    color: isCurrent ? action.color : 'var(--app-text-secondary)',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    cursor: busy === key || isCurrent ? 'default' : 'pointer',
                                    opacity: busy === key ? 0.6 : 1,
                                }}
                            >
                                {action.emoji} {action.label}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.55)', zIndex: 1000,
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
            backdropFilter: 'blur(4px)',
        }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="app-bottom-sheet" style={{
                background: 'var(--app-bg)',
                borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
                padding: '1.25rem 1.25rem 2rem', maxHeight: '92vh', overflowY: 'auto',
                boxShadow: '0 -10px 40px rgba(0,0,0,0.2)',
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--app-text-primary)', marginBottom: 4 }}>
                            {session.title}
                        </h3>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--app-text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <span>{session.session_date}</span>
                            <span>·</span>
                            <span>{session.start_time?.slice(0, 5)} ~ {session.end_time?.slice(0, 5)}</span>
                            <span>·</span>
                            <span>정원 {session.capacity}명</span>
                            {minutesUntilStart !== null && minutesUntilStart > 0 && minutesUntilStart <= 30 && (
                                <span style={{ color: '#22C55E', fontWeight: 700 }}>운영 시작 {minutesUntilStart}분 전</span>
                            )}
                            {minutesUntilStart !== null && minutesUntilStart < 0 && minutesUntilStart > -120 && (
                                <span style={{ color: '#F59E0B', fontWeight: 700 }}>진행 중</span>
                            )}
                        </div>
                        {coaches.length > 0 && (
                            <div style={{ display: 'flex', gap: '0.375rem', marginTop: 6, flexWrap: 'wrap' }}>
                                {coaches.map(c => (
                                    <span key={c.coach_id} style={{
                                        padding: '0.125rem 0.5rem',
                                        borderRadius: 999,
                                        background: c.assignment_role === 'lead' ? 'var(--app-accent-bg)' : 'rgba(255,255,255,0.05)',
                                        color: c.assignment_role === 'lead' ? 'var(--app-accent)' : 'var(--app-text-secondary)',
                                        fontSize: '0.6875rem', fontWeight: 700,
                                    }}>
                                        {c.assignment_role === 'lead' ? '★' : ''} {c.coach_name}
                                    </span>
                                ))}
                            </div>
                        )}
                        {session.race_linked && (
                            <span style={{
                                display: 'inline-block', marginTop: 6,
                                padding: '0.125rem 0.5rem', borderRadius: 999,
                                background: 'rgba(255,106,0,0.15)', color: '#FF6A00',
                                fontSize: '0.6875rem', fontWeight: 700,
                            }}>
                                🏁 Race 연결 세션
                            </span>
                        )}
                    </div>
                    <button onClick={onClose} aria-label="닫기" style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--app-text-secondary)', padding: 4,
                    }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Summary */}
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1rem',
                }}>
                    <SummaryStat label="확정" value={summary.confirmed} accent="var(--app-accent)" />
                    <SummaryStat label="체크인" value={summary.checked_in} accent="#22C55E" />
                    <SummaryStat label="대기" value={summary.waitlisted} accent="#A78BFA" />
                    <SummaryStat label="노쇼" value={summary.no_show} accent="#EF4444" />
                </div>
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1.25rem',
                }}>
                    <SummaryStat label="대기 처리" value={summary.pending} accent="rgba(255,255,255,0.5)" />
                    <SummaryStat label="지각취소" value={summary.late_cancel} accent="#F59E0B" />
                    <SummaryStat label="예외처리" value={summary.coach_excused} accent="#3B82F6" />
                </div>

                {error && (
                    <div style={{
                        padding: '0.625rem 0.75rem', borderRadius: 8, marginBottom: '0.75rem',
                        background: 'rgba(239,68,68,0.1)', color: '#EF4444', fontSize: '0.8125rem',
                    }}>
                        {error}
                    </div>
                )}

                {/* Quick actions */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    <button
                        onClick={() => handleBulk('checked_in', 'all_pending')}
                        disabled={bulkBusy || summary.pending === 0}
                        style={{
                            padding: '0.5rem 0.75rem', borderRadius: 8,
                            border: 'none', background: 'var(--app-accent)', color: '#fff',
                            fontWeight: 600, fontSize: '0.8125rem', cursor: bulkBusy ? 'default' : 'pointer',
                            opacity: summary.pending === 0 ? 0.5 : 1,
                        }}
                    >
                        ✅ 미처리 일괄 체크인
                    </button>
                    <button
                        onClick={() => handleBulk('no_show', 'unchecked_after_start')}
                        disabled={bulkBusy}
                        style={{
                            padding: '0.5rem 0.75rem', borderRadius: 8,
                            border: '1px solid rgba(239,68,68,0.4)',
                            background: 'rgba(239,68,68,0.08)', color: '#EF4444',
                            fontWeight: 600, fontSize: '0.8125rem', cursor: bulkBusy ? 'default' : 'pointer',
                        }}
                    >
                        🚫 시작 이후 미도착자 노쇼 처리
                    </button>
                </div>

                {/* WOD (코치 편집/확인) */}
                <SessionWodPanel
                    sessionId={session.id}
                    facilityId={session.facility_id}
                    sessionDate={session.session_date}
                    fallbackDescription={session.wod_description}
                />

                {/* 라이브 WOD (수업 진행 중 참조용 — 큰 글씨, 스케일링 항상 노출) */}
                <CoachLiveWodView
                    sessionId={session.id}
                    facilityId={session.facility_id}
                    sessionDate={session.session_date}
                    checkedInCount={summary.checked_in}
                    totalConfirmed={summary.confirmed}
                />

                {/* Runbook (Priority 23 P1-A — Warm-up / Movement Prep / Scaling / Cue / Safety / Finish) */}
                <SessionRunbookPanel
                    sessionId={session.id}
                    facilityId={session.facility_id}
                />

                {/* Confirmed attendees */}
                <section style={{ marginBottom: '1.25rem' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--app-text-primary)', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                        확정 예약 ({confirmedAttendees.length}명)
                        <span style={{ color: 'var(--app-accent)' }}>{summary.checked_in}/{summary.confirmed} 출석</span>
                    </h4>
                    {confirmedAttendees.length === 0 ? (
                        <div style={{
                            background: 'var(--app-surface)', padding: '1rem', borderRadius: 12,
                            border: '1px solid var(--app-border)', textAlign: 'center',
                        }}>
                            <p style={{ color: 'var(--app-text-muted)', fontSize: '0.8125rem' }}>확정된 예약이 없습니다.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {confirmedAttendees.map(renderAttendeeRow)}
                        </div>
                    )}
                </section>

                {waitlistedAttendees.length > 0 && (
                    <section style={{ marginBottom: '1rem' }}>
                        <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#A78BFA', marginBottom: '0.5rem' }}>
                            대기 ({waitlistedAttendees.length}명)
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {waitlistedAttendees.map(a => (
                                <div key={a.booking_id} style={{
                                    padding: '0.625rem 0.75rem',
                                    background: 'rgba(167,139,250,0.06)',
                                    border: '1px solid rgba(167,139,250,0.2)',
                                    borderRadius: 'var(--app-radius-md)',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                }}>
                                    <span style={{ fontSize: '0.875rem', color: 'var(--app-text-primary)' }}>{a.member_name}</span>
                                    <AttendanceOutcomeChip outcome={a.attendance_outcome} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}

function SummaryStat({ label, value, accent }: { label: string; value: number; accent: string }) {
    return (
        <div style={{
            padding: '0.625rem',
            background: 'var(--app-surface)',
            border: '1px solid var(--app-border)',
            borderRadius: 'var(--app-radius-md)',
            textAlign: 'center',
        }}>
            <div style={{ fontSize: '1.125rem', fontWeight: 800, color: accent }}>{value}</div>
            <div style={{ fontSize: '0.625rem', fontWeight: 600, color: 'var(--app-text-muted)', marginTop: 2 }}>
                {label}
            </div>
        </div>
    );
}
