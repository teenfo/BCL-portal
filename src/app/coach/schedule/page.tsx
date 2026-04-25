'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';

import { query, rpc } from '@/lib/supabase/query';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'next/navigation';

interface SessionItem {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    capacity: number;
    session_date: string;
    wod_description?: string;
    checkin_count?: number;
    booked_count?: number;
}

interface Attendee {
    booking_id: string;
    member_id: string;
    member_name: string;
    avatar_url: string | null;
    booking_status: string;
    checked_in: boolean;
    checkin_time: string | null;
}

function SchedulePageContent() {
    const { user } = useAuth();
    const [sessions, setSessions] = useState<SessionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const searchParams = useSearchParams();
    const focusSessionId = searchParams?.get('session_id');

    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [viewMode, setViewMode] = useState<'day' | 'week'>('day');

    // Modal state
    const [selectedSession, setSelectedSession] = useState<SessionItem | null>(null);
    const [attendees, setAttendees] = useState<Attendee[]>([]);
    const [attendeesLoading, setAttendeesLoading] = useState(false);

    // WOD Edit state
    const [isEditingWod, setIsEditingWod] = useState(false);
    const [wodText, setWodText] = useState('');

    const loadSessions = useCallback(async () => {
        if (!user) return;
        setLoading(true);

        try {
            const { data: dashboardData, error: dbError } = await rpc('fn_get_coach_dashboard', {
                p_user_id: user.id
            });

            if (dbError && process.env.NODE_ENV === 'development') {
                console.error('Error fetching dashboard data:', dbError);
            }

            // `fn_get_coach_dashboard` returns today_sessions and week_sessions but week_sessions is just count.
            // Oh right, we can't JUST use fn_get_coach_dashboard for whole schedule fetching. We still need direct query.
            const { data: coachData } = await query('coaches')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (!coachData) {
                setLoading(false);
                return;
            }

            const { data: sessionCoaches } = await query('session_coaches')
                .select('session_id')
                .eq('coach_id', coachData.id);

            if (!sessionCoaches || sessionCoaches.length === 0) {
                setSessions([]);
                setLoading(false);
                return;
            }

            const sessionIds = sessionCoaches.map((sc: any) => sc.session_id);

            let startDate = selectedDate;
            let endDate = selectedDate;

            if (viewMode === 'week') {
                const d = new Date(selectedDate);
                const day = d.getDay();
                const weekStart = new Date(d);
                weekStart.setDate(d.getDate() - day);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                startDate = weekStart.toISOString().split('T')[0];
                endDate = weekEnd.toISOString().split('T')[0];
            }

            const { data } = await query('sessions')
                .select('*, bookings(id, status), checkins(id)')
                .in('id', sessionIds)
                .gte('session_date', startDate)
                .lte('session_date', endDate)
                .order('session_date', { ascending: true })
                .order('start_time', { ascending: true });

            if (data) {
                const mappedData = data.map((d: any) => ({
                    ...d,
                    booked_count: d.bookings?.filter((b: any) => b.status === 'confirmed').length || 0,
                    checkin_count: d.checkins?.length || 0
                }));
                setSessions(mappedData);

                if (focusSessionId) {
                    const focus = mappedData.find((s: any) => s.id === focusSessionId);
                    if (focus) handleSessionClick(focus);
                }
            }
        } catch (error) {
            if (process.env.NODE_ENV === 'development') console.error('Coach schedule load error:', error);
        }
        setLoading(false);
    }, [user, selectedDate, viewMode, focusSessionId]);

    useEffect(() => { loadSessions(); }, [loadSessions]);

    const navigateDay = (offset: number) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + offset);
        setSelectedDate(d.toISOString().split('T')[0]);
        setSelectedSession(null);
    };

    const isToday = selectedDate === new Date().toISOString().split('T')[0];

    const handleSessionClick = async (session: SessionItem) => {
        setSelectedSession(session);
        setWodText(session.wod_description || '');
        setIsEditingWod(false);
        setAttendeesLoading(true);
        try {
            const { data, error } = await rpc('fn_get_session_attendees', {
                p_session_id: session.id
            });
            if (data && !error) setAttendees(data);
        } catch (e) {
            if (process.env.NODE_ENV === 'development') console.error(e);
        }
        setAttendeesLoading(false);
    };

    const handleCheckIn = async (memberId: string) => {
        if (!selectedSession || !user) return;
        try {
            const res = await rpc('fn_coach_mark_attendance', {
                p_session_id: selectedSession.id,
                p_member_id: memberId,
                p_coach_user_id: user.id
            });
            if (res.data?.success) {
                // Update local state
                setAttendees(prev => prev.map(a =>
                    a.member_id === memberId ? { ...a, checked_in: true, checkin_time: new Date().toISOString() } : a
                ));
            } else {
                alert(res.data?.error || '출석 처리에 실패했습니다.');
            }
        } catch (e) {
            if (process.env.NODE_ENV === 'development') console.error(e);
            alert('오류가 발생했습니다.');
        }
    };

    const handleSaveWod = async () => {
        if (!selectedSession) return;
        try {
            const { error } = await query('sessions')
                .update({ wod_description: wodText })
                .eq('id', selectedSession.id);

            if (!error) {
                setIsEditingWod(false);
                setSessions(prev => prev.map(s => s.id === selectedSession.id ? { ...s, wod_description: wodText } : s));
                setSelectedSession(prev => prev ? { ...prev, wod_description: wodText } : null);
            }
        } catch (e) {
            if (process.env.NODE_ENV === 'development') console.error(e);
        }
    };

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
                        onClick={() => { setViewMode(mode); setSelectedSession(null); }}
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
                                border: selectedSession?.id === session.id ? '2px solid var(--app-accent)' : '1px solid var(--app-glass-border)'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--app-text-primary)' }}>
                                    {session.title}
                                </h4>
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--app-text-secondary)', fontSize: '0.8125rem' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                                    </svg>
                                    {session.start_time.slice(0, 5)} ~ {session.end_time?.slice(0, 5) || ''}
                                </span>
                                {viewMode === 'week' && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
                                        </svg>
                                        {new Date(session.session_date + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                                    </span>
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

            {/* Session Detail Modal */}
            {selectedSession && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', zIndex: 1000,
                    display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                    backdropFilter: 'blur(4px)'
                }} onClick={(e) => {
                    if (e.target === e.currentTarget) setSelectedSession(null);
                }}>
                    <div className="app-bottom-sheet" style={{
                        background: 'var(--app-bg)',
                        borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
                        padding: '1.5rem', maxHeight: '85vh', overflowY: 'auto',
                        boxShadow: '0 -10px 40px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--app-text-primary)' }}>수업 상세</h3>
                            <button onClick={() => setSelectedSession(null)} style={{ background: 'none', border: 'none', color: 'var(--app-text-secondary)', cursor: 'pointer' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--app-text-primary)' }}>WOD (Work Out of the Day)</h4>
                            {isEditingWod ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <textarea
                                        value={wodText}
                                        onChange={e => setWodText(e.target.value)}
                                        style={{ width: '100%', minHeight: '100px', padding: '0.75rem', borderRadius: '12px', background: 'var(--app-surface)', border: '1px solid var(--app-border)', color: 'var(--app-text-primary)' }}
                                    />
                                    <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-end' }}>
                                        <button onClick={() => setIsEditingWod(false)} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', background: 'var(--app-surface)', color: 'var(--app-text-primary)', cursor: 'pointer' }}>취소</button>
                                        <button onClick={handleSaveWod} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', background: 'var(--app-accent)', color: '#fff', cursor: 'pointer' }}>저장</button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ background: 'var(--app-surface)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--app-border)' }}>
                                    <p style={{ whiteSpace: 'pre-wrap', color: 'var(--app-text-secondary)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                                        {selectedSession.wod_description || '등록된 WOD가 없습니다.'}
                                    </p>
                                    <button onClick={() => setIsEditingWod(true)} style={{ background: 'none', border: 'none', color: 'var(--app-accent)', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 600, padding: 0 }}>
                                        WOD 수정
                                    </button>
                                </div>
                            )}
                        </div>

                        <div>
                            <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--app-text-primary)', display: 'flex', justifyContent: 'space-between' }}>
                                참석자 명단
                                <span style={{ color: 'var(--app-accent)' }}>
                                    {attendees.filter(a => a.checked_in).length} / {attendees.length}명
                                </span>
                            </h4>

                            {attendeesLoading ? (
                                <div className="app-skeleton" style={{ height: 100, borderRadius: 12 }} />
                            ) : attendees.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', background: 'var(--app-surface)', borderRadius: '12px' }}>
                                    <p style={{ color: 'var(--app-text-secondary)', fontSize: '0.875rem' }}>예약자가 없습니다.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {attendees.map(attendee => (
                                        <div key={attendee.member_id} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '0.75rem 1rem', background: 'var(--app-surface)', borderRadius: '12px',
                                            border: attendee.checked_in ? '1px solid var(--app-accent)' : '1px solid var(--app-border)'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#ff336620', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--app-accent)', fontWeight: 600 }}>
                                                    {attendee.member_name.slice(0, 1)}
                                                </div>
                                                <div>
                                                    <div style={{ color: 'var(--app-text-primary)', fontWeight: 600, fontSize: '0.9375rem' }}>
                                                        {attendee.member_name}
                                                    </div>
                                                    <div style={{ color: 'var(--app-text-secondary)', fontSize: '0.75rem' }}>
                                                        {attendee.checked_in ? `출석 완료 (${new Date(attendee.checkin_time!).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })})` : '미출석'}
                                                    </div>
                                                </div>
                                            </div>
                                            {!attendee.checked_in && (
                                                <button onClick={() => handleCheckIn(attendee.member_id)} style={{
                                                    padding: '0.5rem 0.75rem', borderRadius: '8px', background: 'var(--app-accent)',
                                                    color: '#fff', border: 'none', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    출석 체크
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
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
