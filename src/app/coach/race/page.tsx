'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { query } from '@/lib/supabase/query';
import { useToast } from '@/components/ui/Toast';

// race_events.event_type 종목 (스키마 CHECK: rowing/bike/skierg/run/other)
const EVENT_TYPES: { value: string; label: string }[] = [
    { value: 'rowing', label: '🚣 로잉' },
    { value: 'bike', label: '🚴 바이크' },
    { value: 'skierg', label: '⛷️ 스키어그' },
    { value: 'run', label: '🏃 런' },
];
const DISTANCES = [500, 1000, 2000, 5000];
const EVENT_TYPE_LABEL: Record<string, string> = Object.fromEntries(EVENT_TYPES.map(t => [t.value, t.label]));

// Postgres INTERVAL("HH:MM:SS.f") → 초. 방어적으로 숫자/널도 처리.
function intervalToSeconds(v: string | number | null): number | null {
    if (v === null || v === undefined) return null;
    if (typeof v === 'number') return v;
    const parts = v.split(':').map(Number);
    if (parts.some(isNaN)) return null;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0];
}

interface RaceEvent {
    id: string;
    name: string;
    event_date: string;
    event_type: string;
    distance_meters: number;
    status: string;
    created_at: string;
}

interface RaceRecord {
    id: string;
    event_id: string;
    member_id: string;
    result_time: string | null;
    result_distance: number | null;
    is_pr: boolean;
    members?: { name: string };
}

interface MemberOption {
    id: string;
    name: string;
}

export default function CoachRacePage() {
    const router = useRouter();
    const { success, error: toastError } = useToast();
    const [events, setEvents] = useState<RaceEvent[]>([]);
    const [records, setRecords] = useState<RaceRecord[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<RaceEvent | null>(null);
    const [loading, setLoading] = useState(true);

    // Create event
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newEvent, setNewEvent] = useState({ name: '', event_date: '', event_type: 'rowing', distance_meters: 2000 });
    const [creating, setCreating] = useState(false);

    // Add record
    const [showRecordForm, setShowRecordForm] = useState(false);
    const [members, setMembers] = useState<MemberOption[]>([]);
    const [recordForm, setRecordForm] = useState({ member_id: '', minutes: '', seconds: '', tenths: '' });
    const [addingRecord, setAddingRecord] = useState(false);

    useEffect(() => {
        loadRaceData();
    }, []);

    async function loadRaceData() {
        try {
            const { data: eventData } = await query('race_events')
                .select('*')
                .order('event_date', { ascending: false })
                .limit(20);

            if (eventData) setEvents(eventData);
        } catch (error) {
            if (process.env.NODE_ENV === 'development') console.error('Race events load error:', error);
        }
        setLoading(false);
    }

    async function loadRecords(eventId: string) {
        try {
            const { data } = await query('race_records')
                .select('*, members!race_records_member_id_fkey(name)')
                .eq('event_id', eventId)
                .order('result_time', { ascending: true });

            if (data) setRecords(data);
        } catch (error) {
            if (process.env.NODE_ENV === 'development') console.error('Race records load error:', error);
        }
    }

    async function loadMembers() {
        try {
            const { data } = await query('members')
                .select('id, name')
                .eq('status', 'active')
                .order('name', { ascending: true });
            setMembers(data || []);
        } catch (e) {
            if (process.env.NODE_ENV === 'development') console.error(e);
        }
    }

    function handleSelectEvent(event: RaceEvent) {
        setSelectedEvent(event);
        setShowRecordForm(false);
        loadRecords(event.id);
    }

    async function handleCreateEvent() {
        if (!newEvent.name.trim() || !newEvent.event_date) {
            toastError('이벤트명과 날짜를 입력해주세요.');
            return;
        }
        setCreating(true);
        try {
            const { data, error } = await query('race_events').insert({
                name: newEvent.name.trim(),
                event_date: newEvent.event_date,
                event_type: newEvent.event_type,
                distance_meters: newEvent.distance_meters,
                status: 'scheduled',
            }).select().single();

            if (error) throw error;
            if (data) {
                setEvents(prev => [data, ...prev]);
                setShowCreateForm(false);
                setNewEvent({ name: '', event_date: '', event_type: 'rowing', distance_meters: 2000 });
                success('레이스 이벤트를 생성했습니다.');
            }
        } catch (e) {
            if (process.env.NODE_ENV === 'development') console.error(e);
            toastError('이벤트 생성에 실패했습니다.');
        }
        setCreating(false);
    }

    async function handleStatusChange(event: RaceEvent, newStatus: string) {
        try {
            const { error } = await query('race_events')
                .update({ status: newStatus })
                .eq('id', event.id);

            if (error) throw error;
            setEvents(prev => prev.map(e => e.id === event.id ? { ...e, status: newStatus } : e));
            if (selectedEvent?.id === event.id) {
                setSelectedEvent({ ...event, status: newStatus });
            }
        } catch (e) {
            if (process.env.NODE_ENV === 'development') console.error(e);
            toastError('상태 변경에 실패했습니다.');
        }
    }

    /** 동일 거리·종목의 과거 기록 중 최단 시간을 깬 경우 PR(개인기록). 첫 기록도 PR. */
    async function computeIsPr(memberId: string, distance: number, eventType: string, newSeconds: number): Promise<boolean> {
        try {
            const { data: comparableEvents } = await query('race_events')
                .select('id')
                .eq('distance_meters', distance)
                .eq('event_type', eventType)
                .neq('id', selectedEvent?.id || '');
            const ids = (comparableEvents || []).map((e: { id: string }) => e.id);
            if (ids.length === 0) return true; // 첫 비교가능 레이스

            const { data: prior } = await query('race_records')
                .select('result_time')
                .eq('member_id', memberId)
                .in('event_id', ids)
                .not('result_time', 'is', null);
            const best = (prior || [])
                .map((r: { result_time: string | null }) => intervalToSeconds(r.result_time))
                .filter((s): s is number => s !== null);
            if (best.length === 0) return true;
            return newSeconds < Math.min(...best);
        } catch {
            return false; // 실패 시 PR 미표기 (기록 저장은 진행)
        }
    }

    async function handleAddRecord() {
        if (!recordForm.member_id || !selectedEvent) {
            toastError('회원을 선택해주세요.');
            return;
        }
        const totalSeconds = (parseInt(recordForm.minutes) || 0) * 60
            + (parseInt(recordForm.seconds) || 0)
            + (parseInt(recordForm.tenths) || 0) / 10;

        if (totalSeconds <= 0) {
            toastError('기록 시간을 입력해주세요.');
            return;
        }

        setAddingRecord(true);
        try {
            const isPr = await computeIsPr(
                recordForm.member_id, selectedEvent.distance_meters, selectedEvent.event_type, totalSeconds
            );
            const { data, error } = await query('race_records').insert({
                event_id: selectedEvent.id,
                member_id: recordForm.member_id,
                // result_time 은 INTERVAL 컬럼 — Postgres interval 리터럴(초)로 저장
                result_time: `${totalSeconds} seconds`,
                result_distance: selectedEvent.distance_meters,
                is_pr: isPr,
            }).select('*, members!race_records_member_id_fkey(name)').single();

            if (error) throw error;
            if (data) {
                setRecords(prev => [...prev, data as unknown as RaceRecord].sort(
                    (a, b) => (intervalToSeconds(a.result_time) ?? 1e9) - (intervalToSeconds(b.result_time) ?? 1e9)
                ));
                setRecordForm({ member_id: '', minutes: '', seconds: '', tenths: '' });
                setShowRecordForm(false);
                success(isPr ? '🏆 개인 기록(PR)으로 저장했습니다!' : '기록을 저장했습니다.');
            }
        } catch (e: any) {
            if (process.env.NODE_ENV === 'development') console.error(e);
            if (e.code === '23505') {
                toastError('이미 해당 회원의 기록이 있습니다.');
            } else {
                toastError('기록 추가에 실패했습니다.');
            }
        }
        setAddingRecord(false);
    }

    function formatTime(value: string | number | null) {
        const seconds = intervalToSeconds(value);
        if (!seconds) return '-';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 10);
        return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
    }

    // race_events.status (스키마 CHECK: scheduled/in_progress/completed/cancelled)
    const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
        scheduled: { label: '예정', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
        in_progress: { label: '진행중', color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
        completed: { label: '완료', color: 'var(--app-text-muted)', bg: 'var(--app-bg)' },
        cancelled: { label: '취소', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
    };

    const nextStatus: Record<string, string> = {
        scheduled: 'in_progress',
        in_progress: 'completed',
    };

    const nextStatusLabel: Record<string, string> = {
        scheduled: '시작',
        in_progress: '종료',
    };

    if (loading) {
        return (
            <div className="app-page">
                <div className="app-skeleton" style={{ width: '50%', height: 28, marginBottom: 24 }} />
                {[1, 2, 3].map(i => (
                    <div key={i} className="app-skeleton" style={{ height: 90, borderRadius: 16, marginBottom: 12 }} />
                ))}
            </div>
        );
    }

    return (
        <div className="app-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--app-text-primary)', letterSpacing: '-0.01em' }}>
                        Race 관리
                    </h2>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--app-text-secondary)', marginTop: 4 }}>
                        레이스 이벤트 및 기록 관리
                    </p>
                </div>
                {!selectedEvent && !showCreateForm && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => router.push('/coach/race/control')} style={{
                            padding: '0.625rem 1rem', borderRadius: 'var(--app-radius-md)',
                            background: 'var(--app-surface)', color: 'var(--app-text-primary)',
                            border: '1px solid var(--app-border)',
                            fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer', whiteSpace: 'nowrap',
                        }}>
                            🏁 라이브 레이스
                        </button>
                        <button onClick={() => setShowCreateForm(true)} style={{
                            padding: '0.625rem 1rem', borderRadius: 'var(--app-radius-md)',
                            background: 'var(--app-accent)', color: '#fff', border: 'none',
                            fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer', whiteSpace: 'nowrap',
                        }}>
                            + 새 이벤트
                        </button>
                    </div>
                )}
            </div>

            {/* 라이브 BLE 레이스 안내 배너 */}
            {!selectedEvent && !showCreateForm && (
                <button
                    onClick={() => router.push('/coach/race/control')}
                    className="app-glass-card"
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%',
                        padding: '1rem', marginBottom: '1rem', cursor: 'pointer', textAlign: 'left',
                        border: '1px solid var(--app-accent-bg)', background: 'var(--app-accent-bg)',
                    }}
                >
                    <span style={{ fontSize: '1.5rem' }}>📡</span>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--app-text-primary)' }}>
                            ERG 실시간 대결 (BLE)
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--app-text-secondary)', marginTop: 2 }}>
                            PM5 장비를 연결해 실시간 레이스를 진행합니다
                        </div>
                    </div>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--app-accent)" strokeWidth="2">
                        <polyline points="9,18 15,12 9,6" />
                    </svg>
                </button>
            )}

            {/* Create Event Form */}
            {showCreateForm && !selectedEvent && (
                <div className="app-glass-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--app-text-primary)', marginBottom: '1rem' }}>새 레이스 이벤트</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <input
                            value={newEvent.name} onChange={e => setNewEvent({ ...newEvent, name: e.target.value })}
                            placeholder="이벤트명 (예: 2월 로잉 타임어택)"
                            style={{ width: '100%', padding: '0.625rem', borderRadius: 8, background: 'var(--app-surface)', border: '1px solid var(--app-border)', color: 'var(--app-text-primary)', fontSize: '0.875rem', outline: 'none' }}
                        />
                        <input
                            type="date" value={newEvent.event_date}
                            onChange={e => setNewEvent({ ...newEvent, event_date: e.target.value })}
                            style={{ width: '100%', padding: '0.625rem', borderRadius: 8, background: 'var(--app-surface)', border: '1px solid var(--app-border)', color: 'var(--app-text-primary)', fontSize: '0.875rem', outline: 'none' }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <select
                                value={newEvent.event_type}
                                onChange={e => setNewEvent({ ...newEvent, event_type: e.target.value })}
                                style={{ flex: 1, padding: '0.625rem', borderRadius: 8, background: 'var(--app-surface)', border: '1px solid var(--app-border)', color: 'var(--app-text-primary)', fontSize: '0.875rem' }}
                            >
                                {EVENT_TYPES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                            <select
                                value={newEvent.distance_meters}
                                onChange={e => setNewEvent({ ...newEvent, distance_meters: parseInt(e.target.value) || 2000 })}
                                style={{ flex: 1, padding: '0.625rem', borderRadius: 8, background: 'var(--app-surface)', border: '1px solid var(--app-border)', color: 'var(--app-text-primary)', fontSize: '0.875rem' }}
                            >
                                {DISTANCES.map(d => (
                                    <option key={d} value={d}>{d}m</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowCreateForm(false)} style={{ padding: '0.5rem 1rem', borderRadius: 8, border: 'none', background: 'var(--app-surface)', color: 'var(--app-text-primary)', cursor: 'pointer' }}>취소</button>
                            <button onClick={handleCreateEvent} disabled={creating} style={{ padding: '0.5rem 1rem', borderRadius: 8, border: 'none', background: 'var(--app-accent)', color: '#fff', fontWeight: 600, cursor: 'pointer', opacity: creating ? 0.7 : 1 }}>
                                {creating ? '생성 중...' : '생성'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Event List */}
            {!selectedEvent ? (
                <>
                    {events.length === 0 && !showCreateForm ? (
                        <div className="app-glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.25 }}>🏁</div>
                            <p style={{ color: 'var(--app-text-secondary)', fontSize: '0.875rem' }}>
                                등록된 레이스 이벤트가 없습니다
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {events.map(event => {
                                const sc = statusConfig[event.status] || statusConfig.upcoming;
                                return (
                                    <div
                                        key={event.id}
                                        className="app-glass-card"
                                        style={{ padding: '1.25rem' }}
                                    >
                                        <div onClick={() => handleSelectEvent(event)} style={{ cursor: 'pointer' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--app-text-primary)' }}>
                                                    {event.name}
                                                </h4>
                                                <span style={{
                                                    padding: '0.25rem 0.5rem', borderRadius: 'var(--app-radius-sm)',
                                                    background: sc.bg, color: sc.color,
                                                    fontSize: '0.6875rem', fontWeight: 700,
                                                }}>
                                                    {sc.label}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8125rem', color: 'var(--app-text-secondary)' }}>
                                                <span>{new Date(event.event_date).toLocaleDateString('ko-KR')}</span>
                                                <span>{EVENT_TYPE_LABEL[event.event_type] || event.event_type}</span>
                                                <span>{event.distance_meters}m</span>
                                            </div>
                                        </div>
                                        {/* Status change button */}
                                        {nextStatus[event.status] && (
                                            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--app-border)', textAlign: 'right' }}>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleStatusChange(event, nextStatus[event.status]); }}
                                                    style={{
                                                        padding: '0.375rem 0.75rem', borderRadius: 8, border: 'none',
                                                        background: event.status === 'scheduled' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                                        color: event.status === 'scheduled' ? '#22C55E' : '#EF4444',
                                                        fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer',
                                                    }}
                                                >
                                                    {nextStatusLabel[event.status]}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            ) : (
                /* Event Detail + Records */
                <div>
                    <button
                        onClick={() => { setSelectedEvent(null); setRecords([]); setShowRecordForm(false); }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--app-accent)', fontWeight: 600, fontSize: '0.875rem',
                            marginBottom: '1rem', padding: 0,
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5" /><polyline points="12,19 5,12 12,5" />
                        </svg>
                        목록으로
                    </button>

                    <div className="app-glass-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--app-text-primary)' }}>
                                {selectedEvent.name}
                            </h3>
                            {nextStatus[selectedEvent.status] && (
                                <button
                                    onClick={() => handleStatusChange(selectedEvent, nextStatus[selectedEvent.status])}
                                    style={{
                                        padding: '0.375rem 0.75rem', borderRadius: 8, border: 'none',
                                        background: selectedEvent.status === 'scheduled' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                        color: selectedEvent.status === 'scheduled' ? '#22C55E' : '#EF4444',
                                        fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer',
                                    }}
                                >
                                    {nextStatusLabel[selectedEvent.status]}
                                </button>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8125rem', color: 'var(--app-text-secondary)' }}>
                            <span>{new Date(selectedEvent.event_date).toLocaleDateString('ko-KR')}</span>
                            <span>{EVENT_TYPE_LABEL[selectedEvent.event_type] || selectedEvent.event_type}</span>
                            <span>{selectedEvent.distance_meters}m</span>
                            <span style={{
                                padding: '0.125rem 0.375rem', borderRadius: 4,
                                background: statusConfig[selectedEvent.status]?.bg,
                                color: statusConfig[selectedEvent.status]?.color,
                                fontSize: '0.6875rem', fontWeight: 700,
                            }}>
                                {statusConfig[selectedEvent.status]?.label}
                            </span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--app-text-primary)' }}>
                            기록 ({records.length}명)
                        </h4>
                        {!showRecordForm && selectedEvent.status !== 'completed' && (
                            <button
                                onClick={() => { setShowRecordForm(true); loadMembers(); }}
                                style={{
                                    padding: '0.375rem 0.75rem', borderRadius: 8, border: 'none',
                                    background: 'var(--app-accent)', color: '#fff',
                                    fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer',
                                }}
                            >
                                + 기록 추가
                            </button>
                        )}
                    </div>

                    {/* Add Record Form */}
                    {showRecordForm && (
                        <div className="app-glass-card" style={{ padding: '1rem', marginBottom: '0.75rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                                <select
                                    value={recordForm.member_id}
                                    onChange={e => setRecordForm({ ...recordForm, member_id: e.target.value })}
                                    style={{ width: '100%', padding: '0.625rem', borderRadius: 8, background: 'var(--app-surface)', border: '1px solid var(--app-border)', color: 'var(--app-text-primary)', fontSize: '0.875rem' }}
                                >
                                    <option value="">회원 선택...</option>
                                    {members.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                    <input
                                        type="number" placeholder="분" min="0" max="59"
                                        value={recordForm.minutes}
                                        onChange={e => setRecordForm({ ...recordForm, minutes: e.target.value })}
                                        style={{ width: '60px', padding: '0.5rem', borderRadius: 8, background: 'var(--app-surface)', border: '1px solid var(--app-border)', color: 'var(--app-text-primary)', fontSize: '0.875rem', textAlign: 'center' }}
                                    />
                                    <span style={{ color: 'var(--app-text-primary)', fontWeight: 700 }}>:</span>
                                    <input
                                        type="number" placeholder="초" min="0" max="59"
                                        value={recordForm.seconds}
                                        onChange={e => setRecordForm({ ...recordForm, seconds: e.target.value })}
                                        style={{ width: '60px', padding: '0.5rem', borderRadius: 8, background: 'var(--app-surface)', border: '1px solid var(--app-border)', color: 'var(--app-text-primary)', fontSize: '0.875rem', textAlign: 'center' }}
                                    />
                                    <span style={{ color: 'var(--app-text-primary)', fontWeight: 700 }}>.</span>
                                    <input
                                        type="number" placeholder="0" min="0" max="9"
                                        value={recordForm.tenths}
                                        onChange={e => setRecordForm({ ...recordForm, tenths: e.target.value })}
                                        style={{ width: '50px', padding: '0.5rem', borderRadius: 8, background: 'var(--app-surface)', border: '1px solid var(--app-border)', color: 'var(--app-text-primary)', fontSize: '0.875rem', textAlign: 'center' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                    <button onClick={() => setShowRecordForm(false)} style={{ padding: '0.5rem 0.75rem', borderRadius: 8, border: 'none', background: 'var(--app-surface)', color: 'var(--app-text-primary)', cursor: 'pointer', fontSize: '0.8125rem' }}>취소</button>
                                    <button onClick={handleAddRecord} disabled={addingRecord} style={{ padding: '0.5rem 0.75rem', borderRadius: 8, border: 'none', background: 'var(--app-accent)', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.8125rem', opacity: addingRecord ? 0.7 : 1 }}>
                                        {addingRecord ? '저장 중...' : '기록 저장'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {records.length === 0 ? (
                        <div className="app-glass-card" style={{ textAlign: 'center', padding: '2rem' }}>
                            <p style={{ color: 'var(--app-text-secondary)', fontSize: '0.875rem' }}>아직 기록이 없습니다</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {records.map((record, index) => (
                                <div key={record.id} className="app-glass-card" style={{ padding: '0.875rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{
                                            width: 32, height: 32, borderRadius: '50%',
                                            background: index < 3 ? 'var(--app-accent-bg)' : 'var(--app-bg)',
                                            color: index < 3 ? 'var(--app-accent)' : 'var(--app-text-muted)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: 800, fontSize: '0.75rem', flexShrink: 0,
                                        }}>
                                            #{index + 1}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--app-text-primary)' }}>
                                                {record.members?.name || 'Unknown'}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--app-text-primary)' }}>
                                                {formatTime(record.result_time)}
                                            </div>
                                            {record.is_pr && (
                                                <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#F59E0B' }}>🏆 PR</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
