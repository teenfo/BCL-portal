'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';

import { rpc } from '@/lib/supabase/query';
import { useSearchParams } from 'next/navigation';

import SessionOperationsBoard from '@/components/coach/SessionOperationsBoard';
import type { SessionBoardData } from '@/components/coach/types';

interface SessionItem {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    capacity: number;
    session_date: string;
    wod_description?: string | null;
    booked_count: number;
    waitlist_count: number;
    checkin_count: number;
    no_show_count: number;
    late_cancel_count: number;
    race_linked: boolean;
}

function SchedulePageContent() {
    const [sessions, setSessions] = useState<SessionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const searchParams = useSearchParams();
    const focusSessionId = searchParams?.get('session_id');

    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [viewMode, setViewMode] = useState<'day' | 'week'>('day');

    const [board, setBoard] = useState<SessionBoardData | null>(null);
    const [boardLoading, setBoardLoading] = useState(false);

    const computeRange = useCallback(() => {
        if (viewMode === 'day') {
            return { from: selectedDate, to: selectedDate };
        }
        const d = new Date(selectedDate);
        const day = d.getDay();
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - day);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return {
            from: weekStart.toISOString().split('T')[0],
            to: weekEnd.toISOString().split('T')[0],
        };
    }, [selectedDate, viewMode]);

    const loadSessions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { from, to } = computeRange();
            const { data, error: rpcError } = await rpc('fn_get_coach_schedule', { p_from: from, p_to: to });
            if (rpcError) {
                setError(rpcError.message);
                setSessions([]);
            } else if (data?.success === false) {
                setError(data.error ?? '스케줄을 불러오지 못했습니다.');
                setSessions([]);
            } else {
                const list = Array.isArray(data?.data) ? (data.data as SessionItem[]) : [];
                setSessions(list);
            }
        } catch (e) {
            if (process.env.NODE_ENV === 'development') console.error(e);
            setError('스케줄 로드 중 오류가 발생했습니다.');
        }
        setLoading(false);
    }, [computeRange]);

    const loadBoard = useCallback(async (sessionId: string) => {
        setBoardLoading(true);
        try {
            const { data, error: rpcError } = await rpc('fn_get_coach_session_board', { p_session_id: sessionId });
            if (rpcError) {
                setError(rpcError.message);
                setBoard(null);
            } else if (!data?.success) {
                setError(data?.error ?? '세션 보드를 불러올 수 없습니다.');
                setBoard(null);
            } else {
                setBoard(data.data as SessionBoardData);
            }
        } catch (e) {
            if (process.env.NODE_ENV === 'development') console.error(e);
            setError('세션 보드 로드 중 오류가 발생했습니다.');
            setBoard(null);
        }
        setBoardLoading(false);
    }, []);

    useEffect(() => { loadSessions(); }, [loadSessions]);

    useEffect(() => {
        if (focusSessionId && sessions.some(s => s.id === focusSessionId) && !board) {
            loadBoard(focusSessionId);
        }
    }, [focusSessionId, sessions, board, loadBoard]);

    const navigateDay = (offset: number) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + offset);
        setSelectedDate(d.toISOString().split('T')[0]);
    };

    const isToday = selectedDate === new Date().toISOString().split('T')[0];

    const handleSessionClick = (session: SessionItem) => {
        loadBoard(session.id);
    };

    const handleBoardClose = () => {
        setBoard(null);
    };

    const handleBoardRefresh = useCallback(async () => {
        if (board) {
            await loadBoard(board.session.id);
        }
        await loadSessions();
    }, [board, loadBoard, loadSessions]);

    return (
        <div className="app-page">
            <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--app-text-primary)', letterSpacing: '-0.01em' }}>
                    내 수업 일정
                </h2>
            </div>

            {/* View Mode Toggle */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                {(['day', 'week'] as const).map(mode => (
                    <button
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: 'var(--app-radius-md)',
                            border: '1px solid var(--app-border)',
                            background: viewMode === mode ? 'var(--app-accent)' : 'var(--app-surface)',
                            color: viewMode === mode ? '#fff' : 'var(--app-text-secondary)',
                            fontWeight: 600,
                            fontSize: '0.8125rem',
                            cursor: 'pointer',
                        }}
                    >
                        {mode === 'day' ? '일간' : '주간'}
                    </button>
                ))}
            </div>

            {/* Date Navigation */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '1.5rem', padding: '0.75rem 1rem',
                borderRadius: 'var(--app-radius-lg)',
                background: 'var(--app-surface)',
                border: '1px solid var(--app-border)',
            }}>
                <button onClick={() => navigateDay(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--app-text-primary)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                </button>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--app-text-primary)' }}>
                        {new Date(selectedDate + 'T00:00:00').toLocaleDateString('ko-KR', {
                            year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
                        })}
                    </div>
                    {isToday && (
                        <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--app-accent)' }}>Today</span>
                    )}
                </div>
                <button onClick={() => navigateDay(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--app-text-primary)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                </button>
            </div>

            {error && (
                <div style={{
                    padding: '0.75rem 1rem', borderRadius: 12, marginBottom: '1rem',
                    background: 'rgba(239,68,68,0.1)', color: '#EF4444', fontSize: '0.8125rem',
                }}>
                    {error}
                </div>
            )}

            {/* Session List */}
            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} className="app-skeleton" style={{ height: 100, borderRadius: 16 }} />
                    ))}
                </div>
            ) : sessions.length === 0 ? (
                <div className="app-glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.25 }}>📭</div>
                    <p style={{ color: 'var(--app-text-secondary)', fontSize: '0.875rem' }}>
                        이 날 배정된 수업이 없습니다
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {sessions.map(session => (
                        <div
                            key={session.id}
                            onClick={() => handleSessionClick(session)}
                            className="app-glass-card block"
                            style={{
                                padding: '1.25rem',
                                cursor: 'pointer',
                                border: board?.session.id === session.id ? '2px solid var(--app-accent)' : '1px solid var(--app-glass-border)',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--app-text-primary)' }}>
                                        {session.title}
                                    </h4>
                                    {session.race_linked && (
                                        <span style={{
                                            padding: '0.125rem 0.5rem', borderRadius: 999,
                                            background: 'var(--app-accent-badge)', color: 'var(--app-accent)',
                                            fontSize: '0.625rem', fontWeight: 700,
                                        }}>🏁 Race</span>
                                    )}
                                </div>
                                <span style={{
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: 'var(--app-radius-sm)',
                                    background: 'var(--app-accent-bg)',
                                    color: 'var(--app-accent)',
                                    fontSize: '0.6875rem',
                                    fontWeight: 700,
                                }}>
                                    {session.checkin_count}/{session.booked_count} 출석
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--app-text-secondary)', fontSize: '0.8125rem', flexWrap: 'wrap' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                                    </svg>
                                    {session.start_time?.slice(0, 5)} ~ {session.end_time?.slice(0, 5) || ''}
                                </span>
                                {viewMode === 'week' && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
                                        </svg>
                                        {new Date(session.session_date + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                                    </span>
                                )}
                                {session.waitlist_count > 0 && (
                                    <span style={{ color: '#A78BFA', fontWeight: 600 }}>대기 {session.waitlist_count}</span>
                                )}
                                {session.no_show_count > 0 && (
                                    <span style={{ color: '#EF4444', fontWeight: 600 }}>노쇼 {session.no_show_count}</span>
                                )}
                                {session.late_cancel_count > 0 && (
                                    <span style={{ color: '#F59E0B', fontWeight: 600 }}>지각취소 {session.late_cancel_count}</span>
                                )}
                            </div>
                            {session.wod_description && (
                                <div style={{
                                    marginTop: '0.75rem', padding: '0.75rem',
                                    borderRadius: 'var(--app-radius-md)',
                                    background: 'var(--app-bg)',
                                    fontSize: '0.8125rem',
                                    color: 'var(--app-text-secondary)',
                                    lineHeight: 1.5,
                                }}>
                                    {session.wod_description}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {boardLoading && !board && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                }}>
                    <div className="app-glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                        <div className="app-skeleton" style={{ height: 14, width: 180, marginBottom: 8 }} />
                        <p style={{ fontSize: '0.8125rem', color: 'var(--app-text-secondary)' }}>운영 보드를 불러오는 중...</p>
                    </div>
                </div>
            )}

            {board && (
                <SessionOperationsBoard
                    board={board}
                    onClose={handleBoardClose}
                    onRefresh={handleBoardRefresh}
                />
            )}
        </div>
    );
}

export default function CoachSchedulePage() {
    return (
        <Suspense fallback={<div className="app-page"><div className="app-skeleton" style={{ height: '30px', width: '200px' }} /></div>}>
            <SchedulePageContent />
        </Suspense>
    );
}
