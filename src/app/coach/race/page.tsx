'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { query } from '@/lib/supabase/query';

// ─── Types ───────────────────────────────────────
interface RaceEvent {
    id: string;
    name: string;
    event_date: string;
    event_type: string;
    distance_meters: number | null;
    status: string;
    race_format: string | null;
    lobby_status: string | null;
    session_id: string | null;
    created_at: string;
}

interface RaceRecord {
    id: string;
    event_id: string;
    member_id: string;
    result_time: number | null;
    result_distance: number | null;
    is_pr: boolean;
    finish_rank: number | null;
    members?: { name: string };
}

interface PM5Device {
    id: string;
    serial_number: string;
    device_type: string;
    status: string;
    ble_name: string | null;
    current_mode: string | null;
}

interface MemberOption {
    id: string;
    name: string;
}

type HubTab = 'live' | 'history' | 'devices';

// ─── Component ───────────────────────────────────
// P25: Race 허브 — Live(진행/예정) / History(완료 기록) / Devices(PM5 장비) 재통합.
// 세션 운영 보드의 "Race 수업 시작" → fn_prepare_race_session → /coach/race/control 이 표준 진입 경로.
export default function CoachRaceHubPage() {
    const [tab, setTab] = useState<HubTab>('live');
    const [events, setEvents] = useState<RaceEvent[]>([]);
    const [devices, setDevices] = useState<PM5Device[]>([]);
    const [records, setRecords] = useState<RaceRecord[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<RaceEvent | null>(null);
    const [loading, setLoading] = useState(true);

    // Create event
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newEvent, setNewEvent] = useState({ name: '', event_date: '', event_type: '2000m', distance_meters: 2000 });
    const [creating, setCreating] = useState(false);

    // Add record (History 수동 기록)
    const [showRecordForm, setShowRecordForm] = useState(false);
    const [members, setMembers] = useState<MemberOption[]>([]);
    const [recordForm, setRecordForm] = useState({ member_id: '', minutes: '', seconds: '', tenths: '' });
    const [addingRecord, setAddingRecord] = useState(false);

    useEffect(() => {
        loadHubData();
    }, []);

    async function loadHubData() {
        try {
            const [eventsRes, devicesRes] = await Promise.all([
                query('race_events')
                    .select('id, name, event_date, event_type, distance_meters, status, race_format, lobby_status, session_id, created_at')
                    .order('event_date', { ascending: false })
                    .limit(50),
                query('pm5_devices')
                    .select('id, serial_number, device_type, status, ble_name, current_mode')
                    .order('serial_number'),
            ]);
            if (eventsRes.data) setEvents(eventsRes.data as unknown as RaceEvent[]);
            if (devicesRes.data) setDevices(devicesRes.data as unknown as PM5Device[]);
        } catch (error) {
            if (process.env.NODE_ENV === 'development') console.error('Race hub load error:', error);
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
            alert('이벤트명과 날짜를 입력해주세요.');
            return;
        }
        setCreating(true);
        try {
            const { data, error } = await query('race_events').insert({
                name: newEvent.name.trim(),
                event_date: newEvent.event_date,
                event_type: 'rowing',
                distance_meters: newEvent.distance_meters,
                target_distance_m: newEvent.distance_meters,
                status: 'scheduled',
                lobby_status: 'setup',
            }).select().single();

            if (error) throw error;
            if (data) {
                setEvents(prev => [data as unknown as RaceEvent, ...prev]);
                setShowCreateForm(false);
                setNewEvent({ name: '', event_date: '', event_type: '2000m', distance_meters: 2000 });
            }
        } catch (e) {
            if (process.env.NODE_ENV === 'development') console.error(e);
            alert('이벤트 생성에 실패했습니다.');
        }
        setCreating(false);
    }

    async function handleAddRecord() {
        if (!recordForm.member_id || !selectedEvent) {
            alert('회원을 선택해주세요.');
            return;
        }
        const totalSeconds = (parseInt(recordForm.minutes) || 0) * 60
            + (parseInt(recordForm.seconds) || 0)
            + (parseInt(recordForm.tenths) || 0) / 10;

        if (totalSeconds <= 0) {
            alert('기록 시간을 입력해주세요.');
            return;
        }

        setAddingRecord(true);
        try {
            const { data, error } = await query('race_records').insert({
                event_id: selectedEvent.id,
                member_id: recordForm.member_id,
                result_time: totalSeconds,
                result_distance: selectedEvent.distance_meters,
                is_pr: false,
            }).select('*, members!race_records_member_id_fkey(name)').single();

            if (error) throw error;
            if (data) {
                setRecords(prev => [...prev, data as unknown as RaceRecord].sort((a, b) => (a.result_time || 999) - (b.result_time || 999)));
                setRecordForm({ member_id: '', minutes: '', seconds: '', tenths: '' });
                setShowRecordForm(false);
            }
        } catch (e: any) {
            if (process.env.NODE_ENV === 'development') console.error(e);
            if (e.code === '23505') {
                alert('이미 해당 회원의 기록이 있습니다.');
            } else {
                alert('기록 추가에 실패했습니다.');
            }
        }
        setAddingRecord(false);
    }

    function formatTime(seconds: number | null) {
        if (!seconds) return '-';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 10);
        return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
    }

    const liveEvents = events.filter(e => e.status !== 'completed' && e.status !== 'cancelled');
    const historyEvents = events.filter(e => e.status === 'completed');
    const onlineDevices = devices.filter(d => d.status === 'online');

    const lobbyStatusMeta: Record<string, { label: string; color: string }> = {
        setup: { label: '설정 중', color: 'var(--app-text-muted)' },
        lobby: { label: '대기방', color: '#3B82F6' },
        countdown: { label: '카운트다운', color: '#F59E0B' },
        racing: { label: '레이스 중', color: '#22C55E' },
        finished: { label: '종료', color: 'var(--app-text-muted)' },
    };

    const deviceStatusMeta: Record<string, { label: string; color: string; bg: string }> = {
        online: { label: '온라인', color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
        offline: { label: '오프라인', color: 'var(--app-text-muted)', bg: 'var(--app-bg)' },
        maintenance: { label: '점검 중', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
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

    // ─── 이벤트 상세 (기록 보기) ───
    if (selectedEvent) {
        return (
            <div className="app-page">
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
                        {selectedEvent.status !== 'completed' && (
                            <Link href={`/coach/race/control?event_id=${selectedEvent.id}`} style={{
                                padding: '0.375rem 0.75rem', borderRadius: 8, textDecoration: 'none',
                                background: 'var(--app-accent)', color: '#fff',
                                fontWeight: 700, fontSize: '0.75rem',
                            }}>
                                🎛 Control Room
                            </Link>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8125rem', color: 'var(--app-text-secondary)', flexWrap: 'wrap' }}>
                        <span>{new Date(selectedEvent.event_date).toLocaleDateString('ko-KR')}</span>
                        <span>{selectedEvent.distance_meters ? `${selectedEvent.distance_meters}m` : selectedEvent.event_type}</span>
                        {selectedEvent.race_format === 'team' && <span>👥 팀전</span>}
                        {selectedEvent.session_id && <span style={{ color: 'var(--app-accent)', fontWeight: 600 }}>📅 세션 연동</span>}
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--app-text-primary)' }}>
                        기록 ({records.length}명)
                    </h4>
                    {!showRecordForm && (
                        <button
                            onClick={() => { setShowRecordForm(true); loadMembers(); }}
                            style={{
                                padding: '0.375rem 0.75rem', borderRadius: 8, border: 'none',
                                background: 'var(--app-accent)', color: '#fff',
                                fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer',
                            }}
                        >
                            + 수동 기록 추가
                        </button>
                    )}
                </div>

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
                                        #{record.finish_rank || index + 1}
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
        );
    }

    // ─── 허브 (Live / History / Devices) ───
    return (
        <div className="app-page">
            <div style={{ marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--app-text-primary)', letterSpacing: '-0.01em' }}>
                    Race
                </h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--app-text-secondary)', marginTop: 4 }}>
                    수업 연동 레이스는 세션 운영 보드의 &quot;Race 수업 시작&quot;으로 진입하세요
                </p>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.25rem' }}>
                {([
                    { key: 'live', label: `🔴 Live (${liveEvents.length})` },
                    { key: 'history', label: `📚 History (${historyEvents.length})` },
                    { key: 'devices', label: `📟 Devices (${onlineDevices.length}/${devices.length})` },
                ] as Array<{ key: HubTab; label: string }>).map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        style={{
                            flex: 1, padding: '0.625rem 0.5rem', borderRadius: 12,
                            border: '1px solid ' + (tab === t.key ? 'var(--app-accent)' : 'var(--app-border)'),
                            background: tab === t.key ? 'var(--app-accent-bg)' : 'var(--app-surface)',
                            color: tab === t.key ? 'var(--app-accent)' : 'var(--app-text-secondary)',
                            fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer',
                        }}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── Live 탭 ── */}
            {tab === 'live' && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
                        {!showCreateForm && (
                            <button onClick={() => setShowCreateForm(true)} style={{
                                padding: '0.5rem 0.875rem', borderRadius: 'var(--app-radius-md)',
                                background: 'var(--app-accent)', color: '#fff', border: 'none',
                                fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer',
                            }}>
                                + 새 이벤트
                            </button>
                        )}
                    </div>

                    {showCreateForm && (
                        <div className="app-glass-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
                            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--app-text-primary)', marginBottom: '1rem' }}>새 레이스 이벤트 (세션 미연동)</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <input
                                    value={newEvent.name} onChange={e => setNewEvent({ ...newEvent, name: e.target.value })}
                                    placeholder="이벤트명 (예: 2월 로잉 타임어택)"
                                    style={{ width: '100%', padding: '0.625rem', borderRadius: 8, background: 'var(--app-surface)', border: '1px solid var(--app-border)', color: 'var(--app-text-primary)', fontSize: '0.875rem', outline: 'none' }}
                                />
                                <input
                                    type="date" value={newEvent.event_date}
                                    onChange={e => setNewEvent({ ...newEvent, event_date: e.target.value })}
                                    style={{ width: '100%', padding: '0.625rem', borderRadius: 8, background: 'var(--app-surface)', border: '1px solid var(--app-border)', color: 'var(--app-text-primary)', fontSize: '0.875rem', outline: 'none', colorScheme: 'dark' }}
                                />
                                <select
                                    value={String(newEvent.distance_meters)}
                                    onChange={e => {
                                        const dist = parseInt(e.target.value) || 2000;
                                        setNewEvent({ ...newEvent, event_type: e.target.value + 'm', distance_meters: dist });
                                    }}
                                    style={{ width: '100%', padding: '0.625rem', borderRadius: 8, background: 'var(--app-surface)', border: '1px solid var(--app-border)', color: 'var(--app-text-primary)', fontSize: '0.875rem' }}
                                >
                                    <option value="500">500m</option>
                                    <option value="1000">1000m</option>
                                    <option value="2000">2000m</option>
                                    <option value="5000">5000m</option>
                                </select>
                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                    <button onClick={() => setShowCreateForm(false)} style={{ padding: '0.5rem 1rem', borderRadius: 8, border: 'none', background: 'var(--app-surface)', color: 'var(--app-text-primary)', cursor: 'pointer' }}>취소</button>
                                    <button onClick={handleCreateEvent} disabled={creating} style={{ padding: '0.5rem 1rem', borderRadius: 8, border: 'none', background: 'var(--app-accent)', color: '#fff', fontWeight: 600, cursor: 'pointer', opacity: creating ? 0.7 : 1 }}>
                                        {creating ? '생성 중...' : '생성'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {liveEvents.length === 0 && !showCreateForm ? (
                        <div className="app-glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.25 }}>🏁</div>
                            <p style={{ color: 'var(--app-text-secondary)', fontSize: '0.875rem' }}>
                                진행 중이거나 예정된 레이스가 없습니다
                            </p>
                            <p style={{ color: 'var(--app-text-muted)', fontSize: '0.75rem', marginTop: 6 }}>
                                수업 연동 레이스는 Schedule → 세션 보드에서 시작할 수 있습니다
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {liveEvents.map(event => {
                                const lobby = lobbyStatusMeta[event.lobby_status || 'setup'] || lobbyStatusMeta.setup;
                                const isRacing = event.lobby_status === 'racing' || event.lobby_status === 'countdown';
                                return (
                                    <div key={event.id} className="app-glass-card" style={{
                                        padding: '1.25rem',
                                        border: isRacing ? '1px solid rgba(34,197,94,0.4)' : undefined,
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--app-text-primary)' }}>
                                                {event.name}
                                            </h4>
                                            <span style={{
                                                padding: '0.25rem 0.5rem', borderRadius: 'var(--app-radius-sm)',
                                                background: isRacing ? 'rgba(34,197,94,0.1)' : 'var(--app-bg)',
                                                color: lobby.color,
                                                fontSize: '0.6875rem', fontWeight: 700,
                                            }}>
                                                {lobby.label}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8125rem', color: 'var(--app-text-secondary)', flexWrap: 'wrap' }}>
                                            <span>{new Date(event.event_date).toLocaleDateString('ko-KR')}</span>
                                            {event.distance_meters && <span>{event.distance_meters}m</span>}
                                            {event.race_format === 'team' && <span>👥 팀전</span>}
                                            {event.session_id && (
                                                <span style={{ color: 'var(--app-accent)', fontWeight: 600 }}>📅 세션 연동</span>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.875rem', paddingTop: '0.875rem', borderTop: '1px solid var(--app-border)' }}>
                                            <Link href={`/coach/race/control?event_id=${event.id}`} style={{
                                                flex: 1, textAlign: 'center', textDecoration: 'none',
                                                padding: '0.5rem', borderRadius: 8,
                                                background: 'var(--app-accent)', color: '#fff',
                                                fontWeight: 700, fontSize: '0.8125rem',
                                            }}>
                                                🎛 Control Room
                                            </Link>
                                            <button onClick={() => handleSelectEvent(event)} style={{
                                                flex: 1, padding: '0.5rem', borderRadius: 8,
                                                border: '1px solid var(--app-border)', background: 'transparent',
                                                color: 'var(--app-text-secondary)', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer',
                                            }}>
                                                기록 보기
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* ── History 탭 ── */}
            {tab === 'history' && (
                historyEvents.length === 0 ? (
                    <div className="app-glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.25 }}>📚</div>
                        <p style={{ color: 'var(--app-text-secondary)', fontSize: '0.875rem' }}>완료된 레이스가 없습니다</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {historyEvents.map(event => (
                            <div key={event.id} className="app-glass-card" style={{ padding: '1.25rem', cursor: 'pointer' }}
                                onClick={() => handleSelectEvent(event)}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--app-text-primary)', marginBottom: 4 }}>
                                            {event.name}
                                        </h4>
                                        <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8125rem', color: 'var(--app-text-secondary)', flexWrap: 'wrap' }}>
                                            <span>{new Date(event.event_date).toLocaleDateString('ko-KR')}</span>
                                            {event.distance_meters && <span>{event.distance_meters}m</span>}
                                            {event.session_id && <span style={{ color: 'var(--app-accent)', fontWeight: 600 }}>📅 세션 연동</span>}
                                        </div>
                                    </div>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--app-text-muted)" strokeWidth="2">
                                        <path d="M9 18l6-6-6-6" />
                                    </svg>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* ── Devices 탭 ── */}
            {tab === 'devices' && (
                devices.length === 0 ? (
                    <div className="app-glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.25 }}>📟</div>
                        <p style={{ color: 'var(--app-text-secondary)', fontSize: '0.875rem' }}>등록된 PM5 장비가 없습니다</p>
                        <p style={{ color: 'var(--app-text-muted)', fontSize: '0.75rem', marginTop: 6 }}>장비 등록은 Admin → Operations에서 가능합니다</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {devices.map(device => {
                            const st = deviceStatusMeta[device.status] || deviceStatusMeta.offline;
                            return (
                                <div key={device.id} className="app-glass-card" style={{ padding: '0.875rem 1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--app-text-primary)' }}>
                                                {device.serial_number}
                                            </div>
                                            <div style={{ fontSize: '0.6875rem', color: 'var(--app-text-muted)', marginTop: 2 }}>
                                                {device.device_type}{device.ble_name ? ` · ${device.ble_name}` : ''}{device.current_mode ? ` · ${device.current_mode}` : ''}
                                            </div>
                                        </div>
                                        <span style={{
                                            padding: '0.25rem 0.5rem', borderRadius: 'var(--app-radius-sm)',
                                            background: st.bg, color: st.color,
                                            fontSize: '0.6875rem', fontWeight: 700,
                                        }}>
                                            {st.label}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            )}
        </div>
    );
}
